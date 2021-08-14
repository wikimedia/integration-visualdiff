"use strict";

const fs = require('fs');
const path = require('path');
const Util = require('../lib/differ.utils.js').Util;
const domino = require('domino');
const crypto = require('crypto');
const semver = require('semver');

function asciiFileName(outdir, file) {
	return outdir +
		crypto.createHash('md5').update(file.replace(outdir, '')).digest('hex') +
		'.html';
}

function generateLocalHTMLFiles(opts) {
	// console.log("pre - generating!");

	return Util.retryingHTTPRequest(2, { uri: opts.html1.url, method: 'GET' })
	.spread(function(_, res) {
		const dom = domino.createDocument(res);
		const base = dom.createElement('base');
		base.setAttribute('href', opts.html1.url);
		dom.head.insertBefore(base, dom.head.firstChild);

		// CSS rules with .ns-talk .mw-body-content don't trigger on Parsoid
		// because Parsoid won't have this structure till the output is
		// integrated with the rednering pipeline. So, for now, to minimize
		// diffs, get rid of the ns-talk class from the legacy parser output.
		if (/^Talk:/.test(opts.title)) {
			dom.body.classList.remove('ns-talk');
		}

		// Save the core HTML to disk
		const coreFileName = asciiFileName(opts.outdir, opts.html1.screenShot);
		// Suppress all gadgets from the core output for now
		// since Parsoid output doesn't have these gadgets right now
		fs.writeFileSync(coreFileName,
			dom.outerHTML.
			replace(/"ext.gadget.[^\"]*",/g, "").
			replace(/"ext.gadget.[^\"]*"\]/g, "]").
			replace(/ext.gadget./g, ""));
		// Overwrite the url to load from disk
		opts.html1.url = "file://" + path.resolve('.', coreFileName);
		// console.log('stored to ' + coreFileName);
	}).then(function() {
		return Util.retryingHTTPRequest(2, { uri: opts.html2.url, method: 'GET' })
		.spread(function(_, res) {
			const addScriptTag = function(doc, opts) {
				const script = doc.createElement('script');
				script.setAttribute('type', 'text/javascript');
				script.setAttribute('async', '');
				if (opts.content) {
					script.appendChild(doc.createTextNode(opts.content));
				} else if (opts.url) {
					script.setAttribute('src', opts.url);
				} else if (opts.path) {
					script.setAttribute('src', "file://" + path.resolve('.', opts.path));
				}
				doc.head.appendChild(script);
			};

			const addStyleSheet = function(doc, url) {
				const newStyleSheet = doc.createElement('link');
				newStyleSheet.setAttribute('rel', 'stylesheet');
				newStyleSheet.setAttribute('href', url);
				doc.head.appendChild(newStyleSheet);
			}

			const dom = domino.createDocument(res);
			const base = dom.getElementsByTagName('base').item(0);

			// Update base href
			base.setAttribute('href', base.getAttribute('href').replace(/^[^/]*\//, 'https:/'));

			// Work around a difference in Parsoid's gallery implementation
			// Add p-wrapping around image captions
			Array.from(dom.querySelectorAll('div.gallerytext')).map(function(node) {
				const p = dom.createElement('p');
				let c = node.firstChild;
				while (c) {
					p.appendChild(c);
					c = node.firstChild;
				}
				node.appendChild(p);
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
			});

			const lang = opts.wiki.replace(/wik[it].*$/, '');

			let metas;

			// Get rid of stylesheet link that Parsoid added
			const oldStyles = dom.head.querySelectorAll('link[rel=stylesheet]');
			const htmlVersionNode = dom.head.querySelector('meta[property=mw:htmlVersion]');
			// Add some default skin stylesheets
			let styleModules = '';
			if (htmlVersionNode && semver.gt(htmlVersionNode.getAttribute('content'), '2.2.0')) {
				// Get rid of Parsoid-added sheets
				oldStyles.forEach(stag => stag.parentNode.removeChild(stag));

				// Collect modules that Parsoid has provided in <head>
				metas = dom.head.querySelectorAll('meta[property=mw:styleModules]');
				if (metas.length > 0) {
					styleModules = metas[0].getAttribute('content') + '|';
				}
			} else {
				const sheet = oldStyles[0]; // expect there to be only 1
				// Strip modules we are adding again below in the right order
				sheet.setAttribute('href', sheet.getAttribute('href').replace(/(mediawiki.skinning.content.parsoid|site.styles)(%7C)?/g, ''));
			}
			styleModules += "mediawiki.skinning.content.parsoid|jquery.makeCollapsible.styles|jquery.tablesorter.styles|skins.vector.styles.legacy";
			addStyleSheet(dom, '/w/load.php?modules=' + styleModules + '&only=styles&skin=vector&useskinversion=1&lang=' + lang);
			addStyleSheet(dom, '/w/load.php?modules=site.styles&only=styles&skin=vector&lang=' + lang);

			// Inject jquery first
			// Add some default skin scripts
			// Add additional ones specified in <head>
			addScriptTag(dom, { path: __dirname + '/jquery.js' });
			let scripts = ["site","jquery.tablesorter","jquery.makeCollapsible","skins.vector.legacy.js","mediawiki.page.ready"];
			metas = dom.head.querySelectorAll('meta[property=mw:generalModules]');
			if (metas.length > 0) {
				scripts = scripts.concat(metas[0].getAttribute('content').split('|'));
			}
			addScriptTag(dom, { content: 'document.documentElement.className="client-js";RLCONF={};RLSTATE={};RLPAGEMODULES=' + JSON.stringify(scripts) + ';' });
			addScriptTag(dom, { content: '(RLQ=window.RLQ||[]).push(function(){mw.loader.implement("",function($,jQuery,require,module){});});' });
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
}
