#!/usr/bin/env node

'use strict';

const express = require('express');
const yargs = require('yargs');
const fs = require('fs');
const path = require('path');
const Util = require('../lib/differ.utils.js').Util;
const VisualDiffer = require('../lib/differ.js').VisualDiffer;
const { exit } = require('process');

// Command line options
const opts = yargs.usage('Usage: $0 [connection parameters]')
	.options('help', {
		'boolean': true,
		'default': false,
		describe: 'Show usage information.'
	})
	.options('config', {
		describe: 'Configuration file for the server',
		'default': './diffserver.settings.js',
	})
	.options('P', {
		alias: 'port',
		'default': 8002,
		describe: 'Port number to use for connection.'
	})
	.options('onDemandDiffs', {
		'boolean': true,
		'default': false,
		describe: 'Generate diffs if not available'
	});

const argv = opts.argv;

if (argv.help) {
	opts.showHelp();
	process.exit(0);
}

// Settings file
let settings;
try {
	settings = require(argv.config);
} catch (e) {
	console.error('Aborting! Got exception processing diffserver.settings.js: ' + e);
	console.error(e.stack);
	process.exit(1);
}
// Browser HTML file
const browserHtml = fs.readFileSync(
	path.resolve(__dirname, './browser.html'), 'utf8'
);

const baseDir = settings.outdir.slice().replace(/\/$/, '');

// Make an app
const app = express();

// robots.txt: no indexing.
app.get(/^\/robots.txt$/, function (req, res) {
	res.end('User-agent: *\nDisallow: /\n');
});

function getLink(screenShot, baseDir, targetDir) {
	// Set up relative links.
	// - walk 2 levels up (/diff/wikiprefix/) to set up the right urls.
	// - replace baseDir with targetDir (since we don't know if
	//   the contents of baseDir are web accessible outside this webapp).
	// - Replace %2F back to / since the differ doesn't seem to be
	//   url-encoding / and that is interpreted as a directory component
	//   in the filename and we want to retain that.
	return '../../' + encodeURIComponent(screenShot.replace(baseDir, targetDir)).replace(/%2F/g, '/');
}

function sendBrowserResponse(res, opts) {
	const urls = {
		title: 'Visual diff browser: ' + opts.wiki + ':' + opts.title,
		core: '../' + getLink(opts.html1.screenShot, baseDir, 'images'),
		parsoid: '../' + getLink(opts.html2.screenShot, baseDir, 'images'),
		diff: '../' + getLink(opts.diffFile, baseDir, 'images'),
	};
	const html = browserHtml.replace(
		/proton[.](title|core|parsoid|diff)[.]png/g,
		(match, p1) => urls[p1]
	);
	res.setHeader('Content-Type', 'text/html; charset=UTF-8');
	res.status(200).send(html);
}

function sendResponse(res, opts) {
	const pageTitle = 'Visual diff for ' + opts.wiki + ':' + opts.title;
	// Normalize both urls to desktop mode
	const url1 = opts.html1.computeURL(opts.html1.server, opts.wiki, opts.title).replace(/\.m\./, '');
	const url2 = opts.html2.computeURL(opts.html2.server, opts.wiki, opts.title).replace(/\.m\./, '');
	let page = '<html>';
	page += '<head><title>' + pageTitle + '</title></head>';
	page += '<body>';
	page += '<h1>' + pageTitle + '</h1>';
	page += '<ul><li><a target="_blank" href="./' + encodeURIComponent(opts.title) + '/browse">Visual Diff Browser</a></li></ul>';
	page += '<h2>Screenshots</h2>\n';
	page += '<ul>';
	page += '<li><a target="_blank" href="' + getLink(opts.html1.screenShot, baseDir, 'images') + '">' + opts.html1.name + ' Screenshot</a></li>';
	page += '<li><a target="_blank" href="' + getLink(opts.html2.screenShot, baseDir, 'images') + '">' + opts.html2.name + ' Screenshot</a></li>';
	page += '<li><a target="_blank" href="' + getLink(opts.diffFile, baseDir, 'images') + '">Visual Diff</a></li>';
	page += '</ul>\n';
	page += '<h2>Desktop page on the target wikis</h2>\n';
	page += '<ul>\n';
	page += '<li><a target="_blank" href="' + url1 + '">' + opts.html1.name + ' HTML</a></li>\n';
	page += '<li><a target="_blank" href="' + url2 + '">' + opts.html2.name + ' HTML</a></li>\n';
	page += '</ul>\n';
	page += '<h2>Mobile page on the target wikis</h2>\n';
	page += '<ul>\n';
	page += '<li><a target="_blank" href="' + url1.replace(/\./, '.m.') + '">' + opts.html1.name + ' HTML</a></li>\n';
	page += '<li><a target="_blank" href="' + url2.replace(/\./, '.m.') + '">' + opts.html2.name + ' HTML</a></li>\n';
	page += '</ul>\n';
	page += '</body></html>';

	// Send response
	res.setHeader('Content-Type', 'text/html; charset=UTF-8');
	res.status(200).send(page);
}

app.get(/^\/diff\/([^/]*)\/([^/]*)(\/browse)?/, async function(req, res) {
	const wiki = req.params[0];
	const title = req.params[1];
	const isBrowse = req.params[2];
	const oldId = req.query.oldId;
	const logger = settings.quiet ? function(){} : function(msg) { console.log(msg); };
	const respond = isBrowse ? sendBrowserResponse : sendResponse;

	// Clone before modifying it!
	var opts = Util.clone(settings);
	opts.wiki = wiki;
	opts.title = title;
	opts = Util.getNonCLIOpts(opts);

	if (fs.existsSync(opts.diffFile) &&
		fs.existsSync(opts.html1.screenShot) &&
		fs.existsSync(opts.html2.screenShot)) {
		// Everything found on disk .. send them along!
		respond(res, opts);
	} else if (opts.onDemandDiffs) {
		try {
			const diffData = await (new VisualDiffer()).genVisualDiff(opts, logger);
			if (diffData) {
				respond(res, opts);
			} else {
				res.status(500).send('Encountered diffing error for ' + wiki + ':' + title);
			}
		} catch (err) {
			console.error('ERROR for ' + wiki + ':' + title + ': ' + err);
			res.status(500).send('Encountered error [' + err + '] for ' + wiki + ':' + title);
		}
	} else {
		res.status(404).send(`Cannot display diff! Some of these image files are missing:
			<ul>
			<li>${opts.html1.name}: ${opts.html1.screenShot}</li>
			<li>${opts.html2.name}: ${opts.html2.screenShot}</li>
			<li>diff: ${opts.diffFile}</li>
			</ul>
			<b>On demand diffing suppressed.</b><br/>`);
	}
});

// Start the app
app.listen(argv.port);
console.log('Listening on port: ' + argv.port);
