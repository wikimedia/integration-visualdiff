'use strict';

var Util = require('../lib/differ.utils.js').Util;
var VisualDiffer = require('../lib/differ.js').VisualDiffer;
var Promise = require('prfun/wrap')(require('babybird'));
var request = require('request');

function retryingHTTPRequest(retries, requestOptions, cb) {
	var delay = 100; // start with 100ms
	var errHandler = function (error, response, body) {
		if (error) {
			if (retries--) {
				console.error('HTTP ' + requestOptions.method + ' to \n' +
					(requestOptions.uri || requestOptions.url) + ' failed: ' + error +
					'\nRetrying in ' + (delay / 1000) + ' seconds.');
				setTimeout(function() { request(requestOptions, errHandler); }, delay);
				// exponential back-off
				delay = delay * 2;
				return;
			}
		}
		cb(error, response, body);
	};
	request(requestOptions, errHandler);
}

function generateVisualDiff(opts, test) {
	return new Promise(function(resolve, reject) {
		try {
			// Make a copy since we are going to modify it
			opts = Util.clone(opts);
			opts.wiki = test.prefix;
			opts.title = test.title;
			opts.jsonFormat = true;
			opts.discardDiff = false;
			opts = Util.getNonCLIOpts(opts);

			var pidPrefix = '[' + process.pid + ']: ';
			var logger = opts.quiet ? function(){} : function(msg) { console.log(pidPrefix + msg); };
			logger('Diffing ' + test.prefix + ':' + test.title);
			return VisualDiffer.genVisualDiff(opts, logger).then(function(diffData) {
				logger('DIFF: ' + JSON.stringify(diffData));
				resolve(diffData);
			}).catch(function(err) {
				console.error(pidPrefix + 'ERROR for ' + test.prefix + ':' + test.title + ': ' + err);
				reject(err);
			});
		} catch (err) {
			console.error(pidPrefix + 'ERROR in ' + test.prefix + ':' + test.title + ': ' + err);
			console.error(pidPrefix + 'stack trace: ' + err.stack);
			reject(err);
		}
	});
}

function gitCommitFetch(opts) {
	// Make a copy since we are going to modify it
	opts = Util.clone(opts);
	var parsoidServer = Util.getNonCLIOpts(opts).html2.server;
	var requestOptions = {
		uri: parsoidServer + '_version',
		proxy: process.env.HTTP_PROXY_AND_PORT || '',
		method: 'GET'
	};

	return new Promise(function(resolve, reject) {
		retryingHTTPRequest(10, requestOptions, function(error, response, body) {
			var err;
			if (error || !response) {
				err = 'Error could not find the current commit from ' + parsoidServer;
				console.error(err);
				reject(err);
			} else if (response.statusCode === 200) {
				try {
					var resp = JSON.parse(body);
					var lastCommit = resp.sha;
					var lastCommitTime = (new Date()).toISOString();
					resolve([lastCommit, lastCommitTime]);
				} catch (e) {
					err = 'Got response: ' + body + ' from ' + requestOptions.uri;
					err = err + '\nError extracing commit SHA from it: ' + e;
					console.error(err);
					reject(err);
				}
			} else {
				err = requestOptions.uri + ' responded with a HTTP status ' + response.statusCode;
				console.error(err);
				reject(err);
			}
		});
	});
}

if (typeof module === 'object') {
	module.exports.gitCommitFetch = gitCommitFetch;
	module.exports.generateVisualDiff = generateVisualDiff;
}
