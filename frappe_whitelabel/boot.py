# -*- coding: utf-8 -*-
# Copyright (c) 2026, Tariqul Islam and contributors
# For license information, please see license.txt

from frappe_whitelabel.api.sidebar import get_route_guard_bootinfo, get_whitelabel_home_route
from frappe_whitelabel.utils.route_guard import normalize_boot_path


def session_boot(bootinfo):
	"""Ensure boot defaults never point at /desk; use Sidebar Configuration home."""
	bootinfo.update(get_route_guard_bootinfo())

	home_route = get_whitelabel_home_route()

	if home_route:
		bootinfo["wl_home_route"] = home_route
		if bootinfo.get("apps_data") is not None:
			bootinfo["apps_data"]["default_path"] = home_route

	if bootinfo.get("apps_data"):
		default_path = bootinfo["apps_data"].get("default_path")
		if default_path:
			bootinfo["apps_data"]["default_path"] = normalize_boot_path(default_path)

	for app in bootinfo.get("apps") or []:
		if app.get("route"):
			app["route"] = normalize_boot_path(app["route"])

	if bootinfo.get("home_page"):
		bootinfo["home_page"] = normalize_boot_path(bootinfo["home_page"])
