# -*- coding: utf-8 -*-
# Copyright (c) 2026, Tariqul Islam and contributors
# For license information, please see license.txt

from urllib.parse import unquote

import frappe
from frappe import _


def is_unrestricted_user(user=None):
	"""Administrator bypasses sidebar route allowlist."""
	user = user or frappe.session.user
	return user == "Administrator"


def get_active_sidebar_configuration():
	try:
		doc = frappe.get_single("Sidebar Configuration")
	except frappe.DoesNotExistError:
		return None
	if not doc or not doc.active:
		return None
	return doc


def get_accessible_sidebar_items(doc, user=None):
	"""Menu items the user may see (enabled, role, route permissions)."""
	user = user or frappe.session.user
	accessible_items = []

	for item in doc.get("menu_items") or []:
		if not item.enabled:
			continue

		if item.permission_rule and item.permission_rule not in frappe.get_roles(user):
			continue

		if not has_route_permission(item, user):
			continue

		route = build_route(item)
		accessible_items.append(
			{
				"label": item.label,
				"icon": item.icon,
				"parent_item": item.parent_item,
				"sequence": item.sequence or 0,
				"route": route,
				"open_in_new_tab": item.open_in_new_tab or 0,
				"route_type": item.route_type,
			}
		)

	accessible_items.sort(key=lambda x: (x["sequence"], x["label"]))
	return accessible_items


def collect_allowed_routes(items, home_route=None, user=None):
	"""Unique normalized /app routes from sidebar items + home + profile."""
	user = user or frappe.session.user
	routes = []
	seen = set()

	def add(route):
		route = normalize_route((route or "").strip())
		if not route or route == "#" or route in seen:
			return
		if route.startswith("http://") or route.startswith("https://"):
			return
		seen.add(route)
		routes.append(route)

	if home_route:
		add(home_route)

	for item in items:
		add(item.get("route"))

	for system_route in get_system_allowed_routes(user):
		add(system_route)

	return routes


def get_system_allowed_routes(user):
	"""Routes required for built-in desk actions (own user profile)."""
	if is_unrestricted_user(user) or not user:
		return []

	routes = [f"/app/user/{user}"]
	slug = slugify(user)
	if slug:
		routes.append(f"/app/user/{slug}")
	frappe_slug = user.lower().replace(" ", "-")
	if frappe_slug:
		routes.append(f"/app/user/{frappe_slug}")

	return list(dict.fromkeys(routes))


def is_own_user_profile_path(path, user=None):
	"""Allow /app/user/<name> only when <name> is the logged-in user."""
	user = user or frappe.session.user
	if not user:
		return False

	path = normalize_route(path or "")
	if not path.startswith("/app/user/"):
		return False

	docname = path[len("/app/user/") :].split("/")[0]
	docname = unquote(docname)
	return docname.casefold() == user.casefold()


def is_path_allowed(path, allowed_routes, user=None):
	"""True if path matches an allowed route prefix (or system/setup exceptions)."""
	user = user or frappe.session.user
	if is_unrestricted_user(user):
		return True

	path = normalize_route(path or "")
	if not path or path in ("/app", "/app/"):
		return True

	if not frappe.is_setup_complete():
		if path == "/app/setup-wizard" or path.startswith("/app/setup-wizard/"):
			return True

	if is_own_user_profile_path(path, user):
		return True

	for route in allowed_routes or []:
		route = normalize_route(route)
		if not route or route == "#":
			continue
		if path == route or path.startswith(route + "/"):
			return True

	return False


def get_route_guard_bootinfo(user=None):
	"""Boot session flags for client-side route allowlist."""
	user = user or frappe.session.user
	if is_unrestricted_user(user):
		return {"wl_route_guard": False, "wl_allowed_routes": []}

	doc = get_active_sidebar_configuration()
	if not doc:
		return {"wl_route_guard": False, "wl_allowed_routes": []}

	items = get_accessible_sidebar_items(doc, user)
	home_route = get_whitelabel_home_route(doc)
	allowed = collect_allowed_routes(items, home_route, user)

	return {
		"wl_route_guard": bool(allowed),
		"wl_allowed_routes": allowed,
	}


@frappe.whitelist()
def get_sidebar_data():
	"""
	Returns active sidebar configuration, filters accessible items based on permissions,
	and builds the nested tree layout.
	"""
	user = frappe.session.user
	cache_key = f"sidebar_data_{user}"
	
	# Try to fetch from cache first
	cached_data = frappe.cache().get_value(cache_key)
	if cached_data:
		return frappe.parse_json(cached_data)
		
	doc = get_active_sidebar_configuration()

	if not doc:
		guard = get_route_guard_bootinfo(user)
		return {
			"company": {
				"name": frappe.db.get_default("company") or "Frappe Whitelabel",
				"logo": None,
				"avatar": None,
			},
			"settings": {
				"enable_favorites": 1,
				"enable_recent_items": 1,
				"enable_search": 1,
				"sidebar_theme": "System",
				"collapse_by_default": 0,
				"colors": get_theme_colors(None),
			},
			"menu": [],
			"route_guard": {
				"enabled": guard.get("wl_route_guard"),
				"allowed_routes": guard.get("wl_allowed_routes") or [],
			},
		}
	
	# Get User Info
	user_info = {
		"name": doc.company or frappe.db.get_default("company") or "Frappe Whitelabel",
		"logo": doc.logo,
		"avatar": frappe.db.get_value("User", user, "user_image")
	}
	
	home_route = get_whitelabel_home_route(doc)

	settings = {
		"enable_favorites": doc.enable_favorites,
		"enable_recent_items": doc.enable_recent_items,
		"enable_search": doc.enable_search,
		"sidebar_theme": doc.sidebar_theme or "System",
		"collapse_by_default": doc.collapse_by_default,
		"colors": get_theme_colors(doc),
		"home_route": home_route,
	}
	
	accessible_items = get_accessible_sidebar_items(doc, user)
	menu_tree = build_nested_tree(accessible_items)
	allowed_routes = collect_allowed_routes(accessible_items, home_route, user)

	response = {
		"company": user_info,
		"settings": settings,
		"menu": menu_tree,
		"route_guard": {
			"enabled": not is_unrestricted_user(user),
			"allowed_routes": allowed_routes,
		},
	}
	
	# Cache for subsequent calls
	frappe.cache().set_value(cache_key, frappe.as_json(response), expires_in_sec=3600)
	
	return response

def has_route_permission(item, user):
	"""
	Validates access to standard Frappe components referenced in the menu item.
	"""
	try:
		if item.route_type == "DocType" and item.doctype_link:
			return frappe.has_permission(item.doctype_link, "read", user=user)
			
		elif item.route_type == "Report" and item.report_link:
			# Check report permission.
			ref_doctype = frappe.db.get_value("Report", item.report_link, "ref_doctype")
			if ref_doctype:
				return frappe.has_permission(ref_doctype, "read", user=user)
			return True
			
		elif item.route_type == "Page" and item.page_link:
			# If there are roles defined for the Page, user must have at least one.
			page_roles = frappe.get_all("Custom Role", filters={"page": item.page_link}, pluck="role")
			if not page_roles:
				# Check core page roles
				page_roles = frappe.get_all("Has Role", filters={"parent": item.page_link, "parenttype": "Page"}, pluck="role")
			
			if page_roles and not any(role in frappe.get_roles(user) for role in page_roles):
				return False
			return True
			
		elif item.route_type == "Workspace" and item.workspace_link:
			# Check Workspace accessibility
			ws = frappe.get_all("Workspace", filters={"name": item.workspace_link}, fields=["public", "restrict_to_domain"])
			if ws:
				# Standard check or just rely on Workspace read permission
				return frappe.has_permission("Workspace", "read", user=user)
			return True
	except Exception as e:
		frappe.log_error(f"Error checking route permission for {item.label}: {str(e)}", "Sidebar Redesign")
		return False
		
	return True

def get_theme_colors(doc):
	"""Theme color palette for dynamic sidebar CSS variables."""
	defaults = {
		"primary_color": "#6366f1",
		"secondary_color": "#64748b",
		"background_light": "#f8fafc",
		"background_dark": "#0b0f19",
	}
	if not doc:
		return defaults

	return {
		"primary_color": doc.get("primary_color") or defaults["primary_color"],
		"secondary_color": doc.get("secondary_color") or defaults["secondary_color"],
		"background_light": doc.get("background_light") or defaults["background_light"],
		"background_dark": doc.get("background_dark") or defaults["background_dark"],
	}


def get_whitelabel_home_route(doc=None):
	"""Home route from Sidebar Configuration (active doc only)."""
	if doc is None:
		try:
			doc = frappe.get_single("Sidebar Configuration")
		except frappe.DoesNotExistError:
			return None

	if not doc or not getattr(doc, "active", 0):
		return None

	home = (doc.get("home") or "").strip()
	if not home:
		return None

	route = normalize_route(home)
	return route if route and route != "#" else None


def normalize_route(route):
	"""Never expose /desk URLs — use /app paths only."""
	if not route:
		return ""
	route = route.strip()
	if route in ("#", "/desk", "desk", "/desk/"):
		return "#"
	if route.startswith("/desk/"):
		return "/app/" + route[6:]
	if route.startswith("desk/"):
		return "/app/" + route[5:]
	return route


def build_route(item):
	"""
	Centralized route builder. Uses explicit route when set, else derives from links.
	"""
	route = normalize_route((item.get("route") or "").strip())
	if route and route != "#":
		return route

	if item.route_type == "DocType" and item.doctype_link:
		slug = slugify(item.doctype_link)
		return f"/app/{slug}"
		
	elif item.route_type == "Report" and item.report_link:
		slug = slugify(item.report_link)
		# Query report path pattern
		return f"/app/query-report/{slug}"
		
	elif item.route_type == "Page" and item.page_link:
		slug = slugify(item.page_link)
		return f"/app/{slug}"
		
	elif item.route_type == "Workspace" and item.workspace_link:
		slug = slugify(item.workspace_link)
		return f"/app/{slug}"
		
	elif item.route_type == "URL" and item.url:
		return normalize_route(item.url) or "#"
		
	elif item.route_type == "Custom Route" and item.custom_route:
		return normalize_route(item.custom_route) or "#"
		
	return "#"

def slugify(text):
	"""
	Converts Frappe DocType/Report/Workspace names to the kebab-case standard URL routes.
	"""
	if not text:
		return ""
	# Standard Frappe slugification logic: lowercase and replaces spaces/underscores with hyphens
	return text.lower().replace(" ", "-").replace("_", "-")

def build_nested_tree(items):
	"""
	Recursively structures a flat list of menu items into parent-child nesting.
	"""
	items_map = {}
	roots = []
	
	# Initialize items
	for item in items:
		item["children"] = []
		items_map[item["label"]] = item
		
	for item in items:
		parent = item.get("parent_item")
		if parent and parent in items_map:
			items_map[parent]["children"].append(item)
		else:
			roots.append(item)
			
	return roots
