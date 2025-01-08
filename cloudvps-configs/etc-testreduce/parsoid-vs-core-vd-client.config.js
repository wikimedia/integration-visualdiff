/**
 * Configuration for testreduce client.js script
 * for comparing Parsoid HTML rendering with PHP parser HTML rendering.
 * Use uprightdiff for image diffs
 */
'use strict';

const fs = require('fs');
const Util = require('/srv/visualdiff/lib/differ.utils.js').Util;
const clientScripts = require('/srv/visualdiff/testreduce/client.scripts.js');
const adaptor1 = require('/srv/visualdiff/configs/common/cache_purge.adaptor.js');
const adaptor2 = require('/srv/visualdiff/configs/parsoid_vs_core/adaptor.js');

let mwAccessToken;
mwAccessToken = fs.readFileSync('/home/testreduce/.mw-api-access-token');
mwAccessToken = mwAccessToken.toString().trim();

if (typeof module === 'object') {
	module.exports = {
		server: {
			// The address of the master HTTP server (for getting titles and posting results) (no protocol)
			host: 'localhost',

			// The port where the server is running
			port: 8021
		},
		opts: {
			// Purge cache to force MW to regen Parsoid HTML
			preLoadHandler: [ adaptor1.purgeCache, adaptor2.pre ],
			postRenderHandler: adaptor2.post,
	        	mwAccessToken: mwAccessToken,

			noSandBox: true, // we trust content & sandbox isn't set up anyway
			viewportWidth: 1600,
			viewportHeight: 0,

			filePrefix: null,
			quiet: true,
			outdir: '/srv/visualdiff/pngs', // Share with clients

			// HTML1 generator options
			html1: {
				name: 'core',
				dumpHTML: false,
				postprocessorScript: '/srv/visualdiff/configs/parsoid_vs_core/legacy.postprocess.js',
				injectJQuery: false,
				server: 'https://',
				computeURL: function(server, wiki, title) {
					return server + Util.getWikiDomain(wiki) +
						 '/wiki/' + encodeURIComponent(title) + '?useparsoid=0&sortcat=1&z=wmf5';
        			},
			},
			// HTML2 generator options
			html2: {
				name: 'parsoid',
				dumpHTML: false,
				postprocessorScript: '/srv/visualdiff/configs/parsoid_vs_core/parsoid.postprocess.js',
				stylesYamlFile: '/srv/visualdiff/configs/parsoid_vs_core/parsoid.custom_styles.yaml',
				server: 'https://',
				injectJQuery: false,
				computeURL: function(server, wiki, title) {
					// URL for production REST API proxying Parsoid
					return server + Util.getWikiDomain(wiki) +
						 '/wiki/' + encodeURIComponent(title) + '?useparsoid=1&sortcat=1&z=wmf5';
        			},
			},

			postInjectionDelay: 1000, // 1 sec (because of custom style tags)
			screenShotDelay: 1000, // 1 sec (because of potentially exposed images/icons after postprocessing)

			// Timeout if test doesn't complete in 5 mins
			testTimeout: 5*60*1000, // 5 min

			// Engine for image diffs
			diffEngine: 'uprightdiff',

			// UprightDiff options
			uprightDiffSettings: {
				binary: '/usr/bin/uprightdiff'
			},
		},

		postJSON: true,

		// Right now, this is good enough
		gitCommitFetch: function(opts) {
			return "1.44.0-wmf.8";
		},

		runTest: clientScripts.generateVisualDiff,
	};
}
