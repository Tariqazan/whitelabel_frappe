/**
 * Whitelabel Sidebar Events
 * Handles user interactions, mobile drawer, search debouncing, and keyboard accessibility.
 */

(function () {
	"use strict";

	window.WhitelabelSidebar = window.WhitelabelSidebar || {};

	const Store = WhitelabelSidebar.Store;
	const Service = WhitelabelSidebar.Service;
	const Footer = WhitelabelSidebar.Footer;

	let eventListenersBound = false;

	WhitelabelSidebar.Events = {
		/**
		 * Binds all event delegation on the root sidebar element
		 */
		bind(rootEl) {
			if (eventListenersBound) return;

			rootEl.addEventListener("click", (e) => {
				const collapseBtn = e.target.closest(".wl-collapse-trigger");
				if (collapseBtn) {
					Store.setState({ collapsed: !Store.get("collapsed") });
					return;
				}

				const favBtn = e.target.closest(".wl-favorite-btn");
				if (favBtn) {
					e.preventDefault();
					e.stopPropagation();
					const route = favBtn.getAttribute("data-route");
					const wrapper = favBtn.closest(".wl-menu-item-wrapper");
					const label =
						wrapper.getAttribute("data-item-label") ||
						wrapper.querySelector(".wl-item-label")?.innerText;
					const icon = wrapper.querySelector(".wl-item-icon-wrapper")?.innerHTML;
					Service.toggleFavorite({ route, label, icon });
					return;
				}

				const subToggle = e.target.closest(".wl-sub-toggle");
				if (subToggle) {
					e.preventDefault();
					e.stopPropagation();
					const wrapper = subToggle.closest(".wl-menu-item-wrapper");
					const subItems = wrapper.querySelector(".wl-sub-items");
					const expanded = subToggle.getAttribute("aria-expanded") === "true";
					subToggle.setAttribute("aria-expanded", !expanded);
					if (subItems) {
						subItems.style.display = expanded ? "none" : "block";
					}
					return;
				}

				const groupToggle = e.target.closest(".wl-group-toggle");
				if (groupToggle) {
					const group = groupToggle.closest(".wl-sidebar-group");
					const items = group.querySelector(".wl-group-items");
					const expanded = groupToggle.getAttribute("aria-expanded") === "true";
					groupToggle.setAttribute("aria-expanded", !expanded);
					if (items) {
						items.style.display = expanded ? "none" : "block";
					}
					return;
				}

				const searchTrigger = e.target.closest(".wl-search-trigger");
				if (searchTrigger) {
					document.dispatchEvent(
						new KeyboardEvent("keydown", {
							key: "k",
							code: "KeyK",
							ctrlKey: true,
							bubbles: true,
							cancelable: true,
						})
					);
					return;
				}

				const profileLink = e.target.closest(".wl-user-profile-link");
				if (profileLink) {
					e.preventDefault();
					if (Footer) {
						Footer.navigateToProfile();
					}
					return;
				}

				const settingsToggle = e.target.closest(".wl-settings-toggle");
				if (settingsToggle) {
					e.preventDefault();
					e.stopPropagation();
					if (Footer) {
						Footer.toggleDropup(rootEl);
					}
					return;
				}

				const themeToggle = e.target.closest(".wl-theme-toggle");
				if (themeToggle) {
					e.preventDefault();
					e.stopPropagation();
					if (Footer) {
						Footer.toggleTheme(rootEl);
					}
					return;
				}

				const profileMenuBtn = e.target.closest(".wl-profile-link");
				if (profileMenuBtn) {
					e.preventDefault();
					if (Footer) {
						Footer.closeDropup(rootEl);
						Footer.navigateToProfile();
					}
					return;
				}

				const logoutBtn = e.target.closest(".wl-logout-btn");
				if (logoutBtn) {
					e.preventDefault();
					if (Footer) {
						Footer.closeDropup(rootEl);
					}
					frappe.app.logout();
					return;
				}

				const menuLink = e.target.closest(".wl-menu-link");
				if (menuLink) {
					e.preventDefault();
					const route = menuLink.getAttribute("data-route");
					const openNewTab = menuLink.getAttribute("data-open-new-tab") === "1";
					if (route) {
						Service.navigateToRoute(route, openNewTab);
					}
					Store.setState({ mobileOpen: false });
					return;
				}
			});

			rootEl.addEventListener("change", (e) => {
				const langSelect = e.target.closest(".wl-language-select");
				if (langSelect && Footer) {
					e.stopPropagation();
					Footer.changeLanguage(langSelect.value);
				}
			});

			rootEl.addEventListener("keydown", (e) => {
				const activeEl = document.activeElement;
				if (!rootEl.contains(activeEl)) return;

				if (e.key === "Escape") {
					if (Footer) {
						Footer.closeDropup(rootEl);
					}
					return;
				}

				if (e.key === "Enter") {
					const toggle = activeEl.closest(".wl-group-toggle, .wl-sub-toggle");
					if (toggle) {
						toggle.click();
						e.preventDefault();
						return;
					}
					const menuLink = activeEl.closest(".wl-menu-link");
					if (menuLink) {
						menuLink.click();
						e.preventDefault();
					}
				}
			});

			eventListenersBound = true;
		},
	};
})();
