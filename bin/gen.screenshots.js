"use strict";

const Util = require('../lib/differ.utils.js').Util;
const VisualDiffer = require('../lib/differ.js').VisualDiffer;

const customOpts = {
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

const opts = Util.getCLIOpts(customOpts);
if (opts !== null) {
	const vd = new VisualDiffer();
	vd.takeScreenshots(opts, function(msg) { console.log(msg); })
	.then(function(){
		console.warn("--all done--");
	}).catch(function(err) {
		console.warn(err);
	});
}
