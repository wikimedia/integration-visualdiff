module.exports = {
  outdir: '/tmp/',
  wiki: 'enwiki',

  // HTML1 is generated by a Parsoid install that uses the Parsoid batching API
  // This runs locally right now.
  html1: {
    name: 'batching',
    stylesYamlFile: '../lib/parsoid.custom_styles.yaml',
    postprocessorScript: '../lib/parsoid.postprocess.js',
    server: 'http://localhost:8000/',
    injectJQuery: true,
    computeURL: function(server, wiki, title) {
        return server + wiki + '/' + encodeURIComponent(title);
    },
  },

  // HTML2 is generated by a Parsoid install that does not use the Parsoid batching API
  // Right now, pointing this to the production Parsoid install.
  // (could also instead point to the RESTBase api and use a different computeURL fn).
  html2: {
    name: 'no-batching',
    stylesYamlFile: '../lib/parsoid.custom_styles.yaml',
    postprocessorScript: '../lib/parsoid.postprocess.js',
    server: 'http://parsoid-lb.eqiad.wikimedia.org/',
    injectJQuery: true,
    computeURL: function(server, wiki, title) {
        return server + wiki + '/' + encodeURIComponent(title);
    },
  },
};