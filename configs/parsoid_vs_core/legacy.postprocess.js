window.postprocessDOM = function() {
	// Expand viewport to max size (Vector 2022)
	$('button.vector-limited-width-toggle').each(function() { this.click(); });

	// FIXME: Yuck! This is not a scalable solution
	$('.mw-collapsible-toggle-collapsed a').each(function() { this.click(); });
	$('span.NavToggle a').each(function() { this.click(); }); // enwiktionary, ...
	$('a.collapsible-toggle').each(function() { this.click(); }); // eswiktionary
	$('a.NavToggle').each(function() { this.click(); });
	$('a.UitklapToggle').each(function() { this.click(); }); // nlwiki
	// $('.collapseButton a').each(function() { this.click(); }); // enwiki ruwiki

	// jawikivoyage specific hack -- legacy output seems to render this
	// as well causing duplicate blocks and incorrect visual diff noise.
	$('div#mobile').hide();

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
	// Unfortunately, need to hide these as well which hide these from regular edit section links too.
	// But, we know they render properly at this point, so we won't miss diffs here.
	$('span.mw-editsection-bracket').hide();

	return null;
};
