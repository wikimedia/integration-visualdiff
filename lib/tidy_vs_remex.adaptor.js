"use strict";

var fs = require('fs');
var Util = require('../lib/differ.utils.js').Util;
var Promise = require('prfun/wrap')(require('babybird'));
var request = Promise.promisify(require('request'), true);
var domino = require('domino');
var crypto = require('crypto');

function retryingHTTPRequest(retries, requestOptions, delay) {
    delay = delay || 100;  // start with 100ms
    return request(requestOptions)
    .catch(function(error) {
        if (retries--) {
            console.error('HTTP ' + requestOptions.method + ' to \n' +
                    (requestOptions.uri || requestOptions.url) + ' failed: ' + error +
                    '\nRetrying in ' + (delay / 1000) + ' seconds.');
            return Promise.delay(delay).then(function() {
                return retryingHTTPRequest(retries, requestOptions, delay * 2);
            });
        } else {
            return Promise.reject(error);
        }
    })
    .spread(function(res, body) {
        if (res.statusCode !== 200) {
            throw new Error('Got status code: ' + res.statusCode +
                '; body: ' + body);
        }
        return Array.from(arguments);
    });
}

function asciiFileName(outdir, file) {
	return outdir +
		crypto.createHash('md5').update(file.replace(outdir, '')).digest('hex') +
		'.html';
}

function generateLocalHTMLFiles(opts) {
	// console.log("pre - generating!");

	var html1FileName, html2FileName
	var baseUrl = opts.html1.url;

	// Fetch the Tidy version from api
	return retryingHTTPRequest(2, { uri: baseUrl, method: 'GET' })
	.spread(function(_, body) {
		html1FileName = asciiFileName(opts.outdir, opts.html1.screenShot);
		// Add base href
		body = body.replace(/<head>/, '<head>\n<base href=' + baseUrl + '>\n');
		// Save the Tidy HTML to disk
		fs.writeFileSync(html1FileName, body);
	}).then(function() {
		// Fetch the remex version from the api
		var pmApiUrl = baseUrl.replace(/\/wiki\//, '/w/api.php?action=parser-migration&format=json&config=new&title=');
		return retryingHTTPRequest(2, { uri: pmApiUrl, method: 'GET' });
	}).spread(function (_, body) {
		// Splice remexHTML in place of the tidy HTML
		var remexHTML = JSON.parse(body).new;
		var dom = domino.createDocument(fs.readFileSync(html1FileName));
		var poDiv = dom.getElementsByClassName('mw-parser-output')[0];
		poDiv.innerHTML = remexHTML.replace(/^<div class='mw-parser-output'>/, '').replace(/<\/div>$/, '');

		// Save the HTML to disk
		html2FileName = asciiFileName(opts.outdir, opts.html2.screenShot);
		fs.writeFileSync(html2FileName, dom.outerHTML);

		// Overwrite the Phantom urls to load from disk
		opts.html1.url = html1FileName;
		opts.html2.url = html2FileName;
	});
}

function deleteLocalHTMLFiles(opts) {
	// console.log("post - unlinking!");
	fs.unlinkSync(opts.html1.url);
	fs.unlinkSync(opts.html2.url);
}

module.exports = {
	pre: generateLocalHTMLFiles,
	post: deleteLocalHTMLFiles,
}
