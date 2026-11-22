import frappe

no_cache = 1


def get_context(context):
    context.no_cache = 1
    context.title = "PrintStoreAmaze | Custom Branded Corporate Gifts & Promotional Clothing"

    # 1. Featured Categories (Item Groups with Show in Website checked)
    categories = frappe.get_all(
        "Item Group",
        filters={"show_in_website": 1, "name": ["!=", "All Item Groups"]},
        fields=["name", "route", "image", "weightage"],
        order_by="weightage desc, name asc",
        limit_page_length=8,
    )
    for c in categories:
        c.route = "/" + c.route.strip("/") if c.route else "/all-products"
    context.categories = categories

    # 2. Featured Products (8 published Website Items)
    price_list = frappe.db.get_single_value("Webshop Settings", "price_list") or "Standard Selling"
    currency = frappe.db.get_value("Price List", price_list, "currency") or "ZAR"

    wi_fields = ["name", "web_item_name", "item_code", "route", "website_image", "has_variants"]
    if frappe.db.has_column("Website Item", "custom_is_brandable"):
        wi_fields.append("custom_is_brandable")
    if frappe.db.has_column("Website Item", "custom_new_arrival"):
        wi_fields.append("custom_new_arrival")

    products = frappe.get_all(
        "Website Item",
        filters={"published": 1, "variant_of": ["is", "not set"]},
        fields=wi_fields,
        order_by="modified desc",
        limit_page_length=8,
    )

    item_codes = [p.item_code for p in products if p.item_code]
    prices = {}
    in_stock = set()

    if item_codes:
        for ip in frappe.get_all(
            "Item Price",
            filters={"item_code": ["in", item_codes], "price_list": price_list, "selling": 1},
            fields=["item_code", "price_list_rate"],
        ):
            prices[ip.item_code] = ip.price_list_rate

        for b in frappe.get_all(
            "Bin",
            filters={"item_code": ["in", item_codes], "actual_qty": [">", 0]},
            fields=["item_code"],
        ):
            in_stock.add(b.item_code)

    for p in products:
        p.route = "/" + p.route.strip("/") if p.route else "/all-products"
        rate = prices.get(p.item_code, 0)
        p.formatted_price = frappe.utils.fmt_money(rate, currency=currency) if rate else ""
        p.in_stock = 1 if p.item_code in in_stock else 0
        p.is_brandable = int(bool(p.get("custom_is_brandable")))
        p.new_arrival = int(bool(p.get("custom_new_arrival")))

    context.featured_products = products

    # 3. Featured Brands
    context.brands = frappe.get_all(
        "Brand",
        fields=["name", "image"],
        limit_page_length=20,
    )
