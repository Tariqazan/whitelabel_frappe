/**
 * Google Translate for Whitelabel Desk (en, bn, ja).
 * Persists choice in localStorage + googtrans cookie; reload applies translation.
 */
(function () {
	"use strict";

	window.WhitelabelSidebar = window.WhitelabelSidebar || {};

	const STORAGE_KEY = "frappe_whitelabel_google_lang";
	const PAGE_LANG = "en";
	const SUPPORTED = ["en", "bn", "ja"];

	/** Set googtrans cookie before page paint when possible */
	function setGoogTransCookie(lang) {
		const host = window.location.hostname;
		const clear = "googtrans=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT";

		document.cookie = clear;
		if (host) {
			document.cookie = `${clear};domain=${host}`;
		}

		if (lang && lang !== PAGE_LANG && SUPPORTED.includes(lang)) {
			const value = `googtrans=/${PAGE_LANG}/${lang};path=/`;
			document.cookie = value;
			if (host) {
				document.cookie = `${value};domain=${host}`;
			}
		}
	}

	// Apply saved language cookie as early as possible
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			setGoogTransCookie(saved);
		}
	} catch (e) {
		/* ignore */
	}

	let scriptLoading = null;

	function ensureContainer() {
		if (!document.getElementById("wl_google_translate_element")) {
			const el = document.createElement("div");
			el.id = "wl_google_translate_element";
			el.setAttribute("aria-hidden", "true");
			el.style.cssText = "display:none!important;height:0;overflow:hidden;";
			document.body.appendChild(el);
		}
	}

	function loadTranslateScript() {
		if (window.google && window.google.translate) {
			return Promise.resolve();
		}
		if (scriptLoading) {
			return scriptLoading;
		}

		scriptLoading = new Promise((resolve) => {
			window.googleTranslateElementInit = function () {
				try {
					new window.google.translate.TranslateElement(
						{
							pageLanguage: PAGE_LANG,
							includedLanguages: SUPPORTED.join(","),
							autoDisplay: false,
						},
						"wl_google_translate_element"
					);
				} catch (err) {
					console.warn("[WhitelabelSidebar] Google Translate init:", err);
				}
				resolve();
			};

			if (document.getElementById("wl-google-translate-script")) {
				return;
			}

			const script = document.createElement("script");
			script.id = "wl-google-translate-script";
			script.src =
				"https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
			script.async = true;
			script.onerror = () => {
				console.warn("[WhitelabelSidebar] Failed to load Google Translate");
				resolve();
			};
			document.head.appendChild(script);
		});

		return scriptLoading;
	}

	function restoreLanguageDropdown() {
		const Footer = WhitelabelSidebar.Footer;
		if (Footer?.refreshLanguageSelect) {
			Footer.refreshLanguageSelect(document.querySelector(".wl-language-select"));
		}
	}

	function applyComboLanguage(lang) {
		const attempt = () => {
			const combo = document.querySelector(".goog-te-combo");
			if (!combo) {
				return false;
			}
			if (lang === PAGE_LANG) {
				combo.value = "";
			} else {
				combo.value = lang;
			}
			combo.dispatchEvent(new Event("change"));
			restoreLanguageDropdown();
			return true;
		};

		if (attempt()) {
			return;
		}
		[400, 1000, 2000].forEach((ms) => {
			setTimeout(() => {
				attempt();
				restoreLanguageDropdown();
			}, ms);
		});
	}

	WhitelabelSidebar.GoogleTranslate = {
		STORAGE_KEY,
		SUPPORTED,

		getSavedLanguage() {
			try {
				const lang = localStorage.getItem(STORAGE_KEY);
				return SUPPORTED.includes(lang) ? lang : PAGE_LANG;
			} catch (e) {
				return PAGE_LANG;
			}
		},

		changeLanguage(lang) {
			if (!SUPPORTED.includes(lang)) {
				return;
			}

			if (lang === this.getSavedLanguage()) {
				return;
			}

			try {
				localStorage.setItem(STORAGE_KEY, lang);
			} catch (e) {
				/* ignore */
			}

			setGoogTransCookie(lang);

			frappe.show_alert?.({
				message: __("Applying language…"),
				indicator: "blue",
			});

			window.location.reload();
		},

		init() {
			const lang = this.getSavedLanguage();
			setGoogTransCookie(lang);

			if (lang === PAGE_LANG) {
				return;
			}

			ensureContainer();
			loadTranslateScript().then(() => applyComboLanguage(lang));
		},
	};
})();
