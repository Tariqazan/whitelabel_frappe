# -*- coding: utf-8 -*-
# Copyright (c) 2026, Tariqul Islam and contributors
# For license information, please see license.txt

import frappe
from frappe import _

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
		
	# Fetch the active Sidebar Configuration (Single DocType has no custom SQL table)
	try:
		doc = frappe.get_doc("Sidebar Configuration")
	except frappe.DoesNotExistError:
		doc = None

	if not doc or not doc.active:
		return {
			"company": {
				"name": frappe.db.get_default("company") or "Frappe Whitelabel",
				"logo": None,
				"avatar": None
			},
			"settings": {
				"enable_favorites": 1,
				"enable_recent_items": 1,
				"enable_search": 1,
				"sidebar_theme": "System",
				"collapse_by_default": 0,
				"colors": get_theme_colors(None),
			},
			"menu": []
		}
	
	# Get User Info
	user_info = {
		"name": doc.company or frappe.db.get_default("company") or "Frappe Whitelabel",
		"logo": doc.logo,
		"avatar": frappe.db.get_value("User", user, "user_image")
	}
	
	settings = {
		"enable_favorites": doc.enable_favorites,
		"enable_recent_items": doc.enable_recent_items,
		"enable_search": doc.enable_search,
		"sidebar_theme": doc.sidebar_theme or "System",
		"collapse_by_default": doc.collapse_by_default,
		"colors": get_theme_colors(doc),
	}
	
	# Fetch all menu items
	menu_items = doc.get("menu_items") or []
	
	# Filter and build routes
	accessible_items = []
	for item in menu_items:
		if not item.enabled:
			continue
			
		# 1. Custom Role permission check
		if item.permission_rule:
			if item.permission_rule not in frappe.get_roles(user):
				continue
				
		# 2. Route level permission check (DocType, Report, Page, etc.)
		if not has_route_permission(item, user):
			continue
			
		# Generate route using centralized route builder
		route = build_route(item)
		
		accessible_items.append({
			"label": item.label,
			"icon": item.icon,
			"parent_item": item.parent_item,
			"sequence": item.sequence or 0,
			"route": route,
			"open_in_new_tab": item.open_in_new_tab or 0,
			"route_type": item.route_type
		})
		
	# Build the nested tree
	# We sort items by sequence first
	accessible_items.sort(key=lambda x: (x["sequence"], x["label"]))
	
	menu_tree = build_nested_tree(accessible_items)
	
	response = {
		"company": user_info,
		"settings": settings,
		"menu": menu_tree
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
