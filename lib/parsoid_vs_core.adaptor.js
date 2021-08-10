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

	return retryingHTTPRequest(2, { uri: opts.html1.url, method: 'GET' })
	.spread(function(_, res) {
		const dom = domino.createDocument(res);
		const base = dom.createElement('base');
		base.setAttribute('href', opts.html1.url);
		dom.head.insertBefore(base, dom.head.firstChild);

		// Save the core HTML to disk
		const coreFileName = asciiFileName(opts.outdir, opts.html1.screenShot);
		// Suppress all gadgets from the core output for now
		// since Parsoid output doesn't have these gadgets right now
		fs.writeFileSync(coreFileName, dom.outerHTML.replace(/"ext.gadget.[^\"]*",?/g, ""));
		// Overwrite the url to load from disk
		opts.html1.url = "file://" + path.resolve('.', coreFileName);
		// console.log('stored to ' + coreFileName);
	}).then(function() {
		return retryingHTTPRequest(2, { uri: opts.html2.url, method: 'GET' })
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
				const styles = Array.from(doc.querySelectorAll('link[rel=stylesheet]'));
				const last = styles[styles.length-1];
				last.parentNode.insertBefore(newStyleSheet, last.nextSibling);
			}

			const dom = domino.createDocument(res);
			const base = dom.getElementsByTagName('base').item(0);

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
			Array.from(dom.querySelectorAll('a[rel=mw:WikiLink]')).map(function(link) {
				if (link.getAttribute('href').replace(/^\.\//, '') === opts.title) {
					link.removeAttribute('rel');
					link.removeAttribute('href');
					link.removeAttribute('title');
					link.setAttribute('class', 'mw-selflink selflink');
				}
			});

			// Update base href
			base.setAttribute('href', base.getAttribute('href').replace(/^[^/]*\//, 'https:/'));

			const lang = opts.wiki.replace(/wik[it].*$/, '');

			// Add some default skin stylesheets
			let styleModules = "skins.vector.styles.legacy|jquery.makeCollapsible.styles|jquery.tablesorter.styles";
			// Add additional ones specified in <head>
			let metas = dom.head.querySelectorAll('meta[property=mw:styleModules]');
			if (metas.length > 0) {
				styleModules += '|' + metas[0].getAttribute('content');
			}
			addStyleSheet(dom, '/w/load.php?modules=' + styleModules + '&only=styles&skin=vector&useskinversion=1&lang=' + lang);
			addStyleSheet(dom, '/w/load.php?modules=site.styles&only=styles&skin=vector&lang=' + lang);

			// Add some default skin scripts
			let scripts = ["site","jquery.tablesorter","jquery.makeCollapsible","skins.vector.legacy.js","mediawiki.page.ready"];
			metas = dom.head.querySelectorAll('meta[property=mw:generalModules]');
			if (metas.length > 0) {
				scripts = scripts.concat(metas[0].getAttribute('content').split('|'));
			}
			// Add additional ones specified in <head>
			addScriptTag(dom, { content: 'document.documentElement.className="client-js";RLCONF={};RLSTATE={};RLPAGEMODULES=' + JSON.stringify(scripts) + ';' });
			addScriptTag(dom, { content: '(RLQ=window.RLQ||[]).push(function(){mw.loader.implement("",function($,jQuery,require,module){});});' });
			addScriptTag(dom, { url: '/w/load.php?&modules=startup&only=scripts&raw=1&skin=vector&lang=' + lang });

			// Add parsoid skinning module
			const newStyleSheet = dom.createElement('link');
			newStyleSheet.setAttribute('rel', 'stylesheet');
			newStyleSheet.setAttribute('href', '/w/load.php?modules=mediawiki.skinning.content.parsoid|ext.cite.style|ext.cite.styles&only=styles&skin=vector&lang=' + opts.wiki.replace(/wik[it].*$/, ''));
			const styles = Array.from(dom.querySelectorAll('link[rel=stylesheet]'));
			styles[0].parentNode.insertBefore(newStyleSheet, styles[0]);

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
