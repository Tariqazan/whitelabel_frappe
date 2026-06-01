# -*- coding: utf-8 -*-
# Copyright (c) 2026, Tariqul Islam and contributors
# For license information, please see license.txt

import frappe

def execute():
	"""
	Post-migrate patch to establish default sidebar configuration and nesting links.
	"""
	# Check if configuration already exists to prevent duplicates
	if frappe.db.exists("Sidebar Configuration", "Global Sidebar Settings"):
		return

	# Enable Whitelabel theme / configurations cleanly
	try:
		sidebar_config = frappe.get_doc({
			"doctype": "Sidebar Configuration",
			"name": "Global Sidebar Settings",
			"sidebar_name": "Default Enterprise Sidebar",
			"company": "Frappe Whitelabel",
			"enable_favorites": 1,
			"enable_recent_items": 1,
			"enable_search": 1,
			"sidebar_theme": "System",
			"collapse_by_default": 0,
			"active": 1,
			"menu_items": [
				# Sales Group
				{
					"label": "Sales",
					"sequence": 1,
					"enabled": 1,
					"route_type": "Workspace",
					"workspace_link": "Selling"
				},
				{
					"label": "Quotations",
					"parent_item": "Sales",
					"sequence": 2,
					"enabled": 1,
					"route_type": "DocType",
					"doctype_link": "Quotation"
				},
				{
					"label": "Sales Orders",
					"parent_item": "Sales",
					"sequence": 3,
					"enabled": 1,
					"route_type": "DocType",
					"doctype_link": "Sales Order"
				},
				{
					"label": "Delivery Notes",
					"parent_item": "Sales",
					"sequence": 4,
					"enabled": 1,
					"route_type": "DocType",
					"doctype_link": "Delivery Note"
				},
				
				# Accounts Group
				{
					"label": "Accounts",
					"sequence": 5,
					"enabled": 1,
					"route_type": "Workspace",
					"workspace_link": "Buying"
				},
				{
					"label": "Payment Entry",
					"parent_item": "Accounts",
					"sequence": 6,
					"enabled": 1,
					"route_type": "DocType",
					"doctype_link": "Payment Entry"
				},
				{
					"label": "Journal Entry",
					"parent_item": "Accounts",
					"sequence": 7,
					"enabled": 1,
					"route_type": "DocType",
					"doctype_link": "Journal Entry"
				},
				
				# HR Group
				{
					"label": "HR",
					"sequence": 8,
					"enabled": 1,
					"route_type": "Workspace",
					"workspace_link": "HR"
				},
				{
					"label": "Employee",
					"parent_item": "HR",
					"sequence": 9,
					"enabled": 1,
					"route_type": "DocType",
					"doctype_link": "Employee"
				},
				{
					"label": "Leave Application",
					"parent_item": "HR",
					"sequence": 10,
					"enabled": 1,
					"route_type": "DocType",
					"doctype_link": "Leave Application"
				}
			]
		})
		
		sidebar_config.insert(ignore_permissions=True)
		frappe.db.commit()
	except Exception as e:
		frappe.log_error(f"Error seeding default Sidebar Configuration: {str(e)}", "Sidebar Redesign")
