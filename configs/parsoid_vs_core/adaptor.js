"use strict";

const fs = require('fs');
const path = require('path');
const Util = require('../../lib/differ.utils.js').Util;
const domino = require('domino');
const crypto = require('crypto');
const semver = require('semver');

function asciiFileName(outdir, file) {
	return outdir +
		crypto.createHash('md5').update(file.replace(outdir, '')).digest('hex') +
		'.html';
}

function migrateChildren(from, to, beforeNode) {
	if (beforeNode === undefined) {
		beforeNode = null;
	}
	while (from.firstChild) {
		to.insertBefore(from.firstChild, beforeNode);
	}
}

function stripSectionTags(node) {
	let n = node.firstChild;
	while (n) {
		const next = n.nextSibling;
		if (n.nodeType === 1) {
			// Recurse into subtree before stripping this
			stripSectionTags(n);

			// Strip <section> tags
			if (n.nodeName === 'SECTION' && n.hasAttribute('data-mw-section-id')) {
				migrateChildren(n, n.parentNode, n);
				n.parentNode.removeChild(n);
			}
		}
		n = next;
	}
}

function noAttributes(node) {
	return Array.from(node.attributes).filter((attr) => attr.name !== 'id').length === 0;
}

function isPBRP(node) {
	if (node.nodeName !== 'P') {
		return false;
	}

	let haveBR = false;
	let n = node.firstChild;
	while (n) {
		if (n.nodeName === 'BR') {
			if (!noAttributes(n)) {
				return false;
			}
			haveBR = true;
		} else if (n.nodeName === '#text' && !n.nodeValue.match(/^[ \n]+$/)) {
			return false;
		} else if (n.nodeName !== '#text' && n.nodeName !== 'STYLE' && n.nodeName !== 'LINK') {
			return false;
		}
		n = n.nextSibling;
	}

	return haveBR;
}

function stripPBRPfragments(node) {
	let n = node.firstChild;
	while (n) {
		const next = n.nextSibling;
		if (isPBRP(n)) {
			node.removeChild(n);
		} else if (n.nodeType === 1) {
			stripPBRPfragments(n);
		}
		n = next;
	}
}

function stripBRFromFirstAndLastP(content) { // Slightly misnamed but gets the job done
	// process first P tag, if it exists in the right place
	let n = content.firstChild;
	if (n && n.nodeName === 'P' && n.firstChild && n.firstChild.nodeName === 'BR') {
		n.removeChild(n.firstChild); // remove the <br>
	}
	// Get last P tag, if it exists in the right place and process it
	n = content.lastChild;
	while (n && n.nodeName !== 'P') {
		/* skip past comments & "empty" text nodes */
		if (n.nodeType !== 8 && (n.nodeName !== '#text' || !n.nodeValue.match(/^\s*$/))) {
			// cannot proceed
			return;
		}
		n = n.previousSibling;
	}
	if (n && n.firstChild && n.firstChild.nodeName === 'BR') {
		n.removeChild(n.firstChild); // remove the <br>
	}
}

function generateLocalHTMLFiles(opts) {
	// console.log("pre - generating!");

	return Util.retryingHTTPRequest(2, { uri: opts.html1.url, method: 'GET' })
	.spread(function(_, res) {
		const dom = domino.createDocument(res);
		const base = dom.createElement('base');
		base.setAttribute('href', opts.html1.url);
		dom.head.insertBefore(base, dom.head.firstChild);

		// Remove p-br-p from the content-div
		// since it causes rendering diff noise!
		stripPBRPfragments(dom.getElementById('mw-content-text').firstChild);
		// Remove <br> from first and last <p> in the content div
		// since it causes rendering diff noise!
		stripBRFromFirstAndLastP(dom.getElementById('mw-content-text').firstChild);

		// Save the core HTML to disk
		const coreFileName = asciiFileName(opts.outdir, opts.html1.screenShot);

		// Overwrite the url to load from disk
		fs.writeFileSync(coreFileName, dom.outerHTML);
		opts.html1.url = "file://" + path.resolve('.', coreFileName);
		// console.log('stored to ' + coreFileName);
	}).then(function() {
		return Util.retryingHTTPRequest(2, { uri: opts.html2.url, method: 'GET' })
		.spread(function(_, res) {
			const addScriptTag = function(doc, opts2) {
				const script = doc.createElement('script');
				script.setAttribute('type', 'text/javascript');
				script.setAttribute('async', '');
				if (opts2.content) {
					script.appendChild(doc.createTextNode(opts2.content));
				} else if (opts2.url) {
					script.setAttribute('src', opts2.url);
				} else if (opts2.path) {
					script.setAttribute('src', "file://" + path.resolve('.', opts2.path));
				}
				doc.head.appendChild(script);
			};

			const dom = domino.createDocument(res);

			// Inject jquery first
			// Add some default skin scripts
			// Add additional ones specified in <head>
			addScriptTag(dom, { path: __dirname + '/jquery.js' });

			const base = dom.createElement('base');
			base.setAttribute('href', opts.html2.url);
			dom.head.insertBefore(base, dom.head.firstChild);

			// Some CSS selectors (used in JS/CSS) don't always apply when <section> tags intervene.
			// TO BE DETERMINED: Do we want <section> wrappers only in canonical Parsoid HTML
			// or also in Parsoid's read view output? If we want them in read view output, then
			// some JS/CSS fixes might be needed (ex: arwiki's Mediawiki:Common.js manipulates the
			// DOM to move navboxes and other stuff around and <section> tags prevent the query
			// selectors from applying).
			stripSectionTags(dom.body);

			// Remove p-br-p from the content-div
			// since it causes rendering diff noise!
			stripPBRPfragments(dom.getElementById('mw-content-text').firstChild);

			// Strip entity,etc. spans since they seem to render spurious invisible diffs
			Array.from(dom.querySelectorAll('span[typeof=mw:Entity],span[typeof=mw:DisplaySpace]')).map(function(node) {
				if (node.firstChild) {
					node.parentNode.insertBefore(node.firstChild, node.nextSibling);
				}
				node.parentNode.removeChild(node);
				return null;
			});

			// Save the Parsoid HTML to disk
			const parsoidFileName = asciiFileName(opts.outdir, opts.html2.screenShot);
			fs.writeFileSync(parsoidFileName, dom.outerHTML);
			// Overwrite the url to load from disk
			opts.html2.url = "file://" + path.resolve('.', parsoidFileName);
			// console.log('stored to ' + parsoidFileName);
		});
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
