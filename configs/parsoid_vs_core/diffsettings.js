const Util = require('../../lib/differ.utils.js').Util;
const path = require('path');
const adaptor1 = require('../../lib/cache_purge.adaptor.js');
const adaptor2 = require('./adaptor.js');

module.exports = {
  preLoadHandler: [ adaptor1.purgeCache, adaptor2.pre ],
  postRenderHandler: adaptor2.post,

  outdir: 'images',
  // Production wikipedia PHP parser output
  html1: {
    name: 'php',
    postprocessorScript: path.resolve(__dirname, './legacy.postprocess.js'),
    injectJQuery: false,
    // suppress default base url computation code
    // since we are providing the full wiki domain
    // on the commandline
    server: 'https://',
    computeURL: function(server, wiki, title) {
	  const url = server + Util.getWikiDomain(wiki) + '/wiki/' + encodeURIComponent(title) + "?useskin=vector&useskinversion=1";
      // console.log("LURL: " + url);
      return url;
    },
	dumpHTML: true,
  },

  // Production/local-dev Parsoid HTML output
  html2: {
    name: 'parsoid',
    stylesYamlFile: path.resolve(__dirname, '../../lib/parsoid.custom_styles.yaml'),
    postprocessorScript: path.resolve(__dirname, './parsoid.postprocess.js'),
    injectJQuery: false,
    server: 'https://',
    computeURL: function(server, wiki, title) {
	  const url = server + Util.getWikiDomain(wiki) + '/wiki/' + encodeURIComponent(title) + "?useskin=vector&useskinversion=1&useparsoid=1";
      // console.log("PURL: " + url);
      return url;
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
    binary: '/usr/local/bin/uprightdiff',
  },
};
