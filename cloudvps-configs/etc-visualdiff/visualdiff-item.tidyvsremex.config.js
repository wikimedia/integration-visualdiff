'use strict';

if (typeof module === 'object') {
	module.exports = {
		viewportWidth: 1920,
		viewportHeight: 1080,

		wiki: 'enwiki',
		title: 'Main_Page',
		filePrefix: null,
		quiet: true,
		outdir: '/srv/visualdiff/pngs', // Share with clients

		// Since on-demand generation is suppressed, nothing else is required here.
		// HTML1 generator options
		html1: {
			name: 'tidy',
		},
		// HTML2 generator options
		html2: {
			name: 'remex',
		},

	};
}
