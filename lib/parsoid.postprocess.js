window.postprocessDOM = function(customCSS) {
	var body = document.body;
	var content = body.firstChild;
	if (content.nodeName === 'LINK' && content.getAttribute('rel') === 'mw:PageProp/redirect') {
		return 'REDIRECT';
	}

	try {
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

		// Remove parsoid-body since mw-body isn't present on the PHP parser output.
		document.body.classList.remove('parsoid-body');

		// Apply vector skin & styles
		const head = document.head;
		const link = head.ownerDocument.createElement('link');
		link.setAttribute('rel', 'stylesheet');
		link.setAttribute('href', '/w/load.php?modules=skins.vector.styles.legacy&only=styles&skin=vector');
		head.appendChild(link);

		// Add custom CSS to reduce rendering diffs
		$('<style type="text/css">' + customCSS + '</style>').appendTo('head');

		return null;
	} catch(e) {
		throw(e);
		return 'PP_FAILED';
	}
}
