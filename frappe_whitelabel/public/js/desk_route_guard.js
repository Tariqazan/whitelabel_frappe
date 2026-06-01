/**
 * Global desk route guard — block /desk URLs everywhere (not only sidebar).
 * Rewrites navigation to /app/... at the History API and Frappe router level.
 */
(function () {
	"use strict";

	const DESK_HOME = /^\/desk\/?$/i;
	const APP_HOME = /^\/app\/?$/i;
	const DESK_PREFIX = /^\/desk(\/|$)/i;

	function getHomeRoute() {
		if (typeof frappe !== "undefined" && frappe.boot && frappe.boot.wl_home_route) {
			return frappe.boot.wl_home_route;
		}
		return null;
	}

	function isBareDeskOrApp(path) {
		return DESK_HOME.test(path) || APP_HOME.test(path);
	}

	function toAppPath(path) {
		if (!path) return "";
		let p = String(path).trim();
		if (!p || p === "#") return "";

		if (isBareDeskOrApp(p)) {
			return getHomeRoute() || "/app";
		}
		if (DESK_PREFIX.test(p)) {
			return p.replace(/^\/desk\/?/i, "/app/");
		}
		return p;
	}

	function rewriteUrl(url) {
		if (!url || typeof url !== "string") {
			return url;
		}
		const hashIdx = url.indexOf("#");
		const hash = hashIdx >= 0 ? url.slice(hashIdx) : "";
		const pathQuery = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
		const queryIdx = pathQuery.indexOf("?");
		const path = queryIdx >= 0 ? pathQuery.slice(0, queryIdx) : pathQuery;
		const query = queryIdx >= 0 ? pathQuery.slice(queryIdx) : "";
		if (!DESK_PREFIX.test(path)) {
			return url;
		}
		return toAppPath(path) + query + hash;
	}

	function fixBrowserLocation() {
		const path = window.location.pathname || "";
		if (!DESK_PREFIX.test(path) && !APP_HOME.test(path)) {
			return;
		}
		const target = toAppPath(path) + window.location.search + window.location.hash;
		if (target === path + window.location.search + window.location.hash) {
			return;
		}
		history.replaceState(history.state, "", target);
	}

	function routeToSegments(route) {
		const path = toAppPath(route);
		const home = getHomeRoute();
		if (!path || path === "/app" || path === "/app/") {
			if (home) {
				return routeToSegments(home);
			}
			return null;
		}
		if (/^(https?:)?\/\//i.test(path)) {
			return null;
		}
		let sub = path.replace(/^\//, "");
		if (sub.startsWith("app/")) {
			sub = sub.slice(4);
		}
		if (!sub) {
			return null;
		}
		return sub.split("/").filter(Boolean);
	}

	const Guard = {
		toAppPath,
		rewriteUrl,

		navigate(route, openInNewTab = false) {
			const normalized = toAppPath(route);
			if (!normalized || normalized === "#") {
				return;
			}

			if (/^(https?:)?\/\//i.test(normalized)) {
				window.open(normalized, openInNewTab ? "_blank" : "_self", "noopener,noreferrer");
				return;
			}

			if (openInNewTab) {
				window.open(normalized, "_blank", "noopener,noreferrer");
				return;
			}

			if (typeof frappe === "undefined" || !frappe.set_route) {
				window.location.href = normalized;
				return;
			}

			const segments = routeToSegments(normalized);
			if (segments && segments.length) {
				frappe.set_route(...segments);
				return;
			}

			const home = getHomeRoute();
			if (home && (normalized === "/app" || isBareDeskOrApp(normalized))) {
				this.navigate(home, false);
				return;
			}

			if (normalized === "/app") {
				history.replaceState(history.state, "", "/app" + window.location.search);
				if (frappe.router) {
					frappe.router.route();
				}
			}
		},

		ensureHomeRoute() {
			const home = getHomeRoute();
			if (!home || typeof frappe === "undefined" || !frappe.router) {
				return;
			}

			const path = window.location.pathname || "";
			if (!isBareDeskOrApp(path)) {
				return;
			}

			const sub = frappe.router.get_sub_path();
			if (sub) {
				return;
			}

			this.navigate(home, false);
		},

		patchHistory() {
			if (history.__wl_desk_guard) {
				return;
			}
			["pushState", "replaceState"].forEach((method) => {
				const orig = history[method];
				history[method] = function (state, title, url) {
					return orig.call(this, state, title, rewriteUrl(url));
				};
			});
			history.__wl_desk_guard = true;
		},

		patchFrappeRouter() {
			if (typeof frappe === "undefined" || !frappe.router || frappe.router.__wl_desk_guard) {
				return;
			}

			const router = frappe.router;

			const origMakeUrl = router.make_url.bind(router);
			router.make_url = function (params) {
				let path = origMakeUrl(params);
				return toAppPath(path) || "/app";
			};

			const origPushState = router.push_state.bind(router);
			router.push_state = function (path, query_params = "") {
				return origPushState(toAppPath(path) || "/app", query_params);
			};

			const origStripPrefix = router.strip_prefix.bind(router);
			router.strip_prefix = function (route) {
				let r = origStripPrefix(route);
				if (r === "app") {
					return "";
				}
				if (r.startsWith("app/")) {
					return r.slice(4);
				}
				return r;
			};

			const origSetRoute = frappe.set_route;
			frappe.set_route = function () {
				const args = Array.from(arguments).map((arg) => {
					if (typeof arg === "string" && DESK_PREFIX.test(arg)) {
						return toAppPath(arg).replace(/^\//, "").replace(/^app\/?/, "");
					}
					return arg;
				});
				return origSetRoute.apply(frappe.router, args);
			};

			router.__wl_desk_guard = true;
		},

		bindLinkGuard() {
			if (document.documentElement.__wl_desk_link_guard) {
				return;
			}
			document.documentElement.addEventListener(
				"click",
				(e) => {
					const el = e.target.closest("a[href]");
					if (!el || el.getAttribute("target") === "_blank") {
						return;
					}
					const href = el.getAttribute("href");
					if (!href || !DESK_PREFIX.test(href)) {
						return;
					}
					if (el.hostname && el.hostname !== window.location.hostname) {
						return;
					}
					e.preventDefault();
					e.stopImmediatePropagation();
					Guard.navigate(href, false);
				},
				true
			);
			document.documentElement.__wl_desk_link_guard = true;
		},

		bindPopstate() {
			if (window.__wl_desk_popstate) {
				return;
			}
			window.addEventListener("popstate", () => fixBrowserLocation());
			window.__wl_desk_popstate = true;
		},

		init() {
			this.patchHistory();
			fixBrowserLocation();
			this.bindLinkGuard();
			this.bindPopstate();
			this.patchFrappeRouter();
			this.ensureHomeRoute();
		},
	};

	window.FrappeWhitelabelRouteGuard = Guard;
	window.WhitelabelSidebar = window.WhitelabelSidebar || {};
	window.WhitelabelSidebar.Router = Guard;

	function bootstrap() {
		Guard.init();
		if (typeof frappe !== "undefined" && frappe.router) {
			Guard.ensureHomeRoute();
			return;
		}
		setTimeout(bootstrap, 50);
	}

	Guard.patchHistory();
	fixBrowserLocation();
	Guard.bindLinkGuard();
	Guard.bindPopstate();
	bootstrap();
})();
