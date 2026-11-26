import frappe
from frappe.utils import escape_html, get_url, strip_html

no_cache = 1


def get_context(context):
    enabled = bool(frappe.db.get_single_value("Webshop Settings", "enable_google_merchant_feed"))
    if not enabled:
        frappe.local.response["http_status_code"] = 404
        frappe.local.response["type"] = "page"
        frappe.local.response["page_name"] = "404"
        return

    site_url = get_url().rstrip("/")
    company = (
        frappe.db.get_single_value("Webshop Settings", "company")
        or frappe.defaults.get_global_default("company")
        or "PrintStoreAmaze"
    )
    price_list = (
        frappe.db.get_single_value("Webshop Settings", "price_list")
        or frappe.db.get_single_value("Selling Settings", "selling_price_list")
        or "Standard Selling"
    )
    currency = frappe.db.get_value("Price List", price_list, "currency") or "ZAR"

    prices = dict(
        frappe.get_all(
            "Item Price",
            filters={"price_list": price_list, "selling": 1},
            fields=["item_code", "price_list_rate"],
            as_list=True,
        )
    )

    stock_rows = frappe.db.sql(
        """
        SELECT item_code, SUM(actual_qty) AS qty
        FROM `tabBin`
        GROUP BY item_code
        """,
        as_dict=True,
    )
    stock_map = {r.item_code: float(r.qty or 0) for r in stock_rows}

    web_items = frappe.get_all(
        "Website Item",
        filters={"published": 1},
        fields=[
            "name",
            "item_code",
            "web_item_name",
            "item_name",
            "route",
            "website_image",
            "short_description",
            "description",
            "brand",
            "item_group",
        ],
        limit_page_length=5000,
    )

    items_xml = []
    for wi in web_items:
        if not wi.item_code or wi.item_code == "COD-DELIVERY":
            continue

        title = escape_html((wi.web_item_name or wi.item_name or wi.item_code).strip())
        raw_desc = wi.short_description or wi.description or wi.web_item_name or wi.item_code
        desc = escape_html(strip_html(raw_desc).strip()[:4900] or title)
        route = (wi.route or "").lstrip("/")
        link = escape_html(f"{site_url}/{route}" if route else f"{site_url}/all-products")

        img = (wi.website_image or "").strip()
        if img and not img.startswith("http"):
            img = f"{site_url}/{img.lstrip('/')}"
        img_tag = f"<g:image_link>{escape_html(img)}</g:image_link>" if img else ""

        rate = float(prices.get(wi.item_code) or 0.0)
        if rate <= 0:
            continue

        avail = "in_stock" if stock_map.get(wi.item_code, 0.0) > 0 else "preorder"
        brand = escape_html((wi.brand or company).strip())
        category = escape_html((wi.item_group or "Promotional Products").strip())
        sku = escape_html(wi.item_code.strip())

        items_xml.append(
            f"""    <item>
      <g:id>{sku}</g:id>
      <g:mpn>{sku}</g:mpn>
      <g:title>{title}</g:title>
      <g:description>{desc}</g:description>
      <g:link>{link}</g:link>
      {img_tag}
      <g:condition>new</g:condition>
      <g:availability>{avail}</g:availability>
      <g:price>{rate:.2f} {escape_html(currency)}</g:price>
      <g:brand>{brand}</g:brand>
      <g:product_type>{category}</g:product_type>
    </item>"""
        )

    xml_body = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://google.com">
  <channel>
    <title>{escape_html(company)} Product Feed</title>
    <link>{escape_html(site_url)}</link>
    <description>Google Merchant Center Product Feed for {escape_html(company)}</description>
{chr(10).join(items_xml)}
  </channel>
</rss>"""

    frappe.response["type"] = "download"
    frappe.response["filename"] = "google-shopping-feed.xml"
    frappe.response["filecontent"] = xml_body
    frappe.response["content_type"] = "application/xml; charset=utf-8"
