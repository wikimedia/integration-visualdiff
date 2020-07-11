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

function getWikiTitle(wiki, title, vm) {
	return 'http://' + wiki.replace(/wiki$/, '') + '.' + vm + '.wikitextexp.wmflabs.org/wiki/' + encodeURIComponent(title);
}

function sendResponse(res, opts) {
	const pageTitle = 'Visual diff for ' + opts.wiki + ':' + opts.title;
	let page = '<html>';
	page += '<head><title>' + pageTitle + '</title></head>\n';
	page += '<body>\n';
	page += '<h1>' + pageTitle + '</h1>\n';
	page += '<h2>Screenshots</h2>\n';
	page += '<ul>\n';
/**
	page += '<li><a target="_blank" href="' + getLink(opts.html1.screenShot, baseDir, 'images') + '">' + opts.html1.name + ' Screenshot</a></li>\n';
	page += '<li><a target="_blank" href="' + getLink(opts.html2.screenShot, baseDir, 'images') + '">' + opts.html2.name + ' Screenshot</a></li>\n';
	page += '<li><a target="_blank" href="' + getLink(opts.diffFile, baseDir, 'images') + '">Visual Diff</a></li>\n';
	page += '</ul>\n';
	page += '<h2>Page on the target wikis</h2>\n';
	page += '<ul>\n';
	page += '<li><a target="_blank" href="' + getWikiTitle(opts.wiki, opts.title, 'base') + '">' + opts.html1.name + ' HTML</a></li>\n';
	page += '<li><a target="_blank" href="' + getWikiTitle(opts.wiki, opts.title, 'expt') + '">' + opts.html2.name + ' HTML</a></li>\n';
**/
	page += '<li><a target="_blank" href="' + getLink(opts.html1.screenShot, baseDir, 'visualdiff/pngs') + '">' + opts.html1.name + ' Screenshot</a></li>';
	page += '<li><a target="_blank" href="' + getLink(opts.html2.screenShot, baseDir, 'visualdiff/pngs') + '">' + opts.html2.name + ' Screenshot</a></li>';
	page += '<li><a target="_blank" href="' + getLink(opts.diffFile, baseDir, 'visualdiff/pngs') + '">Visual Diff</a></li>';
	page += '</ul>\n';
	page += '<h2>Parsoid & PHP HTML</h2>\n';
	page += 'The diffs above are generated after the PHP-parser HTML and Parsoid HTML are post-processed to strip the skin, expand all collapsed elements, and missing CSS is applied to Parsoid HTML.';

	var domain = Util.getWikiDomain(opts.wiki);
	page += '<ul>\n';
	page += '<li><a target="_blank" href="https://' + domain + "/wiki/" + encodeURIComponent(opts.title) + '?useskin=vector">' + opts.html1.name + ' HTML</a></li>\n';
	page += '<li><a target="_blank" href="https://' + domain + "/api/rest_v1/page/html/" + encodeURIComponent(opts.title) + '">' + opts.html2.name + ' HTML</a></li>\n';

	page += '</ul>';
	page += '</body></html>';

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
		fs.existsSync(opts.html2.screenShot)) {
		// Everything found on disk .. send them along!
		sendResponse(res, opts);
	} else {
		res.setHeader('Content-Type', 'text/html; charset=UTF-8');
		res.status(200).send("On-demand visual diff generation is disabled.");
	}
});

// Start the app
app.listen(argv.port);
console.log('Listening on port: ' + argv.port);
