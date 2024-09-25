window.postprocessDOM = function(customCSS) {
	var body = document.body;
	var content = body.firstChild;
	if (content.nodeName === 'LINK' && content.getAttribute('rel') === 'mw:PageProp/redirect') {
		return 'REDIRECT';
	}

	// Add custom CSS to reduce rendering diffs
	$('<style type="text/css">' + customCSS + '</style>').appendTo('head');

	// Hide all maps
	$('.mw-kartographer-map').hide();

	// Hide notifications
	$('div.mw-notification-area').hide();

	// Hide footer -- adds imperceptible noise in some tests
	$('footer').hide();

	// Workaround for https://phabricator.wikimedia.org/T374883.
	// Make collapsible h3s caused by GIGO etc.. behave like legacy parser.
	const invalidHeadings = $( '.mw-heading.mf-collapsible-heading:not(.mw-heading2)' );
	invalidHeadings.find( '.mf-icon' ).remove();
	invalidHeadings
		.css( 'padding-left', 0 )
		.css( 'border-bottom', 0 )
		.removeClass('mf-collapsible-heading' );

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
