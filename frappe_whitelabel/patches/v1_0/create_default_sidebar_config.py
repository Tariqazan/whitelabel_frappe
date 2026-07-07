# -*- coding: utf-8 -*-
# Copyright (c) 2026, Tariqul Islam and contributors
# For license information, please see license.txt

import frappe

DEFAULT_MENU_ITEMS = [
	# Sales Group
	{"label": "Sales", "sequence": 1, "enabled": 1, "route_type": "Workspace", "link_to": "Selling"},
	{
		"label": "Quotations",
		"parent_item": "Sales",
		"sequence": 2,
		"enabled": 1,
		"route_type": "DocType",
		"link_to": "Quotation",
	},
	{
		"label": "Sales Orders",
		"parent_item": "Sales",
		"sequence": 3,
		"enabled": 1,
		"route_type": "DocType",
		"link_to": "Sales Order",
	},
	{
		"label": "Delivery Notes",
		"parent_item": "Sales",
		"sequence": 4,
		"enabled": 1,
		"route_type": "DocType",
		"link_to": "Delivery Note",
	},
	# Accounts Group
	{"label": "Accounts", "sequence": 5, "enabled": 1, "route_type": "Workspace", "link_to": "Buying"},
	{
		"label": "Payment Entry",
		"parent_item": "Accounts",
		"sequence": 6,
		"enabled": 1,
		"route_type": "DocType",
		"link_to": "Payment Entry",
	},
	{
		"label": "Journal Entry",
		"parent_item": "Accounts",
		"sequence": 7,
		"enabled": 1,
		"route_type": "DocType",
		"link_to": "Journal Entry",
	},
	# HR Group
	{"label": "HR", "sequence": 8, "enabled": 1, "route_type": "Workspace", "link_to": "HR"},
	{
		"label": "Employee",
		"parent_item": "HR",
		"sequence": 9,
		"enabled": 1,
		"route_type": "DocType",
		"link_to": "Employee",
	},
	{
		"label": "Leave Application",
		"parent_item": "HR",
		"sequence": 10,
		"enabled": 1,
		"route_type": "DocType",
		"link_to": "Leave Application",
	},
]


def execute():
	"""
	Post-migrate patch to establish default sidebar configuration and menu items.

	Sidebar Menu Item is a standalone DocType (see v1_1 migration for the
	child-table-inside-a-child-table redesign), so default items are created
	as independent documents rather than nested inside Sidebar Configuration.
	"""
	try:
		config = frappe.get_single("Sidebar Configuration")
		if not config.sidebar_name:
			config.update(
				{
					"sidebar_name": "Default Enterprise Sidebar",
					"company": "Frappe Whitelabel",
					"enable_favorites": 1,
					"enable_recent_items": 1,
					"enable_search": 1,
					"sidebar_theme": "System",
					"collapse_by_default": 0,
					"active": 1,
				}
			)
			config.save(ignore_permissions=True)

		if not frappe.db.exists("Sidebar Menu Item"):
			for item in DEFAULT_MENU_ITEMS:
				frappe.get_doc({"doctype": "Sidebar Menu Item", **item}).insert(ignore_permissions=True)

		frappe.db.commit()
	except Exception:
		frappe.log_error(title="Sidebar Redesign", message=frappe.get_traceback())
