app_name = "frappe_whitelabel"
app_title = "Frappe Whitelabel"
app_publisher = "Tariqul Islam"
app_description = "Whitelabel frappe app"
app_email = "tariqmolla8@gmail.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "frappe_whitelabel",
# 		"logo": "/assets/frappe_whitelabel/logo.png",
# 		"title": "Frappe Whitelabel",
# 		"route": "/frappe_whitelabel",
# 		"has_permission": "frappe_whitelabel.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
app_include_css = [
	"/assets/frappe_whitelabel/css/sidebar.css",
	"/assets/frappe_whitelabel/css/sidebar_mobile.css",
	"/assets/frappe_whitelabel/css/sidebar_dark.css",
	"/assets/frappe_whitelabel/css/google_translate.css",
]

# Reverse Frappe core /app -> /desk redirects; keep users on /app
website_redirects = [
	{"source": r"/desk/(.*)", "target": r"/app/\1", "forward_query_parameters": True},
	{"source": "/desk", "target": "/app"},
]

before_request = ["frappe_whitelabel.utils.route_guard.block_desk_urls"]

boot_session = ["frappe_whitelabel.boot.session_boot"]

app_include_js = [
	"/assets/frappe_whitelabel/js/sidebar/google_translate.js",
	"/assets/frappe_whitelabel/js/desk_route_guard.js",
	"/assets/frappe_whitelabel/js/sidebar/sidebar_store.js",
	"/assets/frappe_whitelabel/js/sidebar/sidebar_theme.js",
	"/assets/frappe_whitelabel/js/sidebar/sidebar_service.js",
	"/assets/frappe_whitelabel/js/sidebar/sidebar_renderer.js",
	"/assets/frappe_whitelabel/js/sidebar/sidebar_footer.js",
	"/assets/frappe_whitelabel/js/sidebar/sidebar_events.js",
	"/assets/frappe_whitelabel/js/sidebar/sidebar.js"
]

# include js, css files in header of web template
# web_include_css = "/assets/frappe_whitelabel/css/frappe_whitelabel.css"
# web_include_js = "/assets/frappe_whitelabel/js/frappe_whitelabel.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "frappe_whitelabel/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
doctype_js = {
	"Sidebar Configuration": "public/js/sidebar_menu_item.js",
}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "frappe_whitelabel/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# automatically load and sync documents of this doctype from downstream apps
# importable_doctypes = [doctype_1]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "frappe_whitelabel.utils.jinja_methods",
# 	"filters": "frappe_whitelabel.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "frappe_whitelabel.install.before_install"
# after_install = "frappe_whitelabel.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "frappe_whitelabel.uninstall.before_uninstall"
# after_uninstall = "frappe_whitelabel.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "frappe_whitelabel.utils.before_app_install"
# after_app_install = "frappe_whitelabel.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "frappe_whitelabel.utils.before_app_uninstall"
# after_app_uninstall = "frappe_whitelabel.utils.after_app_uninstall"

# Build
# ------------------
# To hook into the build process

# after_build = "frappe_whitelabel.build.after_build"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "frappe_whitelabel.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"frappe_whitelabel.tasks.all"
# 	],
# 	"daily": [
# 		"frappe_whitelabel.tasks.daily"
# 	],
# 	"hourly": [
# 		"frappe_whitelabel.tasks.hourly"
# 	],
# 	"weekly": [
# 		"frappe_whitelabel.tasks.weekly"
# 	],
# 	"monthly": [
# 		"frappe_whitelabel.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "frappe_whitelabel.install.before_tests"

# Extend DocType Class
# ------------------------------
#
# Specify custom mixins to extend the standard doctype controller.
# extend_doctype_class = {
# 	"Task": "frappe_whitelabel.custom.task.CustomTaskMixin"
# }

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "frappe_whitelabel.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "frappe_whitelabel.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["frappe_whitelabel.utils.before_request"]
# after_request = ["frappe_whitelabel.utils.after_request"]

# Job Events
# ----------
# before_job = ["frappe_whitelabel.utils.before_job"]
# after_job = ["frappe_whitelabel.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"frappe_whitelabel.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []

