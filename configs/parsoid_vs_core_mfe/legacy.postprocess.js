window.postprocessDOM = function(customCSS) {
	// Add custom CSS to reduce rendering diffs
	$('<style type="text/css">' + customCSS + '</style>').appendTo('head');

	// Hide notifications
	$('div.mw-notification-area').hide();

	// Hide footer -- adds imperceptible noise in some tests
	$('footer').hide();

	// T355099
	$('p > br').each((i, br) => {
		if ( br.parentNode.children.length === 1 ) {
			br.parentNode.remove();
		}
	} );

	// Expand first 2 sections (Should be enough for comparison)
	Array.from(document.querySelectorAll( '.collapsible-heading' ))
		.slice( 0, 1 ).forEach((a) => a.click());

	// Trick article to load all images by simulating a print event.
	window.dispatchEvent(new Event('beforeprint'));
	return null;
};
