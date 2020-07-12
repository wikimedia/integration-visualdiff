const Util = require('../../lib/differ.utils.js').Util;
const path = require('path');

module.exports = {
  // Production wikipedia PHP parser output
  html1: {
    name: 'php',
    postprocessorScript: path.resolve(__dirname, '../../lib/php_parser.postprocess.js'),
    injectJQuery: false,
    // suppress default base url computation code
    // since we are providing the full wiki domain
    // on the commandline
    server: 'https://',
    computeURL: function(server, wiki, title) {
	  const url = server + Util.getWikiDomain(wiki) + '/wiki/' + encodeURIComponent(title) + "?useskin=vector";
      // console.log("LURL: " + url);
      return url;
    },
	dumpHTML: true,
  },

  // Production/local-dev Parsoid HTML output
  html2: {
    name: 'parsoid',
    stylesYamlFile: path.resolve(__dirname, '../../lib/parsoid.custom_styles.yaml'),
    postprocessorScript: path.resolve(__dirname, '../../lib/parsoid.postprocess.js'),
    injectJQuery: true,
    server: 'https://',
    computeURL: function(server, wiki, title) {
	  const url = server + Util.getWikiDomain(wiki) + '/api/rest_v1/page/html/' + encodeURIComponent(title);
      // console.log("PURL: " + url);
      return url;
    },
	dumpHTML: true,
  },

  // Engine for image diffs, may be resemble or uprightdiff
  diffEngine: 'uprightdiff',

  // UprightDiff options
  uprightDiffSettings: {
    // Path to your local uprightdiff install
    binary: '/usr/bin/uprightdiff',
  },
};
