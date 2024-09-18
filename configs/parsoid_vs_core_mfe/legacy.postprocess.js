window.postprocessDOM = function() {
	const customCSS = '.content ul + .mw-heading3 { margin-top: 1.5em; }';
	// Add custom CSS to reduce rendering diffs
	$('<style type="text/css">' + customCSS + '</style>').appendTo('head');

	// Hide all maps
	$('.mw-kartographer-map').hide();

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
