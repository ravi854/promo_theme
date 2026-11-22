import frappe
from webshop.webshop.api import get_product_filter_data as core_get_product_filter_data

@frappe.whitelist(allow_guest=True)
def get_product_filter_data(query_args=None):
    result = core_get_product_filter_data(query_args)
    items = result.get("items", [])

    if items:
        web_item_names = [d.get("name") for d in items]
        brandable_map = dict(
            frappe.get_all(
                "Website Item",
                filters={"name": ["in", web_item_names]},
                fields=["name", "custom_brandable"],
                as_list=True,
            )
        )
        for item in items:
            item["custom_brandable"] = brandable_map.get(item.get("name"), 0)

    return result
