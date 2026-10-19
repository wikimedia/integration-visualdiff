const Util = require('../../lib/differ.utils.js').Util;
const path = require('path');
const adaptor1 = require('../common/cache_purge.adaptor.js');
const adaptor2 = require('./adaptor.js');

module.exports = {
  preLoadHandler: [ adaptor1.purgeCache, adaptor2.pre ],
  postRenderHandler: adaptor2.post,

  noSandBox: true, // we trust content & sandbox isn't set up anyway

  outdir: 'images',
  html1: {
    name: 'php83',
    postprocessorScript: path.resolve(__dirname, './postprocess.js'),
    injectJQuery: true,
    server: 'https://',
    computeURL: function(server, wiki, title) {
	  return server + Util.getWikiDomain(wiki) + '/wiki/' + encodeURIComponent(title);
    },
	dumpHTML: true,
  },

  html2: {
    name: 'php85',
    postprocessorScript: path.resolve(__dirname, './postprocess.js'),
    injectJQuery: true,
    server: 'https://',
    headers: {
		'X-Wikimedia-Debug': 'backend=k8s-mwdebug-next'
	},
    computeURL: function(server, wiki, title) {
	  return server + Util.getWikiDomain(wiki) + '/wiki/' + encodeURIComponent(title);
    },
	dumpHTML: true,
  },

  postInjectionDelay: 1000, // 1 sec (needed because of custom style tags)
  screenShotDelay: 1000, // 1 sec (needed because of potentially exposed images/icons)

  // Engine for image diffs, may be resemble or uprightdiff
  diffEngine: 'uprightdiff',

  // UprightDiff options
  uprightDiffSettings: {
    // Path to your local uprightdiff install
    binary: '/usr/bin/uprightdiff',
  },
};
