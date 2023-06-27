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
		var next = n.nextSibling;
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

// __DTHASLEDECONTENT__, __DTEMPTYTALKPAGE__, etc.
function hasOnlyDTComments(n) {
	let c = n.firstChild;
	while (c) {
		if (c.nodeType !== 8 || !/^__DT.*__$/.test(c.nodeValue)) {
			return false;
		}
		c = c.nextSibling;
	}
	return true;
}

function generateLocalHTMLFiles(opts) {
	// console.log("pre - generating!");

	return Util.retryingHTTPRequest(2, { uri: opts.html1.url, method: 'GET' })
	.spread(function(_, res) {
		const dom = domino.createDocument(res);
		const base = dom.createElement('base');
		base.setAttribute('href', opts.html1.url);
		dom.head.insertBefore(base, dom.head.firstChild);

		// Disable discussion tools (since Parsoid won't have them enabled)
		dom.body.classList.remove('ext-discussiontools-replytool-enabled');

		// May not be necessary anymore, but removing this can
		// speed up diffing and eliminate some spurious noise.
		// Remove all chrome, only keep the actual content.
		dom.body.innerHTML = dom.body.querySelectorAll('div.mw-body-content')[0].outerHTML;

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

			// May not be necessary anymore, but removing this can
			// speed up diffing and eliminate some spurious noise.
			// Remove all chrome, only keep the actual content.
			dom.body.innerHTML = dom.body.querySelectorAll('div.mw-body-content')[0].outerHTML;

			// Some CSS selectors (used in JS/CSS) don't always apply when <section> tags intervene.
			// TO BE DETERMINED: Do we want <section> wrappers only in canonical Parsoid HTML
			// or also in Parsoid's read view output? If we want them in read view output, then
			// some JS/CSS fixes might be needed (ex: arwiki's Mediawiki:Common.js manipulates the
			// DOM to move navboxes and other stuff around and <section> tags prevent the query
			// selectors from applying).
			stripSectionTags(dom.body);

			// Strip entity,etc. spans since they seem to render spurious invisible diffs
			Array.from(dom.querySelectorAll('span[typeof=mw:Entity],span[typeof=mw:DisplaySpace],span[typeof=mw:Nowiki],span[typeof=mw:Placeholder]')).map(function(node) {
				if (node.firstChild) {
					node.parentNode.insertBefore(node.firstChild, node.nextSibling);
				}
				node.parentNode.removeChild(node);
				return null;
			});

			// Strip about-id-continuity spans added to template & extension content for the same reason as above
			Array.from(dom.querySelectorAll('span[about]')).map(function(span) {
				const fc = span.firstChild;
				if (!fc) {
					// Dummy wrapper -- remove
					span.parentNode.removeChild(span);
				} else if (fc === span.lastChild && fc.nodeType === 3 && !span.hasAttribute('lang') && !span.hasAttribute('class') && !span.hasAttribute('style')) {
					// Only 1 text child ==> span wrapped text node for template continuity
					span.parentNode.insertBefore(fc, span.nextSibling);
					span.parentNode.removeChild(span);
				}
				return null;
			});

			// Work around a difference in Parsoid's gallery implementation
			// Add p-wrapping around image captions
			Array.from(dom.querySelectorAll('div.gallerytext')).map(function(node) {
				let c = node.firstChild;
				if (c) {
					const p = dom.createElement('p');
					while (c) {
						p.appendChild(c);
						c = node.firstChild;
					}
					node.appendChild(p);
				}
				return node;
			});

			// Transform <p>(style|link|span-with-multiple-discussion-tools-marker-comment|></p>
			// by stripping the paragraph wrapper that adds unnecessary whitespace in Parsoid output.
			Array.from(dom.querySelectorAll('p')).map(function(p) {
				let empty = true;
				let c = p.firstChild;
				while (c) {
					if (c.nodeName !== 'LINK' &&
						c.nodeName !== 'STYLE' &&
						// Ignore anything that is not a span with DT-only comments
						(c.nodeName !== 'SPAN' || !hasOnlyDTComments(c))
					) {
						empty = false;
						break;
					}
					c = c.nextSibling;
				}
				if (empty) {
					migrateChildren(p, p.parentNode, p.nextSibling);
					p.parentNode.removeChild(p);
				}
				return p;
			});

			// Work around Parsoid's lack of handling of self-links
			const canonicalTitle = dom.head.querySelectorAll('link[rel=canonical]')[0].getAttribute('href').replace(/.*\/wiki\//, '').replace(/_/g, ' ');
			const links = Array.from(dom.querySelectorAll('a[rel=mw:WikiLink]'));
			links.map(function(link) {
				if (link.getAttribute('href').replace(/^\.\//, '').replace(/_/g, ' ') === canonicalTitle) {
					link.removeAttribute('rel');
					link.removeAttribute('href');
					link.removeAttribute('title');
					link.setAttribute('class', 'mw-selflink selflink');
				}
				return link;
			});

			// Two temporary workarounds till these fixes merge / ride the train
			const mwContentDiv = dom.body.querySelector('div#mw-content-text');
			const fc = mwContentDiv.firstChild;
			if (!fc || fc.nodeName !== 'div' || fc.getAttribute('class') !== 'mw-parser-output') {
				const parserOutputDiv = dom.createElement('div');
				parserOutputDiv.setAttribute('class', 'mw-parser-output');
				migrateChildren(mwContentDiv, parserOutputDiv);
				mwContentDiv.appendChild(parserOutputDiv);
			}

			let html = dom.outerHTML;
			html = html.replace(/(w\/load.php\?lang=\w+&amp;modules=)/, "$1mediawiki.skinning.content.parsoid|");

			// Save the Parsoid HTML to disk
			const parsoidFileName = asciiFileName(opts.outdir, opts.html2.screenShot);
			fs.writeFileSync(parsoidFileName, html);
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
