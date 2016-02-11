#!/usr/bin/env node

'use strict';

var express = require('express');
var yargs = require('yargs');
var fs = require('fs');
var Util = require('../lib/differ.utils.js').Util;
var VisualDiffer = require('../lib/differ.js').VisualDiffer;

// Command line options
var opts = yargs.usage('Usage: $0 [connection parameters]')
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

var argv = opts.argv;

if (argv.help) {
	opts.showHelp();
	process.exit(0);
}

// Settings file
var settings;
try {
	settings = require(argv.config);
} catch (e) {
	console.error('Aborting! Got exception processing diffserver.settings.js: ' + e);
	console.error(e.stack);
	return;
}

var baseDir = settings.outdir.slice().replace('\/$', '');

// Make an app
var app = express();

// Declare static directory
app.use('/images', express.static(baseDir));

// robots.txt: no indexing.
app.get(/^\/robots.txt$/, function (req, res) {
	res.end('User-agent: *\nDisallow: /\n');
});

function sendResponse(res, opts) {
	var pageTitle = 'Visual diff for ' + opts.wiki + ':' + opts.title;
	var page = '<html>';
	page += '<head><title>' + pageTitle + '</title></head>';
	page += '<body>';
	page += '<h1>' + pageTitle + '</h1>';
	page += '<ul>';
	// Set up relative links.
	// -- walk 2 levels up (/diff/wikiprefix/) to set up the right urls.
	page += '<li><a href="../../' + opts.html1.screenShot.replace(baseDir, 'images/') + '">' + opts.html1.name + ' Screenshot</a></li>';
	page += '<li><a href="../../' + opts.html2.screenShot.replace(baseDir, 'images/') + '">' + opts.html2.name + ' Screenshot</a></li>';
	page += '<li><a href="../../' + opts.diffFile.replace(baseDir, 'images/') + '">Visual Diff</a></li>';
	page += '</ul></body>';
	page += '</html>';

	// Send response
	res.setHeader('Content-Type', 'text/html; charset=UTF-8');
	res.status(200).send(page);
}

app.get(/^\/diff\/([^/]*)\/(.*)/, function(req, res) {
	var wiki = req.params[0];
	var title = req.params[1];
	var oldId = req.query.oldId;
	var logger = settings.quiet ? function(){} : function(msg) { console.log(msg); };

	// Clone before modifying it!
	var opts = Util.clone(settings);
	opts.wiki = wiki;
	opts.title = title;
	opts = Util.getNonCLIOpts(opts);

	if (fs.existsSync(opts.diffFile) &&
		fs.existsSync(opts.html1.screenShot) &&
		fs.existsSync(opts.html1.screenShot)) {
		// Everything found on disk .. send them along!
		sendResponse(res, opts);
	} else {
		VisualDiffer.genVisualDiff(opts, logger,
			function(err, diffData) {
				if (err) {
					console.error('ERROR for ' + wiki + ':' + title + ': ' + err);
					res.send('Encountered error [' + err + '] for ' + wiki + ':' + title, 500);
					return;
				}

				// Dump diff
				var png_data = diffData.getImageDataUrl('').replace(/^data:image\/png;base64,/, '');
				var png_buffer = new Buffer(png_data, 'base64');
				fs.writeFileSync(opts.diffFile, png_buffer);

				// Send HTML
				sendResponse(res, opts);
			}
		);
	}
});

// Start the app
app.listen(argv.port);
console.log('Listening on port: ' + argv.port);
