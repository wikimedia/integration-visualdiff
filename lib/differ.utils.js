"use strict";

const fs = require('fs');
const path = require('path');
const yargs = require('yargs');
const Promise = require('prfun/wrap')(require('babybird'));
const request = Promise.promisify(require('request'), true);

// The util object that will be exported out
var Util = {};
if (typeof module === "object") {
	module.exports.Util = Util;
}

// This functionality copied from parsoid/lib/mediawiki.ParsoidConfig.js
var wikiBaseUrl = {};
// This list includes closed down wikis, and some variant prefixes (but looks like not all)
var wikipedias = "aa|ab|ace|ady|af|ak|als|alt|am|ami|an|ang|anp|ar|arc|ary|arz|as|ast|atj|av|avk|awa|ay|az|azb|ba|ban|bar|bat-smg|bbc|bcl|be|be-tarask|bew|be-x-old|bg|bh|bi|bjn|blk|bm|bn|bo|bpy|br|bs|bt|btm|bug|bxr|ca|cbk-zam|cdo|ce|ceb|ch|cho|chr|chy|ckb|ckb-zam|co|cr|crh|cs|csb|cu|cv|cy|da|dag|de|dga|din|diq|dsb|dtp|dty|dv|dz|ee|el|eml|en|eo|es|et|eu|ext|fa|fat|ff|fi|fiu-vro|fj|fo|fon|fr|frp|frr|fur|fy|ga|gag|gan|gcr|gd|gl|glk|gn|gom|gor|got|gpe|gsw|gu|guc|gur|guw|gv|ha|hak|haw|he|hi|hif|ho|hr|hsb|ht|hu|hy|hyw|hz|ia|id|ie|ig|igl|ii|ik|ilo|inh|io|is|it|iu|ja|jam|jbo|jv|ka|kaa|kab|kbd|kbp|kcg|kg|ki|kj|kk|kl|km|kn|ko|koi|kr|krc|ks|ksh|ku|kus|kv|kw|ky|la|lad|lb|lbe|lez|lfn|lg|li|lij|lld|lmo|ln|lo|lt|ltg|lv|lzh|mad|mai|map-bms|mdf|mg|mh|mhr|mi|min|mk|ml|mn|mni|mnw|mo|mr|mrj|ms|mt|mus|mwl|my|myv|mzn|na|nah|nan|nap|nds|nds-nl|ne|new|ng|nia|nl|nn|no|nov|nqo|nrm|nso|nv|ny|oc|olo|om|or|os|pa|pag|pam|pap|pcd|pcm|pdc|pfl|pi|pih|pl|pms|pnb|pnt|ps|pt|pwn|qu|rm|rmy|rn|ro|roa-rup|roa-tara|ru|rue|rup|rw|sa|sah|sat|sc|scn|sco|sd|se|sg|sgs|sh|shi|shn|shy|si|simple|sk|skr|sl|sm|smn|sn|so|sq|sr|srn|ss|st|stq|su|sv|sw|szl|szy|ta|tay|tcy|te|test|tet|tg|th|ti|tk|tl|tly|tn|to|tpi|tr|trv|ts|tt|tum|tw|ty|tyv|udm|ug|uk|ur|uz|ve|vec|vep|vi|vls|vo|vro|wa|war|wo|wuu|xal|xh|xmf|yi|yo|yue|za|zea|zgh|zh|zh-classical|zh-min-nan|zh-yue|zu";

wikipedias.split('|').forEach(function(lang) {
	// Wikipedia
	var dbLangPrefix = lang.replace(/-/g, '_');
	wikiBaseUrl[dbLangPrefix + 'wiki'] = 'https://' + lang +
			'.wikipedia.org/wiki/';

	// Wiktionary
	wikiBaseUrl[dbLangPrefix + 'wiktionary'] = 'https://' + lang +
			'.wiktionary.org/wiki/';

	// Wikivoyage, Wikibooks, Wikisource, Wikinews, Wikiquote & Wikiversity
	// all follow the same pattern
	['voyage', 'books', 'source', 'news', 'quote', 'versity']
		.forEach(function(suffix) {
			wikiBaseUrl[dbLangPrefix + 'wiki' + suffix] = 'https://' +
				lang + '.wiki' + suffix + '.org/wiki/';
		});

	wikiBaseUrl.mediawikiwiki = 'https://www.mediawiki.org/wiki/';
	wikiBaseUrl.commonswiki = 'https://commons.wikimedia.org/wiki/';
	wikiBaseUrl.metawiki = 'https://meta.wikimedia.org/wiki/';
	wikiBaseUrl.foundationwiki = 'https://foundation.wikimedia.org/wiki/';
	wikiBaseUrl.labswiki = 'https://wikitech.wikimedia.org/wiki/';
	wikiBaseUrl.incubatorwiki = 'https://incubator.wikimedia.org/wiki/';
});

Util.getWikiDomain = function(wiki) {
	return (this.getWikiBaseURL(wiki) || '').replace(/https?:\/\/(.*)\/wiki\//, '$1');
};

Util.getWikiBaseURL = function(wiki) {
	return wikiBaseUrl[wiki.replace(/-/g, '_')];
};

var standardOpts = {
	'help': {
		description: 'Show this help message',
		'boolean': true,
		'default': false,
		alias: 'h'
	},
	'wiki': {
		description: 'Which wiki prefix to use; e.g. "enwiki" for English wikipedia, "eswiki" for Spanish, "mediawikiwiki" for mediawiki.org',
		'boolean': false,
		'default': 'enwiki'
	},
	'title': {
		description: 'Which page title to use?',
		'boolean': false,
		'default': 'Main_Page'
	},
	'outdir': {
		description: 'Where to dump output? (default: ./)',
		'boolean': false,
		'default': null,
	},
	'config': {
		description: 'File to read configuration from (matching args on CLI override settings from the file)',
		'boolean': false,
		'default': null,
	},
	'filePrefix': {
		description: 'Prefix of files to output screenshots to? (default: <title>.<name1>.png and <title>.<name2>.png)',
		'boolean': false,
		'default': null,
	},
};


function md5Hash(str) {
	var md5 = require('crypto').createHash('MD5');
	md5.update(str);
	return md5.digest('hex');
}

// Make sure file names are valid (only allowed chars + not too long) as well as unique
function constructValidFilename(str) {
	// Make sure file names are valid, not too long, and unique
	var fileName = str.replace(/[^0-9A-Za-z#%,_\-.\x80-\uD7FF\uF900-\uFFFF]+/g, function(c) { return encodeURI(c); })
		.replace(/\//, '%2F');
	var byteLength = Buffer.byteLength(fileName, 'utf8');
	// 15 byte breathing room for suffix like ".base.png", etc.
	if (/[^a-zA-Z 0-9_=~'":;,@!^&%#()*\-+.|$]/.test(fileName) || byteLength > 240) {
		fileName = md5Hash(fileName);
	}
	return fileName;
}

// Copied from parsoid/lib/mediawiki.Util.js
/**
 * @method
 *
 * Update only those properties that are undefined or null in the target.
 *
 * @param {Object} tgt The object to modify.
 * @param {Object} subject The object to extend tgt with. Add more arguments to the function call to chain more extensions.
 * @return {Object} The modified object.
 */
Util.extendProps = function () {
	function internalExtend(target, obj) {
		var allKeys = [].concat(Object.keys(target), Object.keys(obj));
		for (var i = 0, numKeys = allKeys.length; i < numKeys; i++) {
			var k = allKeys[i];
			if (target[k] === undefined || target[k] === null) {
				target[k] = obj[k];
			}
		}
		return target;
	}

	var n = arguments.length;
	var tgt = arguments[0];
	for (var i = 1; i < n; i++) {
		internalExtend(tgt, arguments[i]);
	}
	return tgt;
};

var computeOpts = function(argv, opts) {
	// Initialize opts from a config file, if provided
	if (!opts) {
		if (argv.config) {
			var lsp = path.resolve(process.cwd(), argv.config);
			try {
				opts = require(lsp);
			} catch (e) {
				console.error(e);
				console.error(
					"Cannot load local settings from %s. Please see: %s",
					lsp, path.join(__dirname, "settings.js.example")
				);
				process.exit(1);
			}
		} else {
			opts = {};
		}
	}

	// Extend missing opts with CLI argv / default settings
	Util.extendProps(opts, argv);

	// Compute base file paths and output directories
	opts.filePrefix = opts.filePrefix || String(opts.title);
	opts.outdir = (opts.outdir || ".").replace(/\/$/, '');
	if (opts.wiki) {
		opts.outdir = opts.outdir + "/" + opts.wiki + "/";
	}

	fs.mkdirSync(opts.outdir, { recursive: true });

	var filePath = opts.outdir + constructValidFilename(opts.filePrefix);
	opts.diffFile = filePath + ".diff.png";

	// These computed properties are hardcoded for PHP parser API urls and output
	// These are updated only if not already set.
	if (!opts.html1.screenShot) {
		opts.html1.screenShot = filePath + '.' + opts.html1.name + '.png';
	}
	if (!opts.html1.server) {
		opts.html1.server = opts.html1Server || Util.getWikiBaseURL(opts.wiki); // Default to wikipedia server
	}
	opts.html1.server = (opts.html1.server || '').replace(/\/$/, '') + '/';
	if (!opts.html1.url && opts.html1.computeURL) {
		opts.html1.url = opts.html1.computeURL(opts.html1.server, opts.wiki, opts.title);
	}
	if (!opts.html1.hasOwnProperty('injectJQuery')) {
		opts.html1.injectJQuery = false; // PHP parser output loads jquery
	}

	// These computed properties are hardcoded for Parsoid API urls and output
	// These are updated only if not already set.
	if (!opts.html2.screenShot) {
		opts.html2.screenShot = filePath + '.' + opts.html2.name + '.png';
	}
	if (!opts.html2.server) {
		opts.html2.server = opts.html2Server || Util.getWikiBaseURL(opts.wiki); // Default to wikipedia server
	}
	opts.html2.server = (opts.html2.server || '').replace(/\/$/, '') + '/';
	if (!opts.html2.url && opts.html2.computeURL) {
		opts.html2.url = opts.html2.computeURL(opts.html2.server, opts.wiki, opts.title);
	}
	if (opts.html2.name === 'parsoid') {
		// FIXME: This is still weird but lets use these defaults in the common usecase.
		// Use hardcoded parsoid defaults only if the service name is parsoid
		if (!opts.html2.hasOwnProperty('injectJQuery')) {
			opts.html2.injectJQuery = true; // Parsoid output does not load jquery
		}
		if (!opts.html2.hasOwnProperty('stylesYamlFile')) {
			opts.html2.stylesYamlFile = __dirname + '/parsoid.custom_styles.yaml'; // Parsoid output does not load jquery
		}
	}

	// console.log("OPTS: " + JSON.stringify(opts, null, 2));

	return opts;
};

Util.getCLIOpts = function(customOpts) {
	var allOpts = Util.extendProps(customOpts || {}, standardOpts);
	var usageStr = 'Usage: node ' + process.argv[1] + ' [options]';
	var opts = yargs.usage(usageStr).options(allOpts);
	if (opts.argv.help) {
		opts.showHelp();
		return null;
	}

	return computeOpts(opts.argv);
};

Util.getNonCLIOpts = function(opts) {
	// Get defaults by passing in an empty argv to yargv
	var argv = yargs.options(standardOpts).parse([]);
	return computeOpts(argv, opts);
};

// deep clones by default.
Util.clone = function(obj, deepClone) {
	if (deepClone === undefined) {
		deepClone = true;
	}
	if (Array.isArray(obj)) {
		if (deepClone) {
			return obj.map(function(el) {
				return Util.clone(el, true);
			});
		} else {
			return obj.slice();
		}
	} else if (obj instanceof Object && // only "plain objects"
				Object.getPrototypeOf(obj) === Object.prototype) {
		/* This definition of "plain object" comes from jquery,
		 * via zepto.js.  But this is really a big hack; we should
		 * probably put a console.assert() here and more precisely
		 * delimit what we think is legit to clone. (Hint: not
		 * tokens or DOM trees.) */
		if (deepClone) {
			return Object.keys(obj).reduce(function(nobj, key) {
				nobj[key] = Util.clone(obj[key], true);
				return nobj;
			}, {});
		} else {
			return Object.assign({}, obj);
		}
	} else {
		return obj;
	}
};

Util.retryingHTTPRequest = function(retries, requestOptions, delay) {
	delay = delay || 100; // start with 100ms
	requestOptions.headers = requestOptions.headers || {};
	requestOptions.headers['User-Agent'] = requestOptions.headers['User-Agent'] || 'VisualDiffTester';
	return request(requestOptions)
	.catch(function(error) {
		if (retries--) {
			console.error('HTTP ' + requestOptions.method + ' to \n' +
				(requestOptions.uri || requestOptions.url) + ' failed: ' + error +
				'\nRetrying in ' + (delay / 1000) + ' seconds.');
			return Promise.delay(delay).then(function() {
				return Util.retryingHTTPRequest(retries, requestOptions, delay * 2);
			});
		} else {
			return Promise.reject(error);
		}
	})
	.spread(function(res, body) {
		if (res.statusCode !== 200) {
			let err = 'Got status code: ' +
				res.statusCode + ' for ' +
				(requestOptions.uri || requestOptions.urls);
			if (res.statusCode !== 404) {
				err += '; body: ' + body;
			}
			throw new Error(err);
		}
		return Array.from(arguments);
	});
};
