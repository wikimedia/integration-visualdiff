window.dumpHTML = function(opts) {
	var output = [];
	if (opts.dumpCSS) {
		var elements = document.getElementsByTagName('*');
		for (var j = 0; j < elements.length; j++) {
			var i, el = elements[j];

			// skip links and metas
			if (el.nodeName in {'HTML': 1, 'HEAD':1, 'LINK':1, 'META':1, 'BASE':1, 'SCRIPT':1, 'STYLE':1}) {
				continue;
			}

			var style = window.getComputedStyle(el),
				attributes = {};
			for (i = 0; i < style.length; i++) {
				var propertyName = style.item(i);
				if (propertyName.match(/^(display|float|width|height|left|right|top|bottom|background|border|padding|margin|font)/)) {
					attributes[propertyName] = style.getPropertyValue(propertyName);
				}
			}

			output.push({
				id: el.id || 'ELT-' + j,
				className: el.className,
				nodeName: el.nodeName,
				offsetHeight: el.offsetHeight,
				offsetWidth: el.offsetWidth,
				offsetTop: el.offsetTop,
				offsetLeft: el.offsetLeft,
				computedStyle: attributes
			});

			// Sort by element name
			output.sort(function(a,b) { return a.nodeName < b.nodeName; });
		}
	}

	if (opts.dumpHTML) {
		var header = document.head.innerHTML.replace(/href="\/\//g, 'href="https://');
		var baseHref = "<base href='" + opts.url + "'>\n";
		var styles = opts.dumpCSS ? '<script>' + JSON.stringify(output, null, 4) + '</script>\n' : '';
		return '<!DOCTYPE html>\n<html><head>\n' + baseHref + styles + header + '\n</head>' + document.body.outerHTML;
	} else {
		return '';
	}
};
