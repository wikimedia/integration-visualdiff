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
		// T258719: Remove mw-content-ltr/rtl classes since these aren't present in core parser output.
		document.body.classList.remove('mw-content-ltr');
		document.body.classList.remove('mw-content-rtl');
		// Core parser adds this for the vector skin
		document.body.classList.add('skin-vector');
		document.body.classList.add('skin-vector-legacy');

		// Add custom CSS to reduce rendering diffs
		$('<style type="text/css">' + customCSS + '</style>').appendTo('head');

		return null;
	} catch(e) {
		throw(e);
	}
}
