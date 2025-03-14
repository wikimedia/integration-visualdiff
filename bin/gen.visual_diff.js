"use strict";

const Util = require('../lib/differ.utils.js').Util;
const VisualDiffer = require('../lib/differ.js').VisualDiffer;

const customOpts = {
	'viewportWidth': {
		description: "Viewport width",
		'boolean': false,
		'default': 1600
	},
	'viewportHeight': {
		description: "Viewport height",
		'boolean': false,
		'default': 0 // Lets puppeteer pick max window height
	},
	'stylesYamlFile': {
		description: "YAML file containing custom CSS",
		'boolean': false,
		'default': "../styles.yaml"
	}
};

const opts = Util.getCLIOpts(customOpts);
if (opts !== null) {
	const vd = new VisualDiffer;
	vd.genVisualDiff(opts, function(msg) { console.log(msg); })
	.then(function(data) {
		// analysis stats
		console.error("STATS: " + JSON.stringify(data));
	}).catch(function(err) {
		console.warn(err);
	});
}
