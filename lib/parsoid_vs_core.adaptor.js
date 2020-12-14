"use strict";

const fs = require('fs');
const path = require('path');
const Util = require('../lib/differ.utils.js').Util;
const Promise = require('prfun/wrap')(require('babybird'));
const request = Promise.promisify(require('request'), true);
const domino = require('domino');
const crypto = require('crypto');

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

	const parsoidUrl = opts.html2.url;
	const parsoidFileName = asciiFileName(opts.outdir, opts.html2.screenShot);

	return retryingHTTPRequest(2, { uri: parsoidUrl, method: 'GET' })
	.spread(function(_, body) {
		const addScriptTag = function(doc, opts) {
			const script = doc.createElement('script');
			script.setAttribute('type', 'text/javascript');
			script.setAttribute('async', '');
			if (opts.content) {
				script.appendChild(doc.createTextNode(opts.content));
			} else if (opts.url) {
				script.setAttribute('url', opts.url);
			} else if (opts.path) {
				script.setAttribute('url', "file://" + path.resolve('.', opts.path));
			}
			doc.head.appendChild(script);
		};

		const addStyleSheet = function(doc, url) {
			const newStyleSheet = doc.createElement('link');
			newStyleSheet.setAttribute('rel', 'stylesheet');
			newStyleSheet.setAttribute('href', url);
			const styles = Array.from(doc.querySelectorAll('link[rel=stylesheet]'));
			const last = styles[styles.length-1];
			last.parentNode.insertBefore(newStyleSheet, last.nextSibling);
		}

		const dom = domino.createDocument(body);

		// Update base href
		const base = dom.getElementsByTagName('base').item(0);
		base.setAttribute('href', base.getAttribute('href').replace(/^[^/]*\//, 'https:/'));

		const lang = opts.wiki.replace(/wik[it].*$/, '');

		// Add stylesheets
		addStyleSheet(dom, '/w/load.php?modules=skins.vector.styles.legacy&7Cjquery.makeCollapsible.styles&7Cjquery.tablesorter.styles&only=styles&skin=vector&useskinversion=1&lang=' + lang);
		addStyleSheet(dom, '/w/load.php?modules=site.styles&only=styles&skin=vector&lang=' + lang);

		// Parsoid is missing JS modules -- hack in some defaults
		addScriptTag(dom, { content: 'document.documentElement.className="client-js";RLCONF={};RLSTATE={};RLPAGEMODULES=["site","jquery.tablesorter","jquery.makeCollapsible","skins.vector.legacy.js","mediawiki.page.gallery","mediawiki.page.ready","ext.kartographer.link","ext.kartographer.frame"];' });
		addScriptTag(dom, { content: '(RLQ=window.RLQ||[]).push(function(){mw.loader.implement("",function($,jQuery,require,module){});});' });
		addScriptTag(dom, { url: '/w/load.php?lang=' + lang + '&modules=startup&only=scripts&raw=1&skin=vector' });

		// Save the Parsoid HTML to disk
		fs.writeFileSync(parsoidFileName, dom.outerHTML);
		// Overwrite the url to load from disk
		opts.html2.url = "file://" + path.resolve('.', parsoidFileName);
		// console.log('stored to ' + parsoidFileName);
	});
}

function deleteLocalHTMLFiles(opts) {
	// console.log("post - unlinking!");
	fs.unlinkSync(opts.html2.url.replace(/file:\/\//, ''));
}

module.exports = {
	pre: generateLocalHTMLFiles,
	post: deleteLocalHTMLFiles,
}
