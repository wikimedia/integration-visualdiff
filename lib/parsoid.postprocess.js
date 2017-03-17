window.postprocessDOM = function(customCSS) {
	var body = document.body;
	var content = body.firstChild;
	if (content.nodeName === 'LINK' && content.getAttribute('rel') === 'mw:PageProp/redirect') {
		return 'REDIRECT';
	}

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

		// FIXME: Yuck! This is not a scalable solution
		$('a.UitklapToggle').click(); // nlwiki
		$('.collapseButton a').click(); // enwiki
		// $('.mw-collapsible-toggle a').click(); // itwiki

		// Hide show/hide buttons
		$('span.collapseButton').hide();
		$('a.UitklapToggle').hide();
		$('a.NavToggle').hide();

		// Open navboxes
		$('table.collapsible tr').show();
		$('table.mw-collapsible tr').show();
		$('*.NavContent').show();

		// Fix problem with Parsoid CSS to reduce rendering diffs
		$('<style type="text/css">' + customCSS + '</style>').appendTo('head');

		// Work-around for body.mediawiki matches in
		// https://en.wikipedia.org/wiki/MediaWiki:Common.css
		// until those are fixed
		document.body.classList.add('mediawiki');

		return null;
	} catch(e) {
		return 'PP_FAILED';
	}
}
