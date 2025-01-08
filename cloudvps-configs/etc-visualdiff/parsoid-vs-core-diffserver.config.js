'use strict';

const fs = require('fs');
const Util = require('/srv/visualdiff/lib/differ.utils.js').Util;
const adaptor1 = require('/srv/visualdiff/configs/common/cache_purge.adaptor.js');
const adaptor2 = require('/srv/visualdiff/configs/parsoid_vs_core/adaptor.js');

let mwAccessToken;
mwAccessToken = fs.readFileSync('/home/testreduce/.mw-api-access-token');
mwAccessToken = mwAccessToken.toString().trim();

if (typeof module === 'object') {
	module.exports = {
		// Purge cache to force MW to regen Parsoid HTML
		preLoadHandler: [ adaptor1.purgeCache, adaptor2.pre ],
	        postRenderHandler: adaptor2.post,
	        mwAccessToken: mwAccessToken,
		noSandBox: true, // we trust content & sandbox isn't set up anyway
		viewportWidth: 1600,
		viewportHeight: 0,

		onDemandDiffs: false,

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
					 '/wiki/' + encodeURIComponent(title) + '?useparsoid=0';
			},
		},
		// HTML2 generator options
		html2: {
			name: 'parsoid',
			dumpHTML: false,
			postprocessorScript: '/srv/visualdiff/configs/parsoid_vs_core/parsoid.postprocess.js',
			stylesYamlFile: '/srv/visualdiff/configs/common/parsoid.custom_styles.yaml',
			server: 'https://',
			injectJQuery: false,
			computeURL: function(server, wiki, title) {
				// URL for production REST API proxying Parsoid
				return server + Util.getWikiDomain(wiki) +
					 '/wiki/' + encodeURIComponent(title) + '?useparsoid=1';
			},
		},

		postInjectionDelay: 2000, // 2s
		screenShotDelay: 2000, // 2s

		// Engine for image diffs, may be resemble or uprightdiff
		diffEngine: 'uprightdiff',

		// UprightDiff options
		uprightDiffSettings: {
			binary: '/usr/bin/uprightdiff'
		},
	};
}
