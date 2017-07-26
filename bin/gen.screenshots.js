"use strict";

var Util = require('../lib/differ.utils.js').Util,
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
	Differ.takeScreenshots(opts, function(msg) { console.log(msg); }).then(function(){
		console.warn("--all done--");
	}).catch(function(err) {
		console.warn(err);
	});
}
