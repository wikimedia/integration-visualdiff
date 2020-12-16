window.postprocessDOM = function() {
	try {
		// Hide toc
		$('div.toc').hide();

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
		$('a.UitklapToggle').each(function() { this.click(); }); // nlwiki
		// $('.collapseButton a').each(function() { this.click(); }); // enwiki ruwiki
		// $('.mw-collapsible-toggle a').each(function() { this.click(); }); // itwiki, svwiki, ...

		// Hide show/hide buttons
		$('span.NavToggle').hide();
		$('span.collapseButton').hide();
		$('span.mw-collapsible-toggle').hide();
		$('a.UitklapToggle').hide();
		$('a.NavToggle').hide();

		// Open navboxes and other collapsed content
		// IMPORTANT: This should be after the clicks above
		$('.mw-collapsible-content').show();
		$('table.collapsible tr').show();
		$('table.mw-collapsible tr').show();
		$('.NavContent').show();

		/*
		// svwiki-specific to suppress noise from missing gadget modules in Parsoid
		$('div.gadget-refcolumns').attr('style', '');
		*/

		// Finally remove all chrome, only keep the actual content.
		document.body.innerHTML = $('div#bodyContent').html();
		document.body.classList.add('mw-body-content');

		$('div#siteSub').hide();
		$('div#contentSub').hide();
		$('div#contentSub2').hide();
		$('div#jump-to-nav').hide();
		$('div#catlinks').hide();
		$('div.feedbackWrapper').hide();
		$('a.mw-jump-link').hide();
	} catch (e) {
		throw(e);
	}

	return null;
}
