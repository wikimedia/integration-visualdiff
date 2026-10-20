"use strict";

const fs = require('fs');
const path = require('path');
const Util = require('../../lib/differ.utils.js').Util;
const domino = require('domino');
const crypto = require('crypto');

function asciiFileName(outdir, file) {
	return outdir +
		crypto.createHash('md5').update(file.replace(outdir, '')).digest('hex') +
		'.html';
}

function generateLocalHTMLFiles(opts) {
	// console.log("pre - generating!");

	const html1FileName = asciiFileName(opts.outdir, opts.html1.screenShot);
	const html2FileName = asciiFileName(opts.outdir, opts.html2.screenShot);
	let canonicalUrl;

	// Fetch the Tidy version from api
	return Util.retryingHTTPRequest(2, {
		uri: opts.html1.url,
		method: 'GET',
		headers: opts.html1.headers || {}
	}).spread(function(_, body) {
		const dom = domino.createDocument(body);
		const base = dom.createElement('base');
		base.setAttribute('href', opts.html1.url);
		dom.head.insertBefore(base, dom.head.firstChild);
		// Save the Tidy HTML to disk
		fs.writeFileSync(html1FileName, dom.outerHTML);
		opts.html1.url = "file://" + path.resolve('.', html1FileName);
	}).then(function() {
		return Util.retryingHTTPRequest(2, {
			uri: opts.html2.url,
			method: 'GET',
			headers: opts.html2.headers || {}
		});
	}).spread(function(_, body) {
		const dom = domino.createDocument(body);
		const base = dom.createElement('base');
		base.setAttribute('href', opts.html2.url);
		dom.head.insertBefore(base, dom.head.firstChild);
		// Save the Tidy HTML to disk
		fs.writeFileSync(html2FileName, dom.outerHTML);
		opts.html2.url = "file://" + path.resolve('.', html2FileName);
	});
}

function deleteLocalHTMLFiles(opts) {
	// console.log("post - unlinking!");
	fs.unlinkSync(opts.html1.url.replace(/file:\/\//, ''));
	fs.unlinkSync(opts.html2.url.replace(/file:\/\//, ''));
}

module.exports = {
	pre: generateLocalHTMLFiles,
	post: deleteLocalHTMLFiles,
};
