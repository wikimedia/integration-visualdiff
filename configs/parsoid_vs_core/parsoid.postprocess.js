window.postprocessDOM = function(customCSS) {
	var body = document.body;
	var content = body.firstChild;
	if (content.nodeName === 'LINK' && content.getAttribute('rel') === 'mw:PageProp/redirect') {
		return 'REDIRECT';
	}

	// Expand viewport to max size (Vector 2022)
	$('button.vector-limited-width-toggle').each(function() { this.click(); });

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

	// Open navboxes
	$('tr.navboxHidden').removeClass('navboxHidden'); // frwiki
	$('.mw-collapsible-content').show();
	$('.mw-collapsible-content table tr').show();
	$('table.collapsible tr').show();
	$('table.mw-collapsible tr').show();
	$('.NavContent').show();

	// Hide quick surveys
	$('.ext-quick-survey-panel').hide();

	// Hide notifications (Parsoid adds a new one now -- so all notifications)
	$('div.mw-notification').hide();
	// Hide Parsoid's "rendered with parsoid" indicator
	// But this is too crude a hammer without an id on it.
	$('div.cdx-info-chip').hide();

	return null;
};
