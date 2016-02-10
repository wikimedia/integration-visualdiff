"use strict";

var fs = require('fs'),
	Util = require('../lib/differ.utils.js').Util,
	Differ = require('../lib/differ.js').VisualDiffer;

var customOpts = {
	'viewportWidth': {
		description: "Viewport width",
		'boolean': false,
		'default': 1920
	},
	'viewportHeight': {
		description: "Viewport height",
		'boolean': false,
		'default': 1080
	},
	'stylesYamlFile': {
		description: "YAML file containing custom CSS",
		'boolean': false,
		'default': "../styles.yaml"
	}
};

var opts = Util.getCLIOpts(customOpts);
if (opts !== null) {
	Differ.genVisualDiff(opts, function(msg) {
		console.log(msg);
	}, function(err, data) {
		if (!err) {
			// analysis stats
			console.error("STATS: " + JSON.stringify(data));
		}
	});
}
