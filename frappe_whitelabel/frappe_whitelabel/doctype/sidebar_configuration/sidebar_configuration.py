# -*- coding: utf-8 -*-
# Copyright (c) 2026, Tariqul Islam and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class SidebarConfiguration(Document):
	def on_update(self):
		# Refresh merged translations if language files changed
		from frappe.translate import clear_cache as clear_translation_cache

		clear_translation_cache()

		from frappe_whitelabel.utils.route_guard import sync_whitelabel_home_redirect

		sync_whitelabel_home_redirect()
