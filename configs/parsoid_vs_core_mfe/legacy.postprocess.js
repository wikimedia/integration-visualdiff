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
		.slice( 0, 2 ).forEach((a) => a.click());

	// Lazy loading works slightly different in Parsoid.
	// Parsoid behaves more correctly so unset any CSS style attributes
	// relating to width or height.
	// See https://phabricator.wikimedia.org/T412169
	setTimeout( () => {
		$('img[style]').css( { height: '', width: '' } );
	}, 400 );

	// Trick article to load all images by simulating a print event.
	window.dispatchEvent(new Event('beforeprint'));
	return null;
};
