"use strict";

var fs = require('fs');

function setupEndpoints(settings, app, mysql, db, hbs) {
	hbs.registerPartial('summary', fs.readFileSync(__dirname + '/views/index-summary-visualdiff.html', 'utf8'));
}

if (typeof module === "object") {
	module.exports.parsoidRTConfig = {
		parseSelserStats: function() { return 0; }, // Nothing to do
		setupEndpoints: setupEndpoints,
		updateIndexPageUrls: function() {}, // Nothing to do
		updateIndexData: function() {}, // Nothing to do
		updateTitleData:  function() {}, // Nothing to do
	};
}
