"use strict";

const Promise = require('prfun/wrap')(require('babybird'));
const request = Promise.promisify(require('request').defaults({jar: true}), true);

async function purgeCache(opts) {
	const apiURL = opts.html1.url.replace(/\/wiki\/.*/, '\/w/api.php'); // HARDCODED!
	// console.log("Purging .. " + apiURL + " title: " + opts.title);
	return request({
		uri: apiURL,
		form: {
			action: 'purge',
			format: 'json',
			titles: opts.title,
		},
		method: 'POST'
	}).spread(function(res, body) {
		// console.log("got res: " + res.statusCode);
		// console.log("body: " + body);
	}).catch(function(error) { /* suppress errors */
		// console.log(error);
	});
}

module.exports = {
	purgeCache: purgeCache,
}
