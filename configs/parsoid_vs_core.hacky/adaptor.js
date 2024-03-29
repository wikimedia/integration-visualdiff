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

		// CSS rules with namespace-specific classes won't trigger on Parsoid
		// because Parsoid won't have this structure till the output is
		// integrated with the rendering pipeline. So, for now, to minimize
		// noisy diffs, get rid of the ns-talk and ns-subject classes from the
		// legacy parser output
		dom.body.classList.remove('ns-talk');
		dom.body.classList.remove('ns-subject');

		// Disable discussion tools (since Parsoid won't have them enabled)
		dom.body.classList.remove('ext-discussiontools-replytool-enabled');

		// Remove all chrome, only keep the actual content.
		dom.body.innerHTML = dom.body.querySelectorAll('div.mw-body-content')[0].outerHTML;

		// Save the core HTML to disk
		const coreFileName = asciiFileName(opts.outdir, opts.html1.screenShot);
		// Suppress all gadgets from the core output for now
		// since Parsoid output doesn't have these gadgets right now
		fs.writeFileSync(coreFileName,
			dom.outerHTML
			.replace(/"ext.gadget.[^"]*",/g, "")
			.replace(/"ext.gadget.[^"]*"\]/g, "]")
			.replace(/ext.gadget./g, ""));
		// Overwrite the url to load from disk
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

			const addStyleSheet = function(doc, url) {
				const newStyleSheet = doc.createElement('link');
				newStyleSheet.setAttribute('rel', 'stylesheet');
				newStyleSheet.setAttribute('href', url);
				doc.head.appendChild(newStyleSheet);
			};

			const dom = domino.createDocument(res);
			const base = dom.getElementsByTagName('base').item(0);

			// Update base href
			base.setAttribute('href', base.getAttribute('href').replace(/^[^/]*\//, 'https:/'));

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
			const canonicalTitle = dom.head.querySelectorAll('title')[0].text.replace(/_/g, '');
			Array.from(dom.querySelectorAll('a[rel=mw:WikiLink]')).map(function(link) {
				if (link.getAttribute('href').replace(/^\.\//, '').replace(/_/g, ' ') === canonicalTitle) {
					link.removeAttribute('rel');
					link.removeAttribute('href');
					link.removeAttribute('title');
					link.setAttribute('class', 'mw-selflink selflink');
				}
				return link;
			});

			const lang = opts.wiki.replace(/wik[it].*$/, '');

			let metas;

			// Get rid of stylesheet link that Parsoid added
			const oldStyles = dom.head.querySelectorAll('link[rel=stylesheet]');
			// Add some default skin stylesheets
			let styleModules = '';
			// Get rid of Parsoid-added sheets
			oldStyles.forEach((stag) => stag.parentNode.removeChild(stag));

			// Collect modules that Parsoid has provided in <head>
			// We changed mw:styleModules to mw:moduleStyles in a Parsoid commit
			// without realizing it and deployed it. So, we'll need to look for
			// both tags for a while.
			metas = dom.head.querySelectorAll('meta[property=mw:styleModules],meta[property=mw:moduleStyles]');
			if (metas.length > 0) {
				styleModules = metas[0].getAttribute('content') + '|';
			}
			styleModules += "mediawiki.skinning.content.parsoid|jquery.makeCollapsible.styles|jquery.tablesorter.styles|skins.vector.styles.legacy|mediawiki.ui.button,checkbox,icon,input";
			addStyleSheet(dom, '/w/load.php?modules=' + styleModules + '&only=styles&skin=vector&useskinversion=1&lang=' + lang);
			addStyleSheet(dom, '/w/load.php?modules=site.styles&only=styles&skin=vector&lang=' + lang);

			// Inject jquery first
			// Add some default skin scripts
			// Add additional ones specified in <head>
			addScriptTag(dom, { path: __dirname + '/jquery.js' });
			let scripts = ["site", "jquery.tablesorter", "jquery.makeCollapsible", "skins.vector.legacy.js", "mediawiki.page.ready"];
			metas = dom.head.querySelectorAll('meta[property=mw:generalModules]');
			if (metas.length > 0) {
				scripts = scripts.concat(metas[0].getAttribute('content').split('|'));
			}

			// Set RLCONFIG based on what we know so far about it.
			// When Parsoid is integrated into the rendering pipeline, all these config
			// properties will be set by the resourceloader (which would be invoked by the
			// skin or some other appropriate component in the rendering pipeline).
			metas = dom.head.querySelectorAll('meta[property=mw:jsConfigVars]');
			let config = metas.length > 0 ? metas[0].getAttribute('content') : '{}';

			// arwiki's "site" js module relies on this info
			metas = dom.head.querySelectorAll('meta[property=mw:pageNamespace]');
			if (metas.length > 0) {
				config = JSON.parse(config);
				config.wgNamespaceNumber = Number(metas[0].getAttribute('content'));
				config.wgAction = 'view';
				config = JSON.stringify(config);
			}

			// Get jsconfig vars
			addScriptTag(dom, { content: 'document.documentElement.className="client-js";RLCONF=' + config + ';RLSTATE={"site.sites":"ready","skins.vector.styles.legacy":"ready","mediawiki.page.gallery.styles":"ready"};RLPAGEMODULES=' + JSON.stringify(scripts) + ';' });
			addScriptTag(dom, { content: '(RLQ=window.RLQ||[]).push(function(){mw.loader.implement("user.options",function($,jQuery,require,module){});});' });
			addScriptTag(dom, { url: '/w/load.php?&modules=startup&only=scripts&raw=1&skin=vector&lang=' + lang });

			// There is CSS out there that use the .some-body-class .mw-parser-output .some-other-class
			// type selectors. Right now, Parsoid adds .mw-parser-output to <body> tag which means these
			// CSS styles aren't being applied to Parsoid's output. Fix that by adding a .mw-parser-output
			// <div> wrapper as a child of <body>.
			const div = dom.createElement('div');
			while (dom.body.firstChild) {
				div.appendChild(dom.body.firstChild);
			}
			dom.body.appendChild(div);
			div.classList.add('mw-parser-output');
			dom.body.classList.remove('mw-parser-output');
			dom.body.setAttribute('id', 'mw-content-text');
			// Core parser adds this for the vector skin
			dom.body.classList.add('skin-vector');
			dom.body.classList.add('skin-vector-legacy');
			dom.body.classList.add('mw-editable');
			// Remove parsoid-body since mw-body isn't present on the PHP parser output.
			dom.body.classList.remove('parsoid-body');

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
