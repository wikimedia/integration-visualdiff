window.postprocessDOM = function() {
	try {
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

		// Finally remove all chrome, only keep the actual content.
		document.body.innerHTML = $('div#mw-content-text').html();
		document.body.classList.add('mw-body-content');
	} catch (e) {
		throw(e);
		return 'PP_FAILED';
	}

	return null;
}
