var adaptor = require('./adaptor.js');

module.exports = {
  preLoadHandler: adaptor.pre,
  postRenderHandler: adaptor.post,

  noSandBox: true, // we trust content & sandbox isn't set up anyway

  // Production wikipedia PHP parser output
  html1: {
    name: 'tidy',
    postprocessorScript: './postprocess.js',
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

  html2: {
    name: 'remex',
    postprocessorScript: './postprocess.js',
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

  // Engine for image diffs, may be resemble or uprightdiff
  diffEngine: 'uprightdiff',

  // UprightDiff options
  uprightDiffSettings: {
    // Path to your local uprightdiff install
    binary: '/usr/bin/uprightdiff',
  },
};
