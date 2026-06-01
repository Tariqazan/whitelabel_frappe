/**
 * Whitelabel Sidebar Footer — settings dropup, theme, language, profile.
 */
(function () {
	"use strict";

	window.WhitelabelSidebar = window.WhitelabelSidebar || {};

	const Store = WhitelabelSidebar.Store;

	/** Sidebar language options (codes must exist in Language master). */
	const WL_LANGUAGES = [
		{ code: "en", labelKey: "English" },
		{ code: "bn", labelKey: "বাংলা" },
		{ code: "ja", labelKey: "日本語" },
	];

	let outsideClickBound = false;

	function navigateToProfile() {
		// User form for current session user, User Details tab
		// e.g. /app/user/Administrator#user_details_tab
		frappe.route_hash = "#user_details_tab";
		frappe.set_route("Form", "User", frappe.session.user);
		Store.setState({ mobileOpen: false });
	}

	function getThemeMode() {
		return (
			document.documentElement.getAttribute("data-theme-mode") ||
			frappe.boot?.user?.desk_theme?.toLowerCase() ||
			"light"
		);
	}

	function updateThemeToggleLabel(rootEl) {
		const isDark =
			frappe.ui.get_current_theme?.() === "dark" ||
			getThemeMode() === "dark";
		const label = rootEl.querySelector(".wl-theme-toggle-label");
		const iconWrap = rootEl.querySelector(".wl-theme-icon");
		if (label) {
			label.textContent = isDark ? __("Light Mode") : __("Dark Mode");
		}
		if (iconWrap && frappe.utils?.icon) {
			iconWrap.innerHTML = frappe.utils.icon(isDark ? "sun" : "moon", "sm");
		}
	}

	function toggleTheme(rootEl) {
		const resolved =
			frappe.ui.get_current_theme?.() ||
			(getThemeMode() === "dark" ? "dark" : "light");
		const next = resolved === "dark" ? "light" : "dark";
		const deskTheme = next === "dark" ? "Dark" : "Light";

		document.documentElement.setAttribute("data-theme-mode", next);
		if (frappe.ui.set_theme) {
			frappe.ui.set_theme();
		}

		frappe.xcall("frappe.core.doctype.user.user.switch_theme", {
			theme: deskTheme,
		});

		const Theme = WhitelabelSidebar.Theme;
		if (Theme) {
			Theme.applyColors(rootEl, Store.get().settings || {});
		}

		updateThemeToggleLabel(rootEl);
		frappe.show_alert({
			message: __("Theme updated"),
			indicator: "green",
		});
	}

	function getCurrentLanguage() {
		const GT = WhitelabelSidebar.GoogleTranslate;
		if (GT) {
			return GT.getSavedLanguage();
		}
		return "en";
	}

	function populateLanguageSelect(select) {
		if (!select) {
			return;
		}

		select.classList.add("notranslate");
		select.setAttribute("translate", "no");

		const current = getCurrentLanguage();
		select.innerHTML = "";
		WL_LANGUAGES.forEach((lang) => {
			const opt = document.createElement("option");
			opt.value = lang.code;
			opt.className = "notranslate";
			opt.setAttribute("translate", "no");
			// Fixed native labels — never Frappe __() or Google Translate
			opt.textContent = lang.labelKey;
			select.appendChild(opt);
		});

		if (WL_LANGUAGES.some((l) => l.code === current)) {
			select.value = current;
		} else {
			select.value = "en";
		}
	}

	/** Google Translate (en / bn / ja) — not Frappe CSV translations */
	function changeLanguage(lang) {
		if (!lang || !WL_LANGUAGES.some((l) => l.code === lang)) {
			return;
		}

		const GT = WhitelabelSidebar.GoogleTranslate;
		if (GT) {
			GT.changeLanguage(lang);
			return;
		}

		if (lang === getCurrentLanguage()) {
			return;
		}
		window.location.reload();
	}

	function closeDropup(rootEl) {
		const toggle = rootEl.querySelector(".wl-settings-toggle");
		const dropup = rootEl.querySelector(".wl-footer-dropup");
		if (!toggle || !dropup) {
			return;
		}
		toggle.setAttribute("aria-expanded", "false");
		dropup.hidden = true;
		dropup.classList.remove("is-open");
	}

	function openDropup(rootEl) {
		const toggle = rootEl.querySelector(".wl-settings-toggle");
		const dropup = rootEl.querySelector(".wl-footer-dropup");
		if (!toggle || !dropup) {
			return;
		}
		toggle.setAttribute("aria-expanded", "true");
		dropup.hidden = false;
		dropup.classList.add("is-open");
		updateThemeToggleLabel(rootEl);
	}

	function toggleDropup(rootEl) {
		const dropup = rootEl.querySelector(".wl-footer-dropup");
		if (!dropup) {
			return;
		}
		if (dropup.classList.contains("is-open")) {
			closeDropup(rootEl);
		} else {
			openDropup(rootEl);
		}
	}

	function bindOutsideClick(rootEl) {
		if (outsideClickBound) {
			return;
		}
		document.addEventListener("click", (e) => {
			const menu = rootEl.querySelector(".wl-footer-menu");
			if (!menu || !menu.querySelector(".wl-footer-dropup.is-open")) {
				return;
			}
			if (!menu.contains(e.target)) {
				closeDropup(rootEl);
			}
		});
		outsideClickBound = true;
	}

	/** Re-apply fixed option labels after Google Translate mutates the DOM */
	function refreshLanguageSelect(rootElOrSelect) {
		const select =
			rootElOrSelect?.classList?.contains("wl-language-select")
				? rootElOrSelect
				: rootElOrSelect?.querySelector?.(".wl-language-select");
		populateLanguageSelect(select);
	}

	WhitelabelSidebar.Footer = {
		refreshLanguageSelect,
		init(rootEl) {
			if (!rootEl) {
				return;
			}

			const langSelect = rootEl.querySelector(".wl-language-select");
			populateLanguageSelect(langSelect);
			updateThemeToggleLabel(rootEl);
			bindOutsideClick(rootEl);
		},

		closeDropup,
		toggleDropup,
		toggleTheme,
		changeLanguage,
		navigateToProfile,
	};
})();
