/**
 * Whitelabel Sidebar Service Layer
 * Coordinates APIs, Favorites pinning, and Recents logging.
 */

(function () {
	"use strict";

	window.WhitelabelSidebar = window.WhitelabelSidebar || {};

	const Store = WhitelabelSidebar.Store;

	WhitelabelSidebar.Service = {
		/**
		 * Fetch sidebar data from Python API
		 */
		async fetchSidebarData() {
			return new Promise((resolve, reject) => {
				frappe.call({
					method: "frappe_whitelabel.api.sidebar.get_sidebar_data",
					callback: (r) => {
						if (r.message) {
							const data = r.message;
							// Update store with fetched menu items, company details, and features settings
							Store.setState({
								company: data.company,
								settings: data.settings,
								menuItems: data.menu || [],
								routeGuard: data.route_guard || {
									enabled: false,
									allowed_routes: [],
								},
							});
							if (WhitelabelSidebar.RouteAllowlist) {
								WhitelabelSidebar.RouteAllowlist.syncFromSidebarData(data);
								WhitelabelSidebar.RouteAllowlist.enforceCurrentRoute();
							}
							resolve(data);
						} else {
							reject("No data returned from sidebar API");
						}
					},
					error: (err) => {
						reject(err);
					}
				});
			});
		},

		/**
		 * Toggle favorite status of a menu item
		 */
		toggleFavorite(item) {
			const favorites = Store.get("favorites");
			const exists = favorites.find(fav => fav.route === item.route);

			let newFavorites;
			if (exists) {
				newFavorites = favorites.filter(fav => fav.route !== item.route);
			} else {
				newFavorites = [...favorites, {
					label: item.label,
					icon: item.icon,
					route: item.route,
					open_in_new_tab: item.open_in_new_tab
				}];
			}

			Store.setState({ favorites: newFavorites });
		},

		/**
		 * Track and update recent items based on visited Desk route
		 */
		trackRecentVisited() {
			const Theme = WhitelabelSidebar.Theme;
			const currentPath = Theme
				? Theme.getCurrentPath()
				: "/app/" + frappe.get_route_str();

			if (!currentPath) {
				return;
			}

			const flatItems = this.getFlatMenuItems(Store.get("menuItems"));
			let matched = null;
			let bestLen = 0;

			flatItems.forEach((item) => {
				const route = Theme ? Theme.normalizePath(item.route) : item.route;
				if (!route) {
					return;
				}
				const exact = currentPath === route;
				const nested = currentPath.startsWith(route + "/");
				if ((exact || nested) && route.length >= bestLen) {
					matched = item;
					bestLen = route.length;
				}
			});

			if (matched) {
				const recents = Store.get("recents");
				// Remove if already exists to push it to the top
				const filtered = recents.filter(r => r.route !== matched.route);
				const newRecents = [
					{
						label: matched.label,
						icon: matched.icon,
						route: matched.route,
						open_in_new_tab: matched.open_in_new_tab
					},
					...filtered
				].slice(0, 5); // Limit to top 5 recent items

				Store.setState({ recents: newRecents });
			}
		},

		/**
		 * Navigate using Frappe router (SPA). Never uses /desk URLs.
		 */
		navigateToRoute(route, openInNewTab = false) {
			const Router = WhitelabelSidebar.Router;
			if (Router) {
				Router.navigate(route, openInNewTab);
				return;
			}
			if (!route || route === "#" || /^\/desk\/?$/i.test(route) || /^\/app\/?$/i.test(route)) {
				const home =
					Store.get().settings?.home_route ||
					(typeof frappe !== "undefined" && frappe.boot?.wl_home_route);
				if (home) {
					route = home;
				} else {
					return;
				}
			}
			frappe.set_route(route.replace(/^\/desk\/?/i, "").replace(/^\//, ""));
		},

		/**
		 * Flatten nesting structure for convenient querying/searching
		 */
		getFlatMenuItems(menuItems) {
			let flat = [];
			function traverse(nodes) {
				nodes.forEach(node => {
					flat.push(node);
					if (node.children && node.children.length) {
						traverse(node.children);
					}
				});
			}
			traverse(menuItems);
			return flat;
		}
	};
})();
