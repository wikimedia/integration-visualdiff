window.postprocessDOM = function(customCSS) {
	var body = document.body;
	var content = body.firstChild;
	if (content.nodeName === 'LINK' && content.getAttribute('rel') === 'mw:PageProp/redirect') {
		return 'REDIRECT';
	} else {
		try {
			// Freeze animated gifs
			$('img').each(function(i) {
				if (/^(?!data:).*\.gif/i.test(this.src)) {
					var c = document.createElement('canvas');
					var w = c.width = this.width;
					var h = c.height = this.height;
					c.getContext('2d').drawImage(this, 0, 0, w, h);
					try { this.src = c.toDataURL(); } catch(e) { }
				}
			});

			// Open navboxes
			$('table.collapsible tr').show();
			$('*.NavContent').show();

			// Fix problem with Parsoid CSS to reduce rendering diffs
			$('<style type="text/css">' + customCSS + '</style>').appendTo('head');

			// Work-around for body.mediawiki matches in
			// https://en.wikipedia.org/wiki/MediaWiki:Common.css
			// until those are fixed
			document.body.classList.add('mediawiki');
		} catch(e) {
			return 'PP_FAILED';
		}

		return null;
	}
}
