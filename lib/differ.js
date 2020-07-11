'use strict';

const phantom = require('phantom');
const fs = require('fs');
const yaml = require('js-yaml');
const Util = require('./differ.utils.js').Util;
const child_process = require('child_process');
const Promise = require('prfun/wrap')(require('babybird'));

// Export the differ module
const VisualDiffer = {};
if ( typeof module === 'object' ) {
	module.exports.VisualDiffer = VisualDiffer;
}

function testCompletion(browser, opts) {
	const html1 = opts.html1;
	const html2 = opts.html2;
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

VisualDiffer.takeScreenShot = async function(browser, logger, opts, htmlOpts) {
	// Init
	htmlOpts.err = null;
	htmlOpts.done = false;
	if (!htmlOpts.url) {
		throw('Missing page url for ' + htmlOpts.name);
	}

	// Read custom CSS for this screenshot, if provided.
	if (htmlOpts.stylesYamlFile) {
		const customStyles = yaml.safeLoad(fs.readFileSync(htmlOpts.stylesYamlFile, 'utf-8'));
		const commonStyles = customStyles.all || '';
		// db-style prefix (enwiki) or domain-style prefix (en.wikipedia.org) - accept both for now.
		// However, styles are only keyed by domain-style prefixes.
		const wikiStyles = customStyles[opts.wiki] || customStyles[Util.getWikiDomain(opts.wiki)];
		htmlOpts.customCSS = commonStyles + wikiStyles;
	}

	opts.scriptDir = __dirname;
	const page = await browser.createPage();

	// Trap errors and log them
	page.property('onError', function(msg, trace) {
		// Ignore known errors
		if (!/leftTab.getBoundingClientRect|evaluating 'defaultUri/.test(msg)) {
			console.log("MSG: " + msg + "; TRACE: " + JSON.stringify(trace));
		}
	});

	// Set viewport and then open the page
	page.property('viewportSize', {
		width: opts.viewportWidth,
		height: opts.viewportHeight,
	});

	logger(htmlOpts.name + ' viewport set to: ' + opts.viewportWidth + 'x' + opts.viewportHeight);
	const status = await page.open(htmlOpts.url);

	if (status !== 'success') {
		htmlOpts.err = 'Could not open page ' + htmlOpts.url + '. Got result ' + status;
		return testCompletion(browser, opts);
	}

	await Promise.delay(opts.screenShotDelay * 1000);
	if (htmlOpts.injectJQuery) {
		await page.injectJs(opts.scriptDir +'/jquery.js');
	}

	await page.evaluate(function() {
		// Fallback if nothing to inject or injection fails
		window.postprocessDOM = function() {};
		window.dumpHTML = function() { return ''; };
	})

	// HTML & CSS dumper script
	await page.injectJs(opts.scriptDir + '/dumper.js');

	// DOM post-processing script
	if (htmlOpts.postprocessorScript) {
		await page.injectJs(htmlOpts.postprocessorScript);
	}

	// In the page context, run the above scripts.
	const result = await page.evaluate(function(opts, htmlOpts) {
		const ret = postprocessDOM(htmlOpts.customCSS);
		if (ret) {
			return ret;
		}
		return dumpHTML(htmlOpts);
	}, opts, htmlOpts);

	if (result === 'PP_FAILED') {
		htmlOpts.err = htmlOpts.name + ' - postprocessing failed! Retrying.';
		return testCompletion(browser, opts);
	} else if (result === 'REDIRECT') {
		htmlOpts.err = htmlOpts.name + ' screenshot is a redirect! No diffs.';
		return testCompletion(browser, opts);
	}

	if (htmlOpts.dumpHTML) {
		const prefix = opts.filePrefix;
		const dir    = (opts.outdir || './' + opts.wiki + '/').replace(/\/$/, '') + '/';
		fs.writeFileSync(dir + prefix + '.' + htmlOpts.name + '.html', result);
	}

	// Wait 1sec for CSS and scripts to run before rendering
	await Promise.delay(1000);
	await page.render(htmlOpts.screenShot);

	logger(htmlOpts.name + ' done!');
	htmlOpts.done = true;
	return testCompletion(browser, opts);
};

VisualDiffer.takeScreenshots = async function(opts, logger) {
	// Phantom doesn't like protocols in its proxy ips
	// But, node.js request wants http:// proxies ... so dance around all that.
	const proxy = (process.env.HTTP_PROXY_AND_PORT || '').replace(/^https?:\/\//, '');
	const phantomOpts = [
		'--proxy=' + proxy,
		'--debug=false',
		// Jul 10: This option causes loading from wikipedias to fail
		// '--ssl-protocol=TLSv1',
		'--ignore-ssl-errors=true',
		// This lets us freeze animated gifs without
		// worrying about CORS issues
		'--web-security=no'
	];

	const browser = await phantom.create(phantomOpts, { phantomPath: opts.phantomPath });
	await this.takeScreenShot(browser, logger, opts, opts.html1); // HTML1 screenshot
	await this.takeScreenShot(browser, logger, opts, opts.html2); // HTML2 screenshot
};

VisualDiffer.genVisualDiff = async function(opts, logger) {
	if (opts.preLoadHandler) {
		await opts.preLoadHandler(opts);
	}
	await VisualDiffer.takeScreenshots(opts, logger);
	if (logger) {
		logger('--screenshotting done--');
	}

	// Delay diffing by 1 sec to make sure screenshots are saved
	// There have been scenarios where the screenshot is in the
	// process of being saved and uprightdiff fails as a result.
	await Promise.delay(opts.diffDelay || 1000);

	if (opts.diffEngine === "uprightdiff") {
		return await VisualDiffer.compareWithUprightDiff(opts, logger);
	} else {
		throw("Unsupported diffing algo");
	}

	if (opts.postRenderHandler) {
		await opts.postRenderHandler(opts);
	}

	return data;
};

VisualDiffer.compareWithUprightDiff = async function(opts, logger) {
	let maxRuntime;
	if (opts.testTimeout) {
		// 1 min. less than total timeout
		maxRuntime = opts.testTimeout - 60*1000;
		if (maxRuntime < 0) {
			maxRuntime = undefined;
		}
	}

	try {
		const uprightDiff = Promise.promisify(child_process.execFile, ["stdout", "stderr", "error"]);
		const ret = await uprightDiff((opts.uprightDiffSettings && opts.uprightDiffSettings.binary) || '/usr/local/bin/uprightdiff',
			[
				'--format=json',
				opts.html1.screenShot, opts.html2.screenShot, opts.diffFile
			],
			{ timeout: maxRuntime } // Kill the diff if it runs longer than this time
		);

		// Weird: Change this legacy fails/skip business to better names
		const out = {};
		const data = JSON.parse(ret.stdout);
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
	} catch(err) {
		logger("UprightDiff exited with error: " + JSON.stringify(err));
		throw(err);
	}
};
