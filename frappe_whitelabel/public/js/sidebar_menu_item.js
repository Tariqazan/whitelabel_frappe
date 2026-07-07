/**
 * Sidebar Menu Item — always-visible Route URL with auto-fill from route type/links.
 */

frappe.provide("frappe_whitelabel");

frappe_whitelabel.normalize_sidebar_route = function (route) {
	if (!route) return "";
	route = String(route).trim();
	if (route === "#" || route === "/desk" || route === "desk" || route === "/desk/") {
		return "";
	}
	if (route.startsWith("/desk/")) {
		return "/app/" + route.slice(6);
	}
	if (route.startsWith("desk/")) {
		return "/app/" + route.slice(5);
	}
	return route;
};

frappe_whitelabel.build_sidebar_route = function (row) {
	if (!row) return "";

	const slugify = (text) => {
		if (!text) return "";
		return String(text).toLowerCase().replace(/ /g, "-").replace(/_/g, "-");
	};

	if (row.route_type === "DocType" && row.link_to) {
		return `/app/${slugify(row.link_to)}`;
	}
	if (row.route_type === "Report" && row.link_to) {
		return `/app/query-report/${slugify(row.link_to)}`;
	}
	if (row.route_type === "Page" && row.link_to) {
		return `/app/${slugify(row.link_to)}`;
	}
	if (row.route_type === "Workspace" && row.link_to) {
		return `/app/${slugify(row.link_to)}`;
	}
	if (row.route_type === "URL" && row.url) {
		return frappe_whitelabel.normalize_sidebar_route(row.url);
	}
	if (row.route_type === "Custom Route" && row.custom_route) {
		return frappe_whitelabel.normalize_sidebar_route(row.custom_route);
	}
	return frappe_whitelabel.normalize_sidebar_route(row.route || "");
};

frappe.whitelabel_sync_sidebar_route = function (frm, only_if_empty = false) {
	if (only_if_empty && frm.doc.route) {
		return;
	}
	const built = frappe_whitelabel.build_sidebar_route(frm.doc);
	if (built) {
		frm.set_value("route", built);
	}
};

const sidebar_route_triggers = [
	"route_type",
	"link_to",
	"url",
	"custom_route",
];

frappe.ui.form.on("Sidebar Menu Item", {
	refresh(frm) {
		frappe.whitelabel_sync_sidebar_route(frm, true);
	},
});

sidebar_route_triggers.forEach((fieldname) => {
	frappe.ui.form.on("Sidebar Menu Item", fieldname, (frm) => {
		frappe.whitelabel_sync_sidebar_route(frm, false);
	});
});
