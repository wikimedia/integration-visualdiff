#!/usr/bin/env node

'use strict';

const express = require('express');
const yargs = require('yargs');
const fs = require('fs');
const Util = require('../lib/differ.utils.js').Util;
const VisualDiffer = require('../lib/differ.js').VisualDiffer;

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
	return;
}

const baseDir = settings.outdir.slice().replace(/\/$/, '');

// Make an app
const app = express();

// Declare static directory
app.use('/images', express.static(baseDir));

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

function sendResponse(res, opts) {
	const pageTitle = 'Visual diff for ' + opts.wiki + ':' + opts.title;
	let page = '<html>';
	page += '<head><title>' + pageTitle + '</title></head>';
	page += '<body>';
	page += '<h1>' + pageTitle + '</h1>';
	page += '<ul>';
	page += '<li><a target="_blank" href="' + getLink(opts.html1.screenShot, baseDir, 'images') + '">' + opts.html1.name + ' Screenshot</a></li>';
	page += '<li><a target="_blank" href="' + getLink(opts.html2.screenShot, baseDir, 'images') + '">' + opts.html2.name + ' Screenshot</a></li>';
	page += '<li><a target="_blank" href="' + getLink(opts.diffFile, baseDir, 'images') + '">Visual Diff</a></li>';
	page += '</ul></body>';
	page += '</html>';

	// Send response
	res.setHeader('Content-Type', 'text/html; charset=UTF-8');
	res.status(200).send(page);
}

app.get(/^\/diff\/([^/]*)\/(.*)/, async function(req, res) {
	const wiki = req.params[0];
	const title = req.params[1];
	const oldId = req.query.oldId;
	const logger = settings.quiet ? function(){} : function(msg) { console.log(msg); };

	// Clone before modifying it!
	var opts = Util.clone(settings);
	opts.wiki = wiki;
	opts.title = title;
	opts = Util.getNonCLIOpts(opts);

	if (fs.existsSync(opts.diffFile) &&
		fs.existsSync(opts.html1.screenShot) &&
		fs.existsSync(opts.html2.screenShot)) {
		// Everything found on disk .. send them along!
		sendResponse(res, opts);
	} else {
		try {
			const diffData = await VisualDiffer.genVisualDiff(opts, logger);
			if (diffData) {
				sendResponse(res, opts);
			} else {
				res.status(500).send('Encountered diffing error for ' + wiki + ':' + title);
			}
		} catch (err) {
			console.error('ERROR for ' + wiki + ':' + title + ': ' + err);
			res.status(500).send('Encountered error [' + err + '] for ' + wiki + ':' + title);
		}
	}
});

// Start the app
app.listen(argv.port);
console.log('Listening on port: ' + argv.port);
