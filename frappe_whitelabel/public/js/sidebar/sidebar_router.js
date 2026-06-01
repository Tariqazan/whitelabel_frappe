/**
 * Sidebar navigation — delegates to global FrappeWhitelabelRouteGuard.
 */
(function () {
	"use strict";

	window.WhitelabelSidebar = window.WhitelabelSidebar || {};

	const Guard = window.FrappeWhitelabelRouteGuard;

	WhitelabelSidebar.Router = {
		normalizeRoute: (route) => (Guard ? Guard.toAppPath(route) : route),
		navigate: (route, openInNewTab) => {
			if (Guard) {
				Guard.navigate(route, openInNewTab);
			}
		},
		patchFrappeRouter: () => Guard && Guard.patchFrappeRouter(),
		bindDeskLinkGuard: () => Guard && Guard.bindLinkGuard(),
	};
})();
