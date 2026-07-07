# -*- coding: utf-8 -*-
# Copyright (c) 2026, Tariqul Islam and contributors
# For license information, please see license.txt

import frappe


def execute():
	"""
	Sidebar Menu Item redesign:
	- doctype_link / report_link / page_link / workspace_link -> single `link_to` (Dynamic Link)
	- single `permission_rule` (Role) -> `roles` (Table MultiSelect, Sidebar Menu Item Role)

	Frappe's schema sync never drops columns removed from a DocType's fields, so the old
	columns are still readable via raw SQL at this point even though they're no longer
	part of the doctype definition.
	"""
	if not frappe.db.exists("DocType", "Sidebar Menu Item"):
		return

	columns = set(frappe.db.get_table_columns("Sidebar Menu Item"))

	if "link_to" in columns:
		link_field_by_route_type = {
			"DocType": "doctype_link",
			"Report": "report_link",
			"Page": "page_link",
			"Workspace": "workspace_link",
		}
		for route_type, old_field in link_field_by_route_type.items():
			if old_field not in columns:
				continue
			frappe.db.sql(
				f"""
				UPDATE `tabSidebar Menu Item`
				SET `link_to` = `{old_field}`
				WHERE `route_type` = %s
					AND (`link_to` IS NULL OR `link_to` = '')
					AND `{old_field}` IS NOT NULL
					AND `{old_field}` != ''
				""",
				route_type,
			)

	if "permission_rule" in columns and frappe.db.exists("DocType", "Sidebar Menu Item Role"):
		rows = frappe.db.sql(
			"""
			SELECT name, permission_rule FROM `tabSidebar Menu Item`
			WHERE permission_rule IS NOT NULL AND permission_rule != ''
			""",
			as_dict=True,
		)
		for row in rows:
			already_migrated = frappe.db.exists(
				"Sidebar Menu Item Role",
				{
					"parent": row.name,
					"parenttype": "Sidebar Menu Item",
					"role": row.permission_rule,
				},
			)
			if already_migrated:
				continue

			frappe.get_doc(
				{
					"doctype": "Sidebar Menu Item Role",
					"parent": row.name,
					"parenttype": "Sidebar Menu Item",
					"parentfield": "roles",
					"role": row.permission_rule,
				}
			).insert(ignore_permissions=True)

	frappe.db.commit()
