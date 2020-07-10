window.postprocessDOM = function() {
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

		// Hide toc
		$('div.toc').hide();
		$('div.thumbcaption div.magnify').remove();

		// Hide edit links
		$('span.mw-editsection').hide();

		// Hide catlinks + footer
		$('div.printFooter').hide();
		$('div#catlinks').hide();
		$('div#catlinks+div.visualClear').hide();

		// FIXME: Yuck! This is not a scalable solution
		$('span.NavToggle a').each(function() { this.click(); }); // enwiktionary, ...
		$('a.collapsible-toggle').each(function() { this.click(); }); // eswiktionary
		$('a.NavToggle').each(function() { this.click(); });
		$('.collapseButton a').each(function() { this.click(); }); // enwiki
		$('a.UitklapToggle').each(function() { this.click(); }); // nlwiki
		// $('.mw-collapsible-toggle a').each(function() { this.click(); }); // itwiki, svwiki, ...

		// Hide show/hide buttons
		$('span.NavToggle').hide();
		$('span.collapseButton').hide();
		$('span.mw-collapsible-toggle').hide();
		$('a.UitklapToggle').hide();
		$('a.NavToggle').hide();

		// Open navboxes and other collapsed content
		// IMPORTANT: This should be after the clicks above
		$('table.collapsible tr').show();
		$('table.mw-collapsible tr').show();
		$('.NavContent').show();

		// Add background to the rendering for debugging purposes
		$('<style type="text/css"> body { background-color: white; } </style>').appendTo('head');
	} catch (e) {
		return 'PP_FAILED';
	}

	return null;
}
