# -*- coding: utf-8 -*-
# Copyright (c) 2026, Tariqul Islam and contributors
# For license information, please see license.txt

import re

import frappe

DESK_PATH_RE = re.compile(r"^/desk(/.*)?$", re.I)


def desk_path_to_app(path: str) -> str:
	"""Convert /desk or /desk/foo to /app or /app/foo."""
	if not path or not DESK_PATH_RE.match(path):
		return path
	if path in ("/desk", "/desk/"):
		return "/app"
	return "/app" + path[5:]


def block_desk_urls():
	"""
	Global request guard: keep /app URLs on /app (block Frappe core /app -> /desk redirects).

	Note: /desk -> /app is handled via website_redirects in hooks.py, not here.
	frappe.redirect() must not be used in before_request — Redirect is only
	caught inside the website get_response() flow.
	"""
	if not getattr(frappe.local, "request", None):
		return

	path = frappe.request.path or ""

	if path == "/app" or path.startswith("/app/"):
		_prevent_app_to_desk_redirect(path)


def _prevent_app_to_desk_redirect(path: str):
	"""Stop cached /app -> /desk website redirects from Frappe core."""
	frappe.cache.hset("website_redirects", path, False)
	qs = frappe.request.query_string
	if qs:
		path_with_qs = path + "?" + qs.decode("utf-8", errors="ignore")
		frappe.cache.hset("website_redirects", path_with_qs, False)


def normalize_boot_path(path: str | None) -> str:
	if not path:
		return path or ""
	path = str(path).strip()
	if DESK_PATH_RE.match(path):
		return desk_path_to_app(path)
	return path
