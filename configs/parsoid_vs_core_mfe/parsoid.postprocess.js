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

	// T355099
	$('p > br').each((i, br) => {
		if ( br.parentNode.children.length === 1 ) {
			br.parentNode.remove();
		}
	} );

	// Expand first 2 sections (Should be enough for comparison)
	Array.from(document.querySelectorAll( '.mf-collapsible-heading' ))
		.slice( 0, 2 ).forEach((a) => a.click());

	// Trick article to load all images by simulating a print event.
	window.dispatchEvent(new Event('beforeprint'));
	// Lazy loading works slightly different in Parsoid.
	// Parsoid behaves more correctly so unset any CSS style attributes
	// relating to width or height.
	setTimeout( () => {
		$('img[style]').css( { height: '', width: '' } );
	}, 400 );

	return null;
};
