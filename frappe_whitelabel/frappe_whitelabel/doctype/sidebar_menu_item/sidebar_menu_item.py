# -*- coding: utf-8 -*-
# Copyright (c) 2026, Tariqul Islam and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class SidebarMenuItem(Document):
	def before_save(self):
		from frappe_whitelabel.api.sidebar import build_route, normalize_route

		if (self.route or "").strip():
			self.route = normalize_route(self.route)
		else:
			self.route = build_route(self)
