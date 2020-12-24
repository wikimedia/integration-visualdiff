window.postprocessDOM = function(customCSS) {
	var body = document.body;
	var content = body.firstChild;
	if (content.nodeName === 'LINK' && content.getAttribute('rel') === 'mw:PageProp/redirect') {
		return 'REDIRECT';
	}

	try {
		// Remove parsoid-body since mw-body isn't present on the PHP parser output.
		document.body.classList.remove('parsoid-body');
		// T258719: Remove mw-content-ltr/rtl classes since these aren't present in core parser output.
		// document.body.classList.remove('mw-content-ltr');
		// document.body.classList.remove('mw-content-rtl');
		// Core parser adds this for the vector skin
		document.body.classList.add('skin-vector');
		document.body.classList.add('skin-vector-legacy');
		document.body.setAttribute('id', 'mw-content-text');

		// Add custom CSS to reduce rendering diffs
		$('<style type="text/css">' + customCSS + '</style>').appendTo('head');

		// FIXME: Yuck! This is not a scalable solution
		$('.mw-collapsible-toggle-collapsed a').each(function() { this.click(); });
		$('span.NavToggle a').each(function() { this.click(); }); // enwiktionary, ...
		$('a.collapsible-toggle').each(function() { this.click(); }); // eswiktionary
		$('a.NavToggle').each(function() { this.click(); });
		$('a.UitklapToggle').each(function() { this.click(); }); // nlwiki
		// $('.collapseButton a').each(function() { this.click(); }); // enwiki

		// Hide show/hide buttons
		$('span.NavToggle').hide();
		$('a.NavToggle').hide();
		$('span.collapseButton').hide();
		$('span.mw-collapsible-toggle').hide();
		$('a.UitklapToggle').hide();

		// svwiki-specific to suppress noise from missing gadget modules in Parsoid
		$('div.gadget-refcolumns').attr('style', '');
		// For printonly classes that come from gadget modules
		$('.printonly').hide();

		// Open navboxes
		$('tr.navboxHidden').removeClass('navboxHidden'); // frwiki
		$('.mw-collapsible-content').show();
		$('.mw-collapsible-content table tr').show();
		$('table.collapsible tr').show();
		$('table.mw-collapsible tr').show();
		$('.NavContent').show();

		return null;
	} catch(e) {
		throw(e);
	}
}
