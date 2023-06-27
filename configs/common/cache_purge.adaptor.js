"use strict";

const Promise = require('prfun/wrap')(require('babybird'));
const request = Promise.promisify(require('request').defaults({ jar: true }), true);

let purgeRate = 1.0;
let lastPurgeCount = 0;
let numPurges = 0;
let numSkips = 0;
function purgeCache(opts) {
	if (Math.random() > purgeRate) {
		numSkips++;
		// console.log('RATE-LIMIT: Skipping!');
		if (numPurges > lastPurgeCount) {
			purgeRate = purgeRate * 1.25;
			if (purgeRate > 1) {
				purgeRate = 1;
			}
			console.log('RATE-LIMIT: Bumping up! #skips = ' + numSkips + '; # purges=' + numPurges + '; previously: ' + lastPurgeCount + '; purgeRate:' + purgeRate);
			lastPurgeCount = numPurges;
			numPurges = 0;
			numSkips = 0;
		}
		return;
	}

	const apiURL = opts.html1.url.replace(/\/wiki\/.*/, '/w/api.php'); // HARDCODED!
	// console.log("Purging .. " + apiURL + " title: " + opts.title);
	return request({
		uri: apiURL,
		form: {
			action: 'purge',
			format: 'json',
			titles: opts.title,
			redirects: true,
		},
		method: 'POST'
	}).spread(function(res, bodyStr) {
		// console.log("got res: " + res.statusCode);
		// console.log("body: " + bodyStr);
		const body = JSON.parse(bodyStr);
		if (body.warnings && body.warnings.purge) {
			if (lastPurgeCount > numPurges) {
				purgeRate = purgeRate * 0.5;
			} else {
				purgeRate = purgeRate * 0.75;
			}
			console.log('RATE-LIMIT: Backing off! #skips = ' + numSkips + '; # purges=' + numPurges + '; previously: ' + lastPurgeCount + '; purgeRate:' + purgeRate);
			lastPurgeCount = numPurges;
			numPurges = 0;
			numSkips = 0;
		} else {
			numPurges++;
		}
	}).catch(function(error) { /* suppress errors */
		console.log(error);
	});
}

module.exports = {
	purgeCache: purgeCache,
};
