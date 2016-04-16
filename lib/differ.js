'use strict';

var phantom = require('phantom');
var fs = require('fs');
var yaml = require('js-yaml');
var Util = require('./differ.utils.js').Util;
var child_process = require('child_process');

// Export the differ module
var VisualDiffer = {};
if ( typeof module === 'object' ) {
	module.exports.VisualDiffer = VisualDiffer;
}

function testCompletion(browser, cb, opts) {
	var html1 = opts.html1;
	var html2 = opts.html2;
	if (html1.err || html2.err) {
		browser.exit();
		cb(html1.err || html2.err);
	} else if (html1.done && html2.done) {
		browser.exit();
		cb();
	} else {
		cb();
	}
}

VisualDiffer.takeScreenShot = function(browser, logger, cb, opts, htmlOpts) {
	// Read custom CSS for this screenshot, if provided.
	if (htmlOpts.stylesYamlFile) {
		var customStyles = yaml.safeLoad(fs.readFileSync(htmlOpts.stylesYamlFile)[0]);
		htmlOpts.customCSS = customStyles[opts.wiki];
	}

	opts.scriptDir = __dirname;
	browser.createPage(function (page) {
		page.set('viewportSize', { width: opts.viewportWidth, height: opts.viewportHeight }, function (result) {
			//logger(htmlOpts.name + ' viewport set to: ' + result.width + 'x' + result.height);
		});

		page.set('onConsoleMessage', function(msg) {
			console.log('console-log-from-' + htmlOpts.name + ':' + msg);
		});

		page.open(htmlOpts.url, function (status) {
			if (status !== 'success') {
				htmlOpts.err = 'Could not open page ' + htmlOpts.url + '. Got result ' + status;
				testCompletion(browser, cb, opts);
				return;
			}

			var processPage = function() {
				page.evaluate(function() {
					// Fallback if nothing to inject or injection fails
					window.postprocessDOM = function() {};
					window.dumpHTML = function() { return ''; };
				});

				// HTML & CSS dumper script
				page.injectJs(opts.scriptDir + '/dumper.js');
				// DOM post-processing script
				if (htmlOpts.postprocessorScript) {
					page.injectJs(htmlOpts.postprocessorScript);
				}

				// In the page context, run the above scripts
				// and save the screenshot
				page.evaluate(
					function(opts, htmlOpts) {
						var ret = postprocessDOM(htmlOpts.customCSS);
						if (ret) {
							return ret;
						}
						return dumpHTML(htmlOpts);
					}, function(result) {
						if (result === 'REDIRECT') {
							htmlOpts.err = htmlOpts.name + ' screenshot is a redirect! No diffs.';
							testCompletion(browser, cb, opts);
							return;
						}

						if (htmlOpts.dumpHTML) {
							var prefix = opts.filePrefix;
							var dir    = (opts.outdir || './' + opts.wiki + '/').replace(/\/$/, '') + '/';
							fs.writeFileSync(dir + prefix + '.' + htmlOpts.name + '.html', result);
						}

						// Save the screenshot
						console.log("Rendering", htmlOpts.screenShot);
						page.render(htmlOpts.screenShot, function() {
							logger(htmlOpts.name + ' done!');
							htmlOpts.done = true;
							testCompletion(browser, cb, opts);
						});
					},
					opts,
					htmlOpts
				);
			};

			setTimeout(
				function() {
					if (htmlOpts.injectJQuery) {
						page.includeJs('http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js', processPage);
					} else {
						processPage();
					}
				},
				opts.screenShotDelay * 1000
			);

		});
	});
};

VisualDiffer.takeScreenshots = function(opts, logger, cb) {
	var html1 = opts.html1;
	html1.err = null;
	html1.done = false;
	if (!html1.url) {
		cb('Missing page url for ' + html1.name);
		return;
	}

	var html2 = opts.html2;
	html2.err = null;
	html2.done = false;
	if (!html2.url) {
		cb('Missing page url for ' + html2.name);
		return;
	}

	var self = this;

	// phantom talks with phantomjs by starting a http server
	// In order to ensure that all testreduce clients don't start
	// this http server on the same port (which seems to be happening,
	// oddly enough despite phantom asking the OS for a free port),
	// assign a random port. Looks like we get an undefined browser
	// object if that fails.
	var phantomOpts;
	if (opts.assignRandomPort) { // default: false
		var minPort = opts.minPort || 37370; // default: 37370
		var range = opts.maxPort ? opts.maxPort - opts.minPort : 500; // default: 500
		phantomOpts = { port: minPort + Math.round(Math.random() * range), };
	}

	// Phantom doesn't like protocols in its proxy ips
	// But, node.js request wants http:// proxies ... so dance around all that.
	var proxy = (process.env.HTTP_PROXY_IP_AND_PORT || '').replace(/^https?:\/\//, '');
	phantom.create('--debug=false', '--ssl-protocol=TLSv1', '--proxy=' + proxy, function (browser) {
		if (!browser) {
			cb('Port conflict starting phantomjs. Retrying!');
			return;
		}

		function ss1(cb1) {
			// HTML1 screenshot
			self.takeScreenShot(browser, logger, cb1, opts, opts.html1);
		}

		function ss2() {
			// HTML2 screenshot
			self.takeScreenShot(browser, logger, cb, opts, opts.html2);
		}
		ss1(ss2);
	}, phantomOpts);
};

VisualDiffer.genVisualDiff = function(opts, logger, cb) {
	this.takeScreenshots(opts, logger, function(err) {
		if (err) {
			logger(err);
			cb(err, null);
		} else {
			if (logger) {
				logger('--screenshotting done--');
			}

			// Delay diffing by 1.5 sec to make sure screenshots are saved
			// There have been scenarios where the screenshot is in the
			// process of being saved and uprightdiff fails as a result.
			setTimeout(function() {
				if (opts.diffEngine === "uprightdiff") {
					VisualDiffer.compareWithUprightDiff(opts, logger, cb);
				} else {
					VisualDiffer.compareWithResemble(opts, logger, cb);
				}
			}, opts.diffDelay || 1500);
		}
	});
};

VisualDiffer.compareWithResemble = function(opts, logger, cb) {
	var resemble = require('resemble').resemble;
	if (opts.outputSettings) {
		resemble.outputSettings(opts.outputSettings);
	}

	resemble(opts.html1.screenShot).compareTo(opts.html2.screenShot).
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
				cb(null, out);
			} else {
				cb(null, data);
			}
		});
};

VisualDiffer.compareWithUprightDiff = function(opts, logger, cb) {
	child_process.execFile('/usr/local/bin/uprightdiff',
		[
			'--format=json',
			opts.html1.screenShot, opts.html2.screenShot, opts.diffFile
		],
		function (error, stdout, stderr) {
			if (error && error.code !== 0) {
				error.stderr = stderr;
				logger("UprightDiff exited with error: " + JSON.stringify(error));
				cb(error, null);
			} else {
				if (opts.jsonFormat) {
					var out = {};
					var data = JSON.parse(stdout);
					// Weird: Change this legacy fails/skip business to better names
					out.fails = Math.round(100 * data.residualArea / data.totalArea);
					out.skips = Math.round(100 * data.movedArea / data.totalArea);
					out.raw = stdout;
					cb(null, out);
				} else {
					cb(null, stdout);
				}
			}
		}
	);
};
