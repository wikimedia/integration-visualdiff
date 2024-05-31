window.postprocessDOM = function() {
	// Expand TOC & all sections
	$('span.mw-expand-icon').each(function() { this.click(); });
	$('span.toctogglespan').each(function() { this.click(); });

	// Hide Cite errors for now since Parsoid embeds error info elsewhere
	$('<style type="text/css"> .mw-ext-cite-error { display: none; } </style>').appendTo('head');

	// FIXME: Yuck! This is not a scalable solution
	$('.mw-collapsible-toggle-collapsed a').each(function() { this.click(); });
	$('span.NavToggle a').each(function() { this.click(); }); // enwiktionary, ...
	$('a.collapsible-toggle').each(function() { this.click(); }); // eswiktionary
	$('a.NavToggle').each(function() { this.click(); });
	$('a.UitklapToggle').each(function() { this.click(); }); // nlwiki
	// $('.collapseButton a').each(function() { this.click(); }); // enwiki ruwiki

	// Hide show/hide buttons
	$('span.NavToggle').hide();
	$('a.NavToggle').hide();
	$('span.collapseButton').hide();
	$('span.mw-collapsible-toggle').hide();
	$('a.UitklapToggle').hide();

	// Open navboxes and other collapsed content
	// IMPORTANT: This should be after the clicks above
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

	// enwikivoyage specific hacks:
	// 1. Hide related pages (which seems to come from some gadget which
	//    don't always reliably load before the screenshotting and lead to
	//    a lot of false positives and hence noise)
	// 2. Suppress gadget-added add listing links
	$('div#mw-data-after-content').hide();
	// For some reason, these don't seem to consistently get added everywhere during visual diff tests
	// but they are present when visited on the wiki -- so, suppress the noise for now
	$('a.listingeditor-add').hide();

	return null;
};
