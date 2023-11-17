window.postprocessDOM = function() {
	// Hide Cite errors for now since Parsoid embeds error info elsewhere
	$('<style type="text/css"> .mw-ext-cite-error { display: none; } </style>').appendTo('head');

	// Hide talk page header added on some wikis (ex: frwiki)
	$('div.mw-talkpageheader').hide();

	// Hide DiscussionTools reply buttons - these are only added to core
	// and will be added to Parsoid HTML as well when Parsoid HTML is used.
	$('span.ext-discussiontools-init-replylink-buttons').hide();

	// Hide DiscussionTools empty state output
	$('div.ext-discussiontools-emptystate').hide();

	// Hide edit links
	$('span.mw-editsection').hide();

	// Hide catlinks + footer
	$('div.printFooter').hide();
	$('div#catlinks').hide();
	$('div#catlinks+div.visualClear').hide();

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

	return null;
};
