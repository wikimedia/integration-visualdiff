// Post processing of a parsermigration-edit display to strip
// edit form, chrome, and extract the new (right) view out
// of a side-by-side display in a table.
window.postprocessDOM = function() {
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

		// Hide toc -- since we have some minor pixel shifts in header display
		$('div.toc').hide();

		// Hide catlinks + footer
		$('div.printFooter').hide();
		$('div#catlinks').hide();
		$('div#catlinks+div.visualClear').hide();

		// FIXME: Yuck! This is not a scalable solution
		$('span.NavToggle a').each(function() { this.click(); }); // enwiktionary, ...
		$('a.collapsible-toggle').each(function() { this.click(); }); // eswiktionary
		$('a.NavToggle').each(function() { this.click(); });
		$('.collapseButton a').each(function() { this.click(); }); // enwiki
		$('a.UitklapToggle').each(function() { this.click(); }); // nlwiki
		// $('.mw-collapsible-toggle a').each(function() { this.click(); }); // itwiki, svwiki, ...

		// Open navboxes and other collapsed content
		// IMPORTANT: This should be after the clicks above
		$('table.collapsible tr').show();
		$('table.mw-collapsible tr').show();
		$('.NavContent').show();

		// Remove parsermigration edit form, preview notice
		$('div.previewnote').hide();
		$('form#editform').hide();

		// Extract the new (right) display out of the table and delete the table
		$('td.mw-parsermigration-right').children().each(function() {
			$('div.mw-content-ltr').append(this);
		});
		$('table.mw-parsermigration-sxs').remove();

		// Finally remove all chrome, only keep the actual content.
		document.body.innerHTML = $('div#mw-content-text').html();
		document.body.classList.add('mw-body-content');
	} catch (e) {
		return 'PP_FAILED';
	}

	return null;
}
