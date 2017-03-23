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
		$('span.NavToggle a').click(); // enwiktionary, ...
		$('a.collapsible-toggle').click(); // eswiktionary
		$('a.NavToggle').click(); // enwiki, frwiki, eswiktionary, ..
		$('.collapseButton a').click(); // enwiki
		$('a.UitklapToggle').click(); // nlwiki
		// $('.mw-collapsible-toggle a').click(); // itwiki, svwiki, ...

		// Hide show/hide buttons
		$('span.NavToggle').hide();
		$('span.collapseButton').hide();
		$('a.UitklapToggle').hide();
		$('a.NavToggle').hide();

		// Open navboxes and other collapsed content
		// IMPORTANT: This should be after the clicks above
		$('table.collapsible tr').show();
		$('table.mw-collapsible tr').show();

		// Finally remove all chrome, only keep the actual content.
		document.body.innerHTML = $('div#mw-content-text').html();
		document.body.classList.add('mw-body');
		document.body.classList.add('mw-body-content');
	} catch (e) {
		return 'PP_FAILED';
	}

	return null;
}
