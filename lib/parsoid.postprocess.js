window.postprocessDOM = function(customCSS) {
	var body = document.body;
	var content = body.firstChild;
	if (content.nodeName === 'LINK' && content.getAttribute('rel') === 'mw:PageProp/redirect') {
		return 'REDIRECT';
	}

	try {
		// Freeze animated gifs
		$('img').each(function(i) {
			if (/^(?!data:).*\.gif/i.test(this.src)) {
				var c = document.createElement('canvas');
				var w = c.width = this.width;
				var h = c.height = this.height;
				c.getContext('2d').drawImage(this, 0, 0, w, h);
				try { this.src = c.toDataURL(); } catch(e) { }
			}
		});

		// FIXME: Yuck! This is not a scalable solution
		$('a.UitklapToggle').click(); // nlwiki
		$('.collapseButton a').click(); // enwiki
		// $('.mw-collapsible-toggle a').click(); // itwiki

		// Hide show/hide buttons
		$('span.collapseButton').hide();
		$('a.UitklapToggle').hide();
		$('a.NavToggle').hide();

		// Open navboxes
		$('table.collapsible tr').show();
		$('table.mw-collapsible tr').show();
		$('*.NavContent').show();

		// Remove parsoid-body since mw-body isn't present on the PHP parser output.
		document.body.classList.remove('parsoid-body');

		// Remove all styles and retain just the styles that Parsoid relies on
		// for basic rendering (ex: cite css counters)
		const head = document.head;
		const styles = head.querySelectorAll('link[rel=stylesheet]');
		for (var i = 0; i < styles.length; i++) {
			head.removeChild(styles[i]);
		}
		const link = head.ownerDocument.createElement('link');
		link.setAttribute('rel', 'stylesheet');
		link.setAttribute('href', 'https://en.wikipedia.org/w/load.php?modules=ext.cite.style&only=styles');
		head.appendChild(link);

		// Add background to the rendering for debugging purposes
		customCSS = "body { background-color: white; }\n"
			// Add CSS counter styles from content.parsoid.less from MediaWiki core
			// Needed since loading all the styles from it loads image styles as well
			// which introduces styling diffs between unstyled core parser output and
			// Parosid output.
			+ ".mw-parser-output { counter-reset: mw-numbered-ext-link; }\n\n"
			+ ".mw-parser-output a[ rel~='mw:ExtLink' ]:empty:after {\n"
			+ "  content: '[' counter( mw-numbered-ext-link ) ']';"
			+ "  counter-increment: mw-numbered-ext-link;\n"
			+ " }\n"
			+ customCSS;

		// Add custom CSS to reduce rendering diffs
		$('<style type="text/css">' + customCSS + '</style>').appendTo('head');

		return null;
	} catch(e) {
		throw(e);
		return 'PP_FAILED';
	}
}
