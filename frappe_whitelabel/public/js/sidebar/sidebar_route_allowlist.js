/**
 * Restrict non-Administrator users to sidebar-configured routes only.
 */
(function () {
	"use strict";

	window.WhitelabelSidebar = window.WhitelabelSidebar || {};

	function normalizePath(path) {
		const Theme = WhitelabelSidebar.Theme;
		if (Theme && Theme.normalizePath) {
			return Theme.normalizePath(path);
		}
		if (!path || path === "#") {
			return "";
		}
		let p = String(path).trim();
		// Decode percent-encoding so "/app/query-report/Trial%20Balance"
		// matches stored route "/app/query-report/Trial Balance"
		try {
			p = decodeURIComponent(p);
		} catch (e) {
			/* keep raw if malformed encoding */
		}
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

	function getAllowedRoutes() {
		const storeRoutes = WhitelabelSidebar.Store?.get?.()?.routeGuard?.allowed_routes;
		if (storeRoutes && storeRoutes.length) {
			return storeRoutes;
		}
		return frappe.boot?.wl_allowed_routes || [];
	}

	function isActive() {
		if (frappe.session.user === "Administrator") {
			return false;
		}
		if (WhitelabelSidebar.Store?.get?.()?.routeGuard?.enabled) {
			return true;
		}
		return Boolean(frappe.boot?.wl_route_guard);
	}

	function isSetupWizardPath(path) {
		return (
			!frappe.boot?.setup_complete &&
			(path === "/app/setup-wizard" || path.startsWith("/app/setup-wizard/"))
		);
	}

	/** Logged-in user's own profile (Form/User/<session.user>). */
	function isOwnUserProfilePath(path) {
		const user = frappe.session?.user;
		if (!user || user === "Guest") {
			return false;
		}

		const normalized = normalizePath(path);
		if (!normalized.startsWith("/app/user/")) {
			return false;
		}

		let docname = normalized.slice("/app/user/".length).split("/")[0];
		try {
			docname = decodeURIComponent(docname);
		} catch (e) {
			/* keep raw */
		}

		return docname.toLowerCase() === user.toLowerCase();
	}

	function isPathAllowed(path) {
		if (!isActive()) {
			return true;
		}

		const normalized = normalizePath(path);
		if (!normalized || normalized === "/app") {
			return true;
		}

		if (isSetupWizardPath(normalized)) {
			return true;
		}

		if (isOwnUserProfilePath(normalized)) {
			return true;
		}

		const allowed = getAllowedRoutes();
		for (let i = 0; i < allowed.length; i++) {
			const route = normalizePath(allowed[i]);
			if (!route || route === "#") {
				continue;
			}
			if (normalized === route || normalized.startsWith(route + "/")) {
				return true;
			}
		}

		return false;
	}

	function getFallbackRoute() {
		const home = frappe.boot?.wl_home_route;
		if (home && isPathAllowed(home)) {
			return home;
		}
		const allowed = getAllowedRoutes();
		return allowed.length ? allowed[0] : "/app";
	}

	function redirectToFallback() {
		const fallback = getFallbackRoute();
		const Guard = window.FrappeWhitelabelRouteGuard;
		frappe.show_alert?.({
			message: __("You do not have access to this page"),
			indicator: "orange",
		});
		if (Guard) {
			Guard.navigate(fallback, false);
		} else if (typeof frappe.set_route === "function") {
			frappe.set_route(fallback.replace(/^\//, "").replace(/^app\/?/, ""));
		} else {
			window.location.href = fallback;
		}
	}

	function enforceCurrentRoute() {
		if (!isActive()) {
			return;
		}
		const path = normalizePath(window.location.pathname);
		if (!isPathAllowed(path)) {
			redirectToFallback();
		}
	}

	function syncFromSidebarData(data) {
		if (!data?.route_guard) {
			return;
		}
		frappe.boot.wl_route_guard = data.route_guard.enabled;
		frappe.boot.wl_allowed_routes = data.route_guard.allowed_routes || [];
		if (WhitelabelSidebar.Store) {
			WhitelabelSidebar.Store.setState({
				routeGuard: {
					enabled: data.route_guard.enabled,
					allowed_routes: data.route_guard.allowed_routes || [],
				},
			});
		}
	}

	function patchFrappeRouter() {
		if (typeof frappe === "undefined" || !frappe.router || frappe.router.__wl_allowlist_guard) {
			return;
		}

		const router = frappe.router;
		const origSetRoute = frappe.set_route;

		frappe.set_route = function () {
			if (!isActive()) {
				return origSetRoute.apply(router, arguments);
			}

			const args = Array.from(arguments);
			const stdRoute = router.get_route_from_arguments(args);
			if (
				stdRoute[0] &&
				stdRoute[0].toLowerCase() === "form" &&
				router.slug(stdRoute[1] || "") === "user" &&
				stdRoute[2] &&
				String(stdRoute[2]).toLowerCase() === String(frappe.session.user).toLowerCase()
			) {
				return origSetRoute.apply(router, arguments);
			}

			let route = stdRoute;
			route = router.convert_from_standard_route(route);
			const url = router.make_url(route);
			const path = normalizePath(
				window.FrappeWhitelabelRouteGuard
					? window.FrappeWhitelabelRouteGuard.toAppPath(url)
					: url
			);

			if (path && !isPathAllowed(path)) {
				redirectToFallback();
				return Promise.resolve();
			}

			return origSetRoute.apply(router, arguments);
		};

		const origRoute = router.route.bind(router);
		router.route = async function () {
			await origRoute();
			enforceCurrentRoute();
		};

		frappe.router.__wl_allowlist_guard = true;
	}

	function bindLinkGuard() {
		if (document.documentElement.__wl_allowlist_link_guard) {
			return;
		}

		document.documentElement.addEventListener(
			"click",
			(e) => {
				if (!isActive()) {
					return;
				}
				const el = e.target.closest("a[href]");
				if (!el || el.getAttribute("target") === "_blank") {
					return;
				}
				const href = el.getAttribute("href");
				if (!href || href.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(href)) {
					return;
				}
				if (el.hostname && el.hostname !== window.location.hostname) {
					return;
				}
				let path = href;
				if (!path.startsWith("/")) {
					try {
						path = new URL(href, window.location.origin).pathname;
					} catch (err) {
						return;
					}
				}
				if (!path.startsWith("/app") && !path.startsWith("/desk")) {
					return;
				}
				if (!isPathAllowed(path)) {
					e.preventDefault();
					e.stopImmediatePropagation();
					redirectToFallback();
				}
			},
			true
		);

		document.documentElement.__wl_allowlist_link_guard = true;
	}

	function bindPageChange() {
		if (window.__wl_allowlist_page_change) {
			return;
		}
		$(document).on("page-change.wl-allowlist", () => {
			enforceCurrentRoute();
		});
		window.__wl_allowlist_page_change = true;
	}

	WhitelabelSidebar.RouteAllowlist = {
		normalizePath,
		isActive,
		isOwnUserProfilePath,
		isPathAllowed,
		enforceCurrentRoute,
		redirectToFallback,
		syncFromSidebarData,
		init() {
			patchFrappeRouter();
			bindLinkGuard();
			bindPageChange();
			enforceCurrentRoute();
		},
	};

	function bootstrap() {
		if (typeof frappe === "undefined" || !frappe.boot) {
			setTimeout(bootstrap, 50);
			return;
		}
		WhitelabelSidebar.RouteAllowlist.init();
	}

	if (typeof frappe !== "undefined" && typeof frappe.ready === "function") {
		frappe.ready(bootstrap);
	} else {
		document.addEventListener("DOMContentLoaded", bootstrap);
	}
})();
