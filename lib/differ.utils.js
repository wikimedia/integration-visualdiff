"use strict";

var path = require('path');
var yargs = require('yargs');

// The util object that will be exported out
var Util = {};
if (typeof module === "object") {
	module.exports.Util = Util;
}

// This functionality copied from parsoid/lib/mediawiki.ParsoidConfig.js
var wikiBaseUrl = {};
var wikipedias = "en|de|fr|nl|it|pl|es|ru|ja|pt|zh|sv|vi|uk|ca|no|fi|cs|hu|ko|fa|id|tr|ro|ar|sk|eo|da|sr|lt|ms|eu|he|sl|bg|kk|vo|war|hr|hi|et|az|gl|simple|nn|la|th|el|new|roa-rup|oc|sh|ka|mk|tl|ht|pms|te|ta|be-x-old|ceb|br|be|lv|sq|jv|mg|cy|lb|mr|is|bs|yo|an|hy|fy|bpy|lmo|pnb|ml|sw|bn|io|af|gu|zh-yue|ne|nds|ku|ast|ur|scn|su|qu|diq|ba|tt|my|ga|cv|ia|nap|bat-smg|map-bms|wa|kn|als|am|bug|tg|gd|zh-min-nan|yi|vec|hif|sco|roa-tara|os|arz|nah|uz|sah|mn|sa|mzn|pam|hsb|mi|li|ky|si|co|gan|glk|ckb|bo|fo|bar|bcl|ilo|mrj|fiu-vro|nds-nl|tk|vls|se|gv|ps|rue|dv|nrm|pag|koi|pa|rm|km|kv|udm|csb|mhr|fur|mt|wuu|lij|ug|lad|pi|zea|sc|bh|zh-classical|nov|ksh|or|ang|kw|so|nv|xmf|stq|hak|ay|frp|frr|ext|szl|pcd|ie|gag|haw|xal|ln|rw|pdc|pfl|krc|crh|eml|ace|gn|to|ce|kl|arc|myv|dsb|vep|pap|bjn|as|tpi|lbe|wo|mdf|jbo|kab|av|sn|cbk-zam|ty|srn|kbd|lo|ab|lez|mwl|ltg|ig|na|kg|tet|za|kaa|nso|zu|rmy|cu|tn|chr|got|sm|bi|mo|bm|iu|chy|ik|pih|ss|sd|pnt|cdo|ee|ha|ti|bxr|om|ks|ts|ki|ve|sg|rn|dz|cr|lg|ak|tum|fj|st|tw|ch|ny|ff|xh|ng|ii|cho|mh|aa|kj|ho|mus|kr|hz|tyv|min";

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

	wikiBaseUrl["mediawikiwiki"] = 'https://www.mediawiki.org/wiki/';
	wikiBaseUrl["commonswiki"] = 'https://commons.wikimedia.org/wiki/';
	wikiBaseUrl["metawiki"] = 'https://meta.wikimedia.org/wiki/';
	wikiBaseUrl["foundationwiki"] = 'https://wikimediafoundation.org/wiki/';
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
	'name1': {
		description: 'Id for the service generating the html1',
		'boolean': false,
		'default': 'html1',
	},
	'url1': {
		description: 'URL for the first HTML to screenshot (useful when we want to screenshot an arbitrary url/html-file)',
		'boolean': false,
		'default': null,
	},
	'html1Server': {
		description: 'What server to fetch HTML1 from? (defaults to wikipedia server)',
		'boolean': false,
		'default': null,
	},
	'html1PP': {
		description: 'Postprocessor script to run on the html1 DOM',
		'boolean': false,
		'default': null,
	},
	'dumpHTML1': {
		description: "Dump HTML1 after wrappers have been adjusted",
		'boolean': true,
		'default': false
	},
	'dumpCSS1': {
		description: "Dump computed CSS for HTML 1 (in a <script> element in the <head>)",
		'boolean': true,
		'default': false
	},
	'name2': {
		description: 'Id for the service generating the html2',
		'boolean': false,
		'default': 'html2',
	},
	'url2': {
		description: 'URL for the second HTML to screenshot (useful when we want to screenshot an arbitrary url/html-file)',
		'boolean': false,
		'default': null,
	},
	'html2Server': {
		description: 'What server to fetch HTML2 from?',
		'boolean': false,
		'default': 'http://localhost:8000/'
	},
	'html2PP': {
		description: 'Postprocessor script to run on the html2 DOM',
		'boolean': false,
		'default': null,
	},
	'dumpHTML2': {
		description: "Dump HTML2 after wrappers have been adjusted",
		'boolean': true,
		'default': false
	},
	'dumpCSS2': {
		description: "Dump computed CSS for HTML 2 (in a <script> element in the <head>)",
		'boolean': true,
		'default': false
	},
	'filePrefix': {
		description: 'Prefix of files to output screenshots to? (default: <title>.<name1>.png and <title>.<name2>.png)',
		'boolean': false,
		'default': null,
	},
	'largeImageThreshold': {
		description: 'Set to 0 to eliminate grid in diff image (Pass-through option to resemble.js -- see resemblejs options)',
		'default': 10000,
	},
	'errorType': {
		description: 'flat OR movement (Pass-through option to resemble.js -- see resemblejs options)',
		'default': "movement",
	},
	'diffEngine': {
		description: "The diff engine to use, may be resemble or uprightdiff",
		'default': 'resemble',
	},
	'screenShotDelay': {
		description: "The amount of time (in seconds) to wait after the page load event before capturing a screenshot",
		'default': 2,
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
	var fileName = str.replace(/[^0-9A-Za-z#%,_\-\.\x80-\uD7FF\uF900-\uFFFF]+/g, function(c) { return encodeURI(c); });
	var byteLength = Buffer.byteLength(fileName, 'utf8');
	// 15 byte breathing room for suffix like ".base.png", etc.
	if (byteLength > 240) {
		// Since we are going to truncate the filename, we are going
		// to add a md5 hash suffix to prevent file name clashes.
		// Allocate 33 bytes for "." and the md5 hash.
		while (byteLength > 207) {
			var utfRatio = Math.ceil(byteLength / fileName.length);
			// -1 to eliminate possibility of an infinite loop
			fileName = fileName.substring(0, Math.round(207 / utfRatio) - 1);
			byteLength = Buffer.byteLength(fileName, 'utf8').length;
		}

		fileName = fileName + "." + md5Hash(str);
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
 * @returns {Object} The modified object.
 */
Util.extendProps = function () {
	function internalExtend(target, obj) {
		var allKeys = [].concat(Object.keys(target),Object.keys(obj));
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

	opts.html1 = opts.html1 || {};
	Util.extendProps(opts.html1, {
		name: opts.name1,
		url: opts.url1,
		postprocessorScript: opts.html1PP,
		dumpHTML: opts.dumpHTML1,
		dumpCSS: opts.dumpCSS1,
		computeURL: function(server, wiki, title) {
			var urlPart = (opts.html1.name === 'parsoid') ? Util.getWikiDomain(wiki) + '/v3/page/html/' : '';
			return server + urlPart + encodeURIComponent(title) + "?follow_redirects=true";
		},
	});

	opts.html2 = opts.html2 || {};
	Util.extendProps(opts.html2, {
		name: opts.name2,
		url: opts.url2,
		postprocessorScript: opts.html2PP,
		dumpHTML: opts.dumpHTML2,
		dumpCSS: opts.dumpCSS2,
		computeURL: function(server, wiki, title) {
			var urlPart = (opts.html2.name === 'parsoid') ? Util.getWikiDomain(wiki) + '/v3/page/html/' : '';
			return server + urlPart + encodeURIComponent(title) + "?follow_redirects=true";
		},
	});

	// Extend unset resemblejs outputSettings options
	opts.outputSettings = opts.outputSettings || {};
	Util.extendProps(opts.outputSettings, {
		largeImageThreshold: opts.largeImageThreshold,
		errorType: opts.errorType
	});

	// Compute base file paths and output directories
	opts.filePrefix = opts.filePrefix || opts.title;
	opts.outdir = (opts.outdir || ".").replace(/\/$/, '');
	if (opts.wiki) {
		opts.outdir = opts.outdir + "/" + opts.wiki + "/";
	}

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
	var opts = yargs.usage(usageStr, allOpts).strict();
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
		var nobj = {};
		if (deepClone) {
			return Object.keys(obj).reduce(function(nobj, key) {
				nobj[key] = Util.clone(obj[key], true);
				return nobj;
			}, nobj);
		} else {
			return Object.assign(nobj, obj);
		}
	} else {
		return obj;
	}
};
