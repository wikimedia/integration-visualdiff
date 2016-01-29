"use strict";

var fs = require('fs'),
	Util = require('../lib/differ.utils.js').Util;

var customOpts = {
	'indir': {
		description: 'Directory to get screenshots from? (default: .)',
		'boolean': false,
		'default': null
	},
	'fileprefix': {
		description: 'Prefix of files to get screenshots from and output diffs to?' +
			'(default:  <title>.<name2>.png, <title>.<name1>.png, <title>.diff.png)',
		'boolean': false,
		'default': null
	}
};

var opts = Util.getopts(customOpts);
if (opts !== null) {
	var prefix = opts.prefix;
	var indir = (opts.indir || ".").replace(/\/$/, '') + "/" + opts.wiki + "/";

	// SSS FIXME: This doesn't yet use the diff algorithm option yet. TODO.
	var resemble = require('resemble').resemble,
	if (opts.outputSettings) {
		resemble.outputSettings(opts.outputSettings);
	}
	resemble(opts.html1.screenShot).compareTo(opts.html2.screenShot).
		ignoreAntialiasing(). // <-- muy importante
		onComplete(function(data){
		    // analysis stats
			console.error("STATS: " + JSON.stringify(data));

			// Save the base64 data
			var png_data = data.getImageDataUrl("").replace(/^data:image\/png;base64,/, '');
			var png_buffer = new Buffer(png_data, 'base64');
			var png_file = opts.outdir + prefix + ".diff.png";
			fs.writeFileSync(png_file, png_buffer);
		});
}
