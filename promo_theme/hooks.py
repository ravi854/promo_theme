app_name = "promo_theme"
app_title = "Promo Theme"
app_publisher = "info@a1its.net"
app_description = "Custom Promo theme for Print Shop Customer"
app_email = "info@a1its.net"
app_license = "mit"

web_include_css = ["/assets/promo_theme/css/promo_store.css?v=48"]

web_include_js = [
    "/assets/promo_theme/js/promo_store.js?v=32",
    "/assets/promo_theme/js/variant_swatches.js?v=8",
    "/assets/promo_theme/js/promo_header.js?v=17",
	"/assets/promo_theme/js/promo_footer.js?v=3",
	"/assets/promo_theme/js/promo_search.js?v=1",
	"/assets/promo_theme/js/promo_whatsapp.js?v=13",
	"/assets/promo_theme/js/promo_chat.js?v=4",
	"/assets/promo_theme/js/promo_guest_checkout.js?v=1"
]


override_whitelisted_methods = {
    "webshop.webshop.api.get_product_filter_data": "promo_theme.overrides.get_product_filter_data",
	"webshop.webshop.shopping_cart.cart.update_cart": "promo_theme.api.guest_safe_update_cart"
}


template_apps = ["builder","promo_theme", "webshop", "helpdesk", "crm", "erpnext"]
#web_include_js = ["/assets/promo_theme/js/promo_cards.js"]



# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "promo_theme",
# 		"logo": "/assets/promo_theme/logo.png",
# 		"title": "Promo Theme",
# 		"route": "/promo_theme",
# 		"has_permission": "promo_theme.api.permission.has_app_permission",
# 	}
# ]

# The dock, the rail down the left of the desk, is a document rather than a hook. Author it in
# Manage Dock on a developer-mode site and press Export to App, and it is written to
# `promo_theme/dock/promo_theme/promo_theme.json` for git to carry. An app that ships none has no
# rail: its sidebar gets a switcher in the header instead.
#
# A companion app, one that extends a host app rather than standing on its own, says so with
# `mount_on` on that same record, and its entries are appended to the host's rail. Mounting keeps
# the companion off the apps screen, so it takes precedence over any add_to_apps_screen above.

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/promo_theme/css/promo_theme.css"
# app_include_js = "/assets/promo_theme/js/promo_theme.js"

# include js, css files in header of web template
# web_include_css = "/assets/promo_theme/css/promo_theme.css"
# web_include_js = "/assets/promo_theme/js/promo_theme.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "promo_theme/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_kanban_js = {"doctype" : "public/js/doctype_kanban.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "promo_theme/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
#home_page = "promo_home"

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
# 	"methods": "promo_theme.utils.jinja_methods",
# 	"filters": "promo_theme.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "promo_theme.install.before_install"
# after_install = "promo_theme.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "promo_theme.uninstall.before_uninstall"
# after_uninstall = "promo_theme.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "promo_theme.utils.before_app_install"
# after_app_install = "promo_theme.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "promo_theme.utils.before_app_uninstall"
# after_app_uninstall = "promo_theme.utils.after_app_uninstall"

# Build
# ------------------
# To hook into the build process

# after_build = "promo_theme.build.after_build"

# To hook into the build process of other apps
# The list of apps being built is passed as an argument

# after_app_build = "promo_theme.build.after_app_build"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "promo_theme.notifications.get_notification_config"

# Awesome Bar
# -----------
# Extra search results: list of dicts with label, description, route, index.
# route: ["List", "ToDo"], "/desk/docs/some/page", or "https://example.com"
# awesomebar_search = ["promo_theme.search.awesomebar_results"]

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
# 		"promo_theme.tasks.all"
# 	],
# 	"daily": [
# 		"promo_theme.tasks.daily"
# 	],
# 	"hourly": [
# 		"promo_theme.tasks.hourly"
# 	],
# 	"weekly": [
# 		"promo_theme.tasks.weekly"
# 	],
# 	"monthly": [
# 		"promo_theme.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "promo_theme.install.before_tests"

# Extend DocType Class
# ------------------------------
#
# Specify custom mixins to extend the standard doctype controller.
# extend_doctype_class = {
# 	"Task": "promo_theme.custom.task.CustomTaskMixin"
# }

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "promo_theme.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "promo_theme.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["promo_theme.utils.before_request"]
# after_request = ["promo_theme.utils.after_request"]

# Job Events
# ----------
# before_job = ["promo_theme.utils.before_job"]
# after_job = ["promo_theme.utils.after_job"]

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
# 	"promo_theme.auth.validate"
# ]

# on_social_login = "promo_theme.auth.on_social_login"

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []

