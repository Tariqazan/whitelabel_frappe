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

	if (row.route_type === "DocType" && row.doctype_link) {
		return `/app/${slugify(row.doctype_link)}`;
	}
	if (row.route_type === "Report" && row.report_link) {
		return `/app/query-report/${slugify(row.report_link)}`;
	}
	if (row.route_type === "Page" && row.page_link) {
		return `/app/${slugify(row.page_link)}`;
	}
	if (row.route_type === "Workspace" && row.workspace_link) {
		return `/app/${slugify(row.workspace_link)}`;
	}
	if (row.route_type === "URL" && row.url) {
		return frappe_whitelabel.normalize_sidebar_route(row.url);
	}
	if (row.route_type === "Custom Route" && row.custom_route) {
		return frappe_whitelabel.normalize_sidebar_route(row.custom_route);
	}
	return frappe_whitelabel.normalize_sidebar_route(row.route || "");
};

frappe.whitelabel_sync_sidebar_route = function (frm, cdt, cdn, only_if_empty = false) {
	const row = locals[cdt][cdn];
	if (only_if_empty && row.route) {
		return;
	}
	const built = frappe_whitelabel.build_sidebar_route(row);
	if (built) {
		frappe.model.set_value(cdt, cdn, "route", built);
	}
};

const sidebar_route_triggers = [
	"route_type",
	"doctype_link",
	"report_link",
	"page_link",
	"workspace_link",
	"url",
	"custom_route",
];

frappe.ui.form.on("Sidebar Menu Item", {
	form_render(frm, cdt, cdn) {
		frappe.whitelabel_sync_sidebar_route(frm, cdt, cdn, true);
	},
});

sidebar_route_triggers.forEach((fieldname) => {
	frappe.ui.form.on("Sidebar Menu Item", fieldname, (frm, cdt, cdn) => {
		frappe.whitelabel_sync_sidebar_route(frm, cdt, cdn, false);
	});
});

frappe.ui.form.on("Sidebar Configuration", "menu_items", {
	add(frm, cdt, cdn) {
		frappe.whitelabel_sync_sidebar_route(frm, cdt, cdn, true);
	},
});
