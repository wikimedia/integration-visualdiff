"use strict";

var fs = require('fs');
var Util = require('../lib/differ.utils.js').Util;
var domino = require('domino');
var crypto = require('crypto');

function asciiFileName(outdir, file) {
	return outdir +
		crypto.createHash('md5').update(file.replace(outdir, '')).digest('hex') +
		'.html';
}

function generateLocalHTMLFiles(opts) {
	// console.log("pre - generating!");

	var canonicalUrl;
	var baseUrl = opts.html1.url;
	var html1FileName = asciiFileName(opts.outdir, opts.html1.screenShot);
	var html2FileName = asciiFileName(opts.outdir, opts.html2.screenShot);

	// Fetch the Tidy version from api
	return Util.retryingHTTPRequest(2, { uri: baseUrl, method: 'GET' })
	.spread(function(_, body) {
		// Follow redirects by replacing the original base url
		// with the canonical url in the page header.
		// Ex: <link rel="canonical" href="https://www.mediawiki.org/wiki/Parsoid"/>
		canonicalUrl = body.replace(/^[\s\S]*<link\s*rel="canonical"\s*href="([^"]*)"\s*\/>[\s\S]*$/, '$1');
		// Add base href
		body = body.replace(/<head>/, '<head>\n<base href=' + canonicalUrl + '>\n');
		// Save the Tidy HTML to disk
		fs.writeFileSync(html1FileName, body);
	}).then(function() {
		// Fetch the tdy and remex versions from the api
		var pmApiUrl = baseUrl.replace(/\/wiki\/.*/, '/w/api.php?action=parser-migration&format=json&config=old|new&title=' + canonicalUrl.replace(/^.*?\/wiki\//, ''));
		return Util.retryingHTTPRequest(2, { uri: pmApiUrl, method: 'GET' });
	}).spread(function (_, body) {
		var spliceAndSave = function(version, html, fileName) {
			// Use the originally downloaded Tidy page as the scaffold.
			// Replace content with the passed in html.
			var dom = domino.createDocument(fs.readFileSync(html1FileName));
			var poDiv = dom.getElementsByClassName('mw-parser-output')[0];
			poDiv.innerHTML = html.replace(/^<div class='mw-parser-output'>/, '').replace(/<\/div>$/, '');
			fs.writeFileSync(fileName, dom.outerHTML);

			// Overwrite the Phantom url to load from disk
			opts[version].url = fileName;
		};

		// Doing this both for Tidy and Remex ensures that the only
		// rendering diffs will be from Tidy and Remex fixups and not
		// any subtle variations because of timing issues
		// Ex: use of  time-dependent parser functions (ran into it on svwiki),
		//     or race conditions like edits to pages and templates in between api fetches
		//     (happens more than once)
		var parsedBody = JSON.parse(body);
		spliceAndSave("html2", parsedBody.new, html2FileName);
		spliceAndSave("html1", parsedBody.old, html1FileName);
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
