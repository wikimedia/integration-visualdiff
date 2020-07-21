const path = require('path');

function getURL(vmhost, wiki, title) {
	return 'http://' + wiki.replace(/wiki$/, '') + '-' + vmhost + '-wikitextexp.wmflabs.org/wiki/' + encodeURIComponent(title);
}

module.exports = {
	viewportWidth: 1920,
	viewportHeight: 1080,

	wiki: 'enwiki',
	title: 'Main_Page',
	filePrefix: null,
	quiet: true,
	outdir: '.', // Share with clients

	// HTML1 generator options
	html1: {
		name: 'base',
		dumpHTML: false,
		postprocessorScript: path.resolve(__dirname, '../../lib/php_parser.postprocess.js'),
		injectJQuery: false,
		server: '',
		computeURL: function(server, wiki, title) {
			return getURL('base', wiki, title);
		}
	},
	// HTML2 generator options
	html2: {
		name: 'expt',
		dumpHTML: false,
		postprocessorScript: path.resolve(__dirname, '../../lib/php_parser.postprocess.js'),
		injectJQuery: false,
		server: '',
		computeURL: function(server, wiki, title) {
			return getURL('expt', wiki, title);
		}
	},

	postInjectionDelay: 1000,
	screenShotDelay: 1000,

	// Engine for image diffs, may be resemble or uprightdiff
	diffEngine: 'uprightdiff',

	// UprightDiff options
	uprightDiffSettings: {
		// Path to your local uprightdiff install
		binary: '/usr/bin/uprightdiff',
	},
};

