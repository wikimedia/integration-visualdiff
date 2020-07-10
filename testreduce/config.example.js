/**
 * Example configuration for the testreduce client.js script
 * Copy this file to config.js and change the values as needed.
 */
'use strict';
var path = require('path');
var clientScripts = require('/home/subbu/work/wmf/visualdiff/testreduce/client.scripts.js');

(function() {
	if (typeof module === 'object') {
		module.exports = {
			server: {
				// The address of the master HTTP server (for getting titles and posting results) (no protocol)
				host: 'localhost',

				// The port where the server is running
				port: 8002,
			},

			// A unique name for this client (optional) (URL-safe characters only)
			clientName: 'Visual diff testing client',

			opts: {
				viewportWidth: 1920,
				viewportHeight: 1080,

				wiki: 'enwiki',
				title: 'Main_Page',
				filePrefix: null,
				outdir: null,

				html1: {
					name: 'php',
					dumpHTML: true,
					postprocessorScript: '../lib/php_parser.postprocess.js',
					injectJQuery: false,
				},
				// HTML2 generator options
				html2: {
					name: 'parsoid',
					server: 'http://localhost:8000',
					dumpHTML: true,
					postprocessorScript: '../lib/parsoid.postprocess.js',
					stylesYamlFile: '../lib/parsoid.custom_styles.yaml',
					injectJQuery: true,
				},

				// Engine for image diffs, may be resemble or uprightdiff
				diffEngine: 'uprightdiff',

				// UprightDiff options
				uprightDiffSettings: {
					// Path to your local uprightdiff install
					// binary: '/usr/local/bin/uprightdiff',
					binary: '/home/subbu/work/wmf/software/uprightdiff/uprightdiff',
				},

				// Wait 1.5 sec before diffing screenshots
				diffDelay: 1500, // 1.5 sec

				// Timeout if test doesn't complete in 5 mins
				testTimeout: 5*60*1000, // 5 min

				// Retry at most 2 additional times
				maxRetries: 2,
			},

			postJSON: true,

			gitCommitFetch: clientScripts.gitCommitFetch,

			runTest: clientScripts.generateVisualDiff,

		};
	}
}());
