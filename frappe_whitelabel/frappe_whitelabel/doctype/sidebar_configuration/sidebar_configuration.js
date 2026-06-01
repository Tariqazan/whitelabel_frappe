// Copyright (c) 2026, Tariqul Islam and contributors
// Route URL logic: public/js/sidebar_menu_item.js

frappe.ui.form.on("Sidebar Configuration", {
	refresh(frm) {
		frm.set_intro(
			__(
				"Set Primary / Secondary colors and Light / Dark backgrounds. Changes apply on save after cache clears."
			),
			"blue"
		);
	},
});
