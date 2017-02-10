module.exports = {
  // Production wikipedia PHP parser output
  html1: {
    name: 'php',
    postprocessorScript: '../lib/php_parser.postprocess.js',
    injectJQuery: false,
    // suppress default base url computation code
    // since we are providing the full wiki domain
    // on the commandline
    server: 'https://',
    computeURL: function(server, domain, title) {
      return server + domain + '/wiki/' + encodeURIComponent(title);
    },
	// dumpHTML: true,
  },

  // Production/local-dev Parsoid HTML output
  html2: {
    name: 'parsoid',
    stylesYamlFile: '../lib/parsoid.custom_styles.yaml',
    postprocessorScript: '../lib/parsoid.postprocess.js',
    injectJQuery: true,
    server: 'http://localhost:8000/',
    computeURL: function(server, domain, title) {
      return server + domain + '/v3/page/html/' + encodeURIComponent(title);
    },
	// dumpHTML: true,
  },

  // Engine for image diffs, may be resemble or uprightdiff
  diffEngine: 'uprightdiff',

  // UprightDiff options
  uprightDiffSettings: {
    // Path to your local uprightdiff install
    binary: '/usr/local/bin/uprightdiff',
  },
};
