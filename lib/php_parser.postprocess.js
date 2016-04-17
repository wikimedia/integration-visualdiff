window.postprocessDOM = function() {
	try {
		// Open navboxes and other collapsed content
		$('table.collapsible tr').show();
		$('.NavContent').show();

		// Hide toc
		$('div.toc').hide();

		// Hide edit links
		$('span.mw-editsection').hide();

		// Hide catlinks + footer
		$('div.printFooter').hide();
		$('div#catlinks').hide();
		$('div#catlinks+div.visualClear').hide();

		// Hide show/hide buttons
		$('span.collapseButton').hide();
		$('a.NavToggle').hide();

		// Finally remove all chrome, only keep the actual content.
		document.body.innerHTML = $('div#mw-content-text').html();
		document.body.classList.add('mw-body');
		document.body.classList.add('mw-body-content');
	} catch (e) {
		return 'PP_FAILED';
	}

	return null;
}
