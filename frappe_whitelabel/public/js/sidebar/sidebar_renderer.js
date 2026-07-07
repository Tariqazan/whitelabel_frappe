/**
 * Whitelabel Sidebar Renderer
 * Compiles and mounts the HTML template based on state updates.
 */

(function () {
	"use strict";

	window.WhitelabelSidebar = window.WhitelabelSidebar || {};

	const Store = WhitelabelSidebar.Store;
	const Service = WhitelabelSidebar.Service;
	const Theme = WhitelabelSidebar.Theme;

	let templateCache = null;

	WhitelabelSidebar.Renderer = {
		/**
		 * Fetch the sidebar HTML template from assets
		 */
		async getTemplate() {
			if (templateCache) return templateCache;

			try {
				const response = await fetch("/assets/frappe_whitelabel/templates/sidebar.html", { cache: "no-store" });
				if (!response.ok) throw new Error("Failed to load sidebar template");
				templateCache = await response.text();
				return templateCache;
			} catch (e) {
				console.error("[WhitelabelSidebar] Error fetching template:", e);
				// Fallback minimal template
				return `<div class="wl-sidebar-container"><div class="wl-sidebar-header"><span class="wl-company-name">{{ company.name }}</span></div></div>`;
			}
		},

		/**
		 * Render and mount the sidebar DOM
		 */
		async render(targetEl) {
			if (!targetEl) return;

			const state = Store.get();
			const template = await this.getTemplate();

			// 1. Compute favorites check for dynamic styling
			const favorites = state.favorites || [];
			const favoritesRoutes = new Set(favorites.map(f => f.route));

			// Process root menu items (no parent) and inject isFavorite on leaves
			const menu = (state.menuItems || []).map(item => {
				const subChildren = (item.children || []).map(sub => ({
					...sub,
					isFavorite: favoritesRoutes.has(sub.route)
				}));
				return {
					...item,
					children: subChildren,
					isFavorite: favoritesRoutes.has(item.route)
				};
			});

			// 2. Perform menu filtering if search text exists
			let filteredItems = [];
			if (state.searchText) {
				const flatItems = Service.getFlatMenuItems(state.menuItems);
				const query = state.searchText.toLowerCase().trim();
				filteredItems = flatItems.filter(item => {
					// We only want leaf/clickable nodes in search results (items with a route)
					return item.route && item.route !== "#" && item.label.toLowerCase().includes(query);
				});
			}

			// Render template using Frappe's client-side micro-jinja
			const renderedHtml = frappe.render(template, {
				company: Object.assign({}, state.company || { name: "Frappe Whitelabel", logo: null, avatar: null }, {
					initial: (state.company && state.company.name) ? state.company.name[0].toUpperCase() : ""
				}),
				settings: state.settings || {},
				searchText: state.searchText,
				favorites: favorites,
				recents: state.recents || [],
				menu: menu,
				results: filteredItems
			});

			// Update DOM
			targetEl.innerHTML = renderedHtml;

			// 3. Dynamic theme colors from Sidebar Configuration
			if (Theme) {
				Theme.applyColors(targetEl, state.settings || {});
				Theme.watchSystemTheme(targetEl, state.settings || {});
			}

			// 4. Footer dropup (theme, language, profile)
			if (WhitelabelSidebar.Footer) {
				WhitelabelSidebar.Footer.init(targetEl);
			}

			// 5. Highlight current active route
			this.highlightActiveRoute(targetEl);

			// 6. Adjust state classes on main page body
			this.updateLayoutClasses();
		},

		/**
		 * Highlights the active menu item anchor inside the sidebar
		 */
		highlightActiveRoute(container) {
			container.querySelectorAll(".wl-menu-item-wrapper.active, .wl-menu-item-wrapper.active-parent").forEach((el) => {
				el.classList.remove("active", "active-parent");
			});
			container.querySelectorAll(".wl-menu-link.active").forEach((el) => {
				el.classList.remove("active");
			});

			const match = Theme
				? Theme.findActiveWrapper(container)
				: null;

			if (!match) {
				return;
			}

			match.classList.add("active");
			const link = match.querySelector(".wl-menu-link");
			if (link) {
				link.classList.add("active");
			}

			const parentSubItems = match.closest(".wl-sub-items");
			if (parentSubItems) {
				parentSubItems.classList.add("wl-expanded");
				const parentWrapper = parentSubItems.closest(".wl-menu-item-wrapper.has-sub-items");
				if (parentWrapper) {
					parentWrapper.classList.add("active-parent");
					const parentToggle = parentWrapper.querySelector(".wl-sub-toggle");
					if (parentToggle) {
						parentToggle.setAttribute("aria-expanded", "true");
					}
				}
			}
		},

		/**
		 * Synchronizes layout classes on document body
		 */
		updateLayoutClasses() {
			const state = Store.get();
			document.body.classList.toggle("wl-sidebar-collapsed", state.collapsed);
			document.body.classList.toggle("wl-sidebar-mobile-open", state.mobileOpen);
		}
	};
})();
