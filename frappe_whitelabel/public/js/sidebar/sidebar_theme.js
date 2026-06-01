/**
 * Whitelabel Sidebar — route matching and dynamic theme colors.
 */
(function () {
	"use strict";

	window.WhitelabelSidebar = window.WhitelabelSidebar || {};

	function normalizePath(path) {
		if (!path || path === "#") {
			return "";
		}
		let p = String(path).trim();
		if (!p.startsWith("/")) {
			p = "/" + p;
		}
		if (p.startsWith("/desk")) {
			p = "/app" + p.slice(5);
		}
		if (p.length > 1 && p.endsWith("/")) {
			p = p.slice(0, -1);
		}
		return p;
	}

	function getCurrentPath() {
		return normalizePath(window.location.pathname);
	}

	function hexToRgba(hex, alpha) {
		if (!hex) {
			return "";
		}
		let h = hex.replace("#", "");
		if (h.length === 3) {
			h = h.split("").map((c) => c + c).join("");
		}
		const num = parseInt(h, 16);
		if (Number.isNaN(num)) {
			return "";
		}
		const r = (num >> 16) & 255;
		const g = (num >> 8) & 255;
		const b = num & 255;
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}

	function isDarkMode(theme) {
		if (theme === "Dark") {
			return true;
		}
		if (theme === "Light") {
			return false;
		}
		return document.documentElement.getAttribute("data-theme") === "dark";
	}

	WhitelabelSidebar.Theme = {
		normalizePath,
		getCurrentPath,

		/**
		 * Longest-prefix match for active menu item (supports nested routes).
		 */
		findActiveWrapper(container) {
			const current = getCurrentPath();
			if (!current) {
				return null;
			}

			const wrappers = container.querySelectorAll(
				".wl-menu-item-wrapper[data-route]"
			);
			let best = null;
			let bestLen = 0;

			wrappers.forEach((el) => {
				const route = normalizePath(el.getAttribute("data-route"));
				if (!route) {
					return;
				}
				const exact = current === route;
				const nested = current.startsWith(route + "/");
				if ((exact || nested) && route.length >= bestLen) {
					best = el;
					bestLen = route.length;
				}
			});

			return best;
		},

		applyColors(rootEl, settings) {
			if (!rootEl || !settings) {
				return;
			}

			const theme = settings.sidebar_theme || "System";
			const colors = settings.colors || {};
			const dark = isDarkMode(theme);

			rootEl.classList.remove("wl-theme-light", "wl-theme-dark");
			if (theme === "Light") {
				rootEl.classList.add("wl-theme-light");
			} else if (theme === "Dark") {
				rootEl.classList.add("wl-theme-dark");
			}

			const primary = colors.primary_color;
			const secondary = colors.secondary_color;
			const bgLight = colors.background_light;
			const bgDark = colors.background_dark;

			const vars = {};

			if (primary) {
				vars["--wl-primary"] = primary;
				vars["--sidebar-accent"] = primary;
				vars["--sidebar-active-text"] = primary;
				vars["--sidebar-active-bg"] = hexToRgba(primary, dark ? 0.18 : 0.1);
			}
			if (secondary) {
				vars["--wl-secondary"] = secondary;
				vars["--sidebar-text-muted"] = secondary;
			}
			if (bgLight) {
				vars["--wl-bg-light"] = bgLight;
			}
			if (bgDark) {
				vars["--wl-bg-dark"] = bgDark;
			}

			if (dark && bgDark) {
				vars["--sidebar-bg"] = bgDark;
			} else if (!dark && bgLight) {
				vars["--sidebar-bg"] = bgLight;
			}

			Object.entries(vars).forEach(([key, value]) => {
				if (value) {
					rootEl.style.setProperty(key, value);
				}
			});

			if (document.body.classList.contains("wl-sidebar-active")) {
				document.body.style.setProperty(
					"--sidebar-bg",
					vars["--sidebar-bg"] || (dark ? bgDark : bgLight) || ""
				);
			}
		},

		watchSystemTheme(rootEl, settings) {
			if (!rootEl || (settings.sidebar_theme || "System") !== "System") {
				return;
			}
			const observer = new MutationObserver(() => {
				WhitelabelSidebar.Theme.applyColors(rootEl, settings);
			});
			observer.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ["data-theme"],
			});
			rootEl.__wl_theme_observer = observer;
		},
	};
})();
