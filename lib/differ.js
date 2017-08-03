'use strict';

var phantom = require('phantom');
var fs = require('fs');
var yaml = require('js-yaml');
var Util = require('./differ.utils.js').Util;
var child_process = require('child_process');
var Promise = require('prfun/wrap')(require('babybird'));

// Export the differ module
var VisualDiffer = {};
if ( typeof module === 'object' ) {
	module.exports.VisualDiffer = VisualDiffer;
}

function testCompletion(browser, opts) {
	var html1 = opts.html1;
	var html2 = opts.html2;
	if (html1.err || html2.err) {
		browser.exit();
		throw(html1.err || html2.err);
	} else if (html1.done && html2.done) {
		browser.exit();
		return;
	} else {
		return;
	}
}

VisualDiffer.takeScreenShot = function(browser, logger, opts, htmlOpts) {
	// Init
	htmlOpts.err = null;
	htmlOpts.done = false;
	if (!htmlOpts.url) {
		throw('Missing page url for ' + htmlOpts.name);
	}

	// Read custom CSS for this screenshot, if provided.
	if (htmlOpts.stylesYamlFile) {
		var customStyles = yaml.safeLoad(fs.readFileSync(htmlOpts.stylesYamlFile, 'utf-8'));
		var commonStyles = customStyles.all || '';
		// db-style prefix (enwiki) or domain-style prefix (en.wikipedia.org) - accept both for now.
		// However, styles are only keyed by domain-style prefixes.
		var wikiStyles = customStyles[opts.wiki] || customStyles[Util.getWikiDomain(opts.wiki)];
		htmlOpts.customCSS = commonStyles + wikiStyles;
	}

	opts.scriptDir = __dirname;
	return browser.createPage().then(function (page) {
		// Trap errors and log them
		page.property('onError', function(msg, trace) {
			// Ignore known errors
			if (!/leftTab.getBoundingClientRect/.test(msg)) {
				console.log("MSG: " + msg + "; TRACE: " + JSON.stringify(trace));
			}
		});

		// Set viewport and then open the page
		return page.property('viewportSize', {
			width: opts.viewportWidth,
			height: opts.viewportHeight,
		}).then(function () {
			logger(htmlOpts.name + ' viewport set to: ' + opts.viewportWidth + 'x' + opts.viewportHeight);
			return page.open(htmlOpts.url).then(function (status) {
				if (status !== 'success') {
					htmlOpts.err = 'Could not open page ' + htmlOpts.url + '. Got result ' + status;
					return testCompletion(browser, opts);
				}

				var processPage = function() {
					return page.evaluate(function() {
						// Fallback if nothing to inject or injection fails
						window.postprocessDOM = function() {};
						window.dumpHTML = function() { return ''; };
					}).then(function() {
						// HTML & CSS dumper script
						return page.injectJs(opts.scriptDir + '/dumper.js').then(function() {
							// DOM post-processing script
							if (htmlOpts.postprocessorScript) {
								return page.injectJs(htmlOpts.postprocessorScript);
							}
						});
					}).then(function() {
						// In the page context, run the above scripts.
						return page.evaluate(function(opts, htmlOpts) {
								var ret = postprocessDOM(htmlOpts.customCSS);
								if (ret) {
									return ret;
								}
								return dumpHTML(htmlOpts);
							},
							opts, htmlOpts);
					}).then(function(result) {
						if (result === 'PP_FAILED') {
							htmlOpts.err = htmlOpts.name + ' - postprocessing failed! Retrying.';
							return testCompletion(browser, opts);
						} else if (result === 'REDIRECT') {
							htmlOpts.err = htmlOpts.name + ' screenshot is a redirect! No diffs.';
							return testCompletion(browser, opts);
						}

						if (htmlOpts.dumpHTML) {
							var prefix = opts.filePrefix;
							var dir    = (opts.outdir || './' + opts.wiki + '/').replace(/\/$/, '') + '/';
							fs.writeFileSync(dir + prefix + '.' + htmlOpts.name + '.html', result);
						}

						// Wait 1sec for CSS and scripts to run before rendering
						return Promise.delay(1000).then(function() {
							return page.render(htmlOpts.screenShot).then(function() {
								logger(htmlOpts.name + ' done!');
								htmlOpts.done = true;
								return testCompletion(browser, opts);
							});
						});
					});
				};

				return Promise.delay(opts.screenShotDelay * 1000).then(function() {
					if (htmlOpts.injectJQuery) {
						return page.injectJs(opts.scriptDir +'/jquery.js').then(function() { return processPage() });
					} else {
						return processPage();
					}
				});
			});
		});
	});
};

VisualDiffer.takeScreenshots = function(opts, logger) {
	// Phantom doesn't like protocols in its proxy ips
	// But, node.js request wants http:// proxies ... so dance around all that.
	var proxy = (process.env.HTTP_PROXY_AND_PORT || '').replace(/^https?:\/\//, '');
	var phantomOpts = [
		'--proxy=' + proxy,
		'--debug=false',
		'--ssl-protocol=TLSv1',
		'--ignore-ssl-errors=true',
		// This lets us freeze animated gifs without
		// worrying about CORS issues
		'--web-security=no'
	];

	var self = this;
	return phantom.create(phantomOpts, { phantomPath: opts.phantomPath }).then(function(browser) {
		// HTML1 screenshot
		return self.takeScreenShot(browser, logger, opts, opts.html1).then(function() {
			// HTML2 screenshot
			return self.takeScreenShot(browser, logger, opts, opts.html2);
		});
	});
};

VisualDiffer.genVisualDiff = function(opts, logger) {
	var p = opts.preLoadHandler ? opts.preLoadHandler(opts) : Promise.resolve();
	return p.then(function() {
		return VisualDiffer.takeScreenshots(opts, logger);
	}).then(function() {
		if (logger) {
			logger('--screenshotting done--');
		}

		// Delay diffing by 1 sec to make sure screenshots are saved
		// There have been scenarios where the screenshot is in the
		// process of being saved and uprightdiff fails as a result.
		return Promise.delay(opts.diffDelay || 1000).then(function() {
			if (opts.diffEngine === "uprightdiff") {
				return VisualDiffer.compareWithUprightDiff(opts, logger);
			} else {
				return VisualDiffer.compareWithResemble(opts, logger);
			}
		});
	}).then(function(data) {
		if (opts.postRenderHandler) {
			opts.postRenderHandler(opts);
		}
		return data;
	});
};

VisualDiffer.compareWithResemble = function(opts, logger) {
	var resemble = require('resemble').resemble;
	if (opts.outputSettings) {
		resemble.outputSettings(opts.outputSettings);
	}

	return resemble(opts.html1.screenShot).compareTo(opts.html2.screenShot).
		ignoreAntialiasing(). // <-- muy importante
		onComplete(function(data){
			if (!opts.discardDiff) {
				var png_data = data.getImageDataUrl("").replace(/^data:image\/png;base64,/, '');
				var png_buffer = new Buffer(png_data, 'base64');
				fs.writeFileSync(opts.diffFile, png_buffer);
			}

			if (opts.jsonFormat) {
				var out = {};
				// Weird: Change this legacy fails/skip business to better names
				out.fails = Math.floor(data.misMatchPercentage);
				out.skips = Math.round((data.misMatchPercentage - out.fails) * 100);
				out.time = data.analysisTime;
				return Promise.resolve(out);
			} else {
				return Promise.resolve(data);
			}
		});
};

VisualDiffer.compareWithUprightDiff = function(opts, logger) {
	var maxRuntime;
	if (opts.testTimeout) {
		// 1 min. less than total timeout
		maxRuntime = opts.testTimeout - 60*1000;
		if (maxRuntime < 0) {
			maxRuntime = undefined;
		}
	}

	return Promise.resolve().then(function() {
		var uprightDiff = Promise.promisify(child_process.execFile, ["stdout", "stderr", "error"]);
		return uprightDiff((opts.uprightDiffSettings && opts.uprightDiffSettings.binary) || '/usr/local/bin/uprightdiff',
			[
				'--format=json',
				opts.html1.screenShot, opts.html2.screenShot, opts.diffFile
			],
			{ timeout: maxRuntime } // Kill the diff if it runs longer than this time
		).then(function (ret) {
			// Weird: Change this legacy fails/skip business to better names
			var out = {};
			var data = JSON.parse(ret.stdout);
			// Weight fails by (a) ratio of changed pixels (b) size of residual area
			// Flag pages with larger residual areas over smaller residual areas
			out.fails = Math.round(0.75 * 100 * data.residualArea / data.totalArea + 0.25 * Math.min(Math.max(Math.pow(2, data.residualArea / 100000) - 1, 0), 100));
			out.skips = Math.round(0.5 * 100 * data.modifiedArea / data.totalArea + 0.5 * 100 * data.movedArea / data.totalArea);

			// If there is at least one differing pixel, make sure to set skips to 1 at least!
			// We don't want to report pixel-perfect rendering because of rounding.
			if (data.modifiedArea > 0 && out.fails === 0 && out.skips === 0) {
				out.skips = 1;
			}
			out.raw = data;
			return opts.jsonFormat ? out : JSON.stringify(out);
		}).catch(function(err) {
			logger("UprightDiff exited with error: " + JSON.stringify(err));
			throw(err);
		});
	});
};
