'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');
const yaml = require('js-yaml');
const Util = require('./differ.utils.js').Util;
const child_process = require('child_process');
const Promise = require('prfun/wrap')(require('babybird'));

class VisualDiffer {
	async takeScreenShot(browser, logger, opts, htmlOpts) {
		const vd = this;
		// logger(htmlOpts.name + ' starting!');

		// Init
		opts.scriptDir = __dirname;
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
			const wikiStyles = customStyles[opts.wiki] || customStyles[Util.getWikiDomain(opts.wiki)] || '';
			htmlOpts.customCSS = commonStyles + wikiStyles;
		}

		const page = await browser.newPage();
		await page.setBypassCSP(true); // Bypass CSP so we can inject JS and run it locally

		// logger(htmlOpts.name + ' new page created!');

		// Trap errors, console messages and log them
		page.on('pageerror', err => console.log("PageError: " + err.message));
		page.on('error', err => console.log("Error: " + err.message));
		// page.on('request', req => console.log("REQ: " + req.url()));
		// page.on('requestfinished', resp => console.log("response finished: " + resp.url()));
		// page.on('console', msg => console.log(msg.text()));
		// page.on('domcontentloaded', function() { console.log("--dcl--"); });
		// page.on('load', function() { console.log("--load--"); });

		try {
			// logger(htmlOpts.name + ' page loading!');
			// When puppeteer visits the page scroll to bottom and wait
			// until there is no network activity
			await page.goto(htmlOpts.url, {waitUntil: 'networkidle0'});
			await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
			await page.waitForNetworkIdle();
		} catch (error) {
			throw 'Could not open page ' + htmlOpts.url + '. Error: ' + JSON.stringify(error);
		}

		// await Promise.delay(opts.customDelay || 0);
		// logger(htmlOpts.name + ' goto done');

		await page.evaluate(function() {
			// Fallback if nothing to inject or injection fails
			window.postprocessDOM = function() {};
			window.dumpHTML = function() { return ''; };
		})
		const lang = opts.wiki.replace(/wik[it].*$/, '');
		if (htmlOpts.additionalStyleTags) {
			await Promise.all(htmlOpts.additionalStyleTags.map(function(s) {
				return page.addStyleTag({ url: s + "&lang=" + lang });
			}));
		}
		if (htmlOpts.injectJQuery) {
			await page.addScriptTag({ path: opts.scriptDir + '/jquery.js', type: 'text/javascript' });
		}
		if (htmlOpts.postprocessorScript) {
			await page.addScriptTag({ path: htmlOpts.postprocessorScript, type: 'text/javascript' });
		}
		if (htmlOpts.dumpHTML) {
			await page.addScriptTag({ path: opts.scriptDir + '/dumper.js', type: 'text/javascript' });
		}
		// logger(htmlOpts.name + ' injection done');

		// Since we injected additional resources *after* the page loaded,
		// we just wait some arbitrary time for it to complete before evaluating
		await Promise.delay(opts.postInjectionDelay || 0);

		// logger(htmlOpts.name + ' post processing!');
		const result = await page.evaluate(function(opts, htmlOpts) {
			const ret = postprocessDOM(htmlOpts.customCSS);
			if (ret) {
				return ret;
			}
			return dumpHTML(htmlOpts);
		}, opts, htmlOpts);

		// logger(htmlOpts.name + ' eval done');

		if (result === 'REDIRECT') {
			throw htmlOpts.name + ' screenshot is a redirect! No diffs.';
		}

		if (htmlOpts.dumpHTML) {
			const prefix = opts.filePrefix;
			const dir    = (opts.outdir || './' + opts.wiki + '/').replace(/\/$/, '') + '/';
			fs.writeFileSync(dir + prefix + '.' + htmlOpts.name + '.html', result);
		}

		// Since we might have exposed additional images and icons after
		// postprocessing, we wait for some arbitrary time for them to load
		await Promise.delay(opts.screenShotDelay || 0);

		// logger(htmlOpts.name + ' screen-shotting!');
		await page.screenshot({ path: htmlOpts.screenShot, fullPage: true });

		logger(htmlOpts.name + ' done!');
	}

	async takeScreenshots(opts, logger) {
		// Phantom doesn't like protocols in its proxy ips
		// But, node.js request wants http:// proxies ... so dance around all that.
		const proxy = (process.env.HTTP_PROXY_AND_PORT || '').replace(/^https?:\/\//, '');
		const sandboxOpts = opts.noSandBox ? [ '--no-sandbox' ] : [];
		const puppeteerOpts = {
			headless: opts.headless || true,
			slowMo: opts.slowMo || 0,
			ignoreHTTPSErrors: true,
			defaultViewport: {
				width: opts.viewportWidth,
				height: opts.viewportHeight,
			},
			// Chromium opts
			args: sandboxOpts.concat([
				'--proxy-server=' + proxy,
				'--wm-window-animations-disabled'
			]),
		};

		const browser = await puppeteer.launch(puppeteerOpts);
		// logger('Viewport set to: ' + opts.viewportWidth + 'x' + opts.viewportHeight);
		try {
			await this.takeScreenShot(browser, logger, opts, opts.html1); // HTML1 screenshot
			await this.takeScreenShot(browser, logger, opts, opts.html2); // HTML2 screenshot
		} finally {
			await browser.close();
		}
	}

	async genVisualDiff(opts, logger) {
		let data = null;
		if (opts.preLoadHandler) {
			if (Array.isArray(opts.preLoadHandler)) {
				await Promise.reduce(opts.preLoadHandler, function(all, h) {
					return h(opts);
				}, null)
			} else {
				await opts.preLoadHandler(opts);
			}
		}
		await this.takeScreenshots(opts, logger);
		if (logger) {
			logger('--screenshotting done--');
		}

		if (opts.diffEngine === "uprightdiff") {
			data = await this.compareWithUprightDiff(opts, logger);
		} else {
			throw("Unsupported diffing algo");
		}

		if (opts.postRenderHandler) {
			if (Array.isArray(opts.postRenderHandler)) {
				opts.postRenderHandler.forEach(async function(h) { await h(opts); });
			} else {
				await opts.postRenderHandler(opts);
			}
		}

		return data;
	}

	async compareWithUprightDiff(opts, logger) {
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

			// Uprightdiff sometimes crashes with the default block size.
			// Retry with a smaller block size to see if that helps.
			let retries = 1;
			let ret = null;
			let diffOpts = [ '--format=json', opts.html1.screenShot, opts.html2.screenShot, opts.diffFile ];
			while (true) {
				try {
					ret = await uprightDiff(
						process.env.UPRIGHTDIFF || (opts.uprightDiffSettings && opts.uprightDiffSettings.binary) || '/usr/local/bin/uprightdiff',
						diffOpts,
						{ timeout: maxRuntime } // Kill the diff if it runs longer than this time
					);
					break;
				} catch (err) {
					if ( retries === 0 ) {
						break;
					}
					retries--;
					diffOpts.push( '--block-size' );
					diffOpts.push( '8' );
				}
			}

			// Weird: Change this legacy fails/skip business to better names
			const out = {};
			const data = JSON.parse(ret.stdout);
			// Weight fails by (a) ratio of changed pixels (b) size of residual area
			// Flag pages with larger residual areas over smaller residual areas
			out.fails = Math.round(0.75 * 100 * data.residualArea / data.totalArea + 0.25 * Math.min(Math.max(Math.pow(2, data.residualArea / 100000) - 1, 0), 100));
			const diffPerc = 0.5 * 100 * data.modifiedArea / data.totalArea + 0.5 * 100 * data.movedArea / data.totalArea;
			out.skips = Math.round(diffPerc);

			// If there is at least one differing pixel, make sure to set skips to 1 at least!
			// We don't want to report pixel-perfect rendering because of rounding.
			// TWEAK: Flag only if there is no moved content, and the modified area is > 0.01%
			// So, 99.99% and higher fidelity is treated as pixel-perfect
			if (out.fails === 0 && out.skips === 0 && data.modifiedArea > 0 && (data.movedArea > 0 || diffPerc > 0.005)) {
				out.skips = 1;
			}
			out.raw = data;
			return opts.jsonFormat ? out : JSON.stringify(out);
		} catch(err) {
			logger("UprightDiff exited with error: " + JSON.stringify(err));
			throw(err);
		}
	}
}

if ( typeof module === 'object' ) {
	module.exports.VisualDiffer = VisualDiffer;
}
