import urllib.parse
import frappe


@frappe.whitelist(allow_guest=True)
def get_bulk_pricing_tiers(route=None):
    if not route:
        return []
    clean_route = route.strip("/")
    web_item = frappe.db.get_value(
        "Website Item",
        {"route": ["in", [clean_route, "/" + clean_route]], "published": 1},
        ["item_code", "item_group", "brand"],
        as_dict=True,
    )
    if not web_item or not web_item.item_code:
        return []

    price_list = frappe.db.get_single_value("Webshop Settings", "price_list") or "Standard Selling"
    base_price = frappe.db.get_value(
        "Item Price",
        {"item_code": web_item.item_code, "price_list": price_list, "selling": 1},
        "price_list_rate",
    ) or 0

    currency = frappe.db.get_value("Price List", price_list, "currency") or "ZAR"

    rules = frappe.db.sql(
        """
        SELECT DISTINCT pr.name, pr.min_qty, pr.max_qty, pr.rate_or_discount,
               pr.rate, pr.discount_percentage, pr.discount_amount
        FROM `tabPricing Rule` pr
        LEFT JOIN `tabPricing Rule Item Code` pric ON pric.parent = pr.name
        LEFT JOIN `tabPricing Rule Item Group` prig ON prig.parent = pr.name
        LEFT JOIN `tabPricing Rule Brand` prb ON prb.parent = pr.name
        WHERE pr.disable = 0
          AND pr.selling = 1
          AND pr.min_qty > 0
          AND (
              (pr.apply_on = 'Item Code' AND pric.item_code = %(item_code)s)
              OR (pr.apply_on = 'Item Group' AND prig.item_group = %(item_group)s)
              OR (pr.apply_on = 'Brand' AND prb.brand = %(brand)s)
          )
        ORDER BY pr.min_qty ASC
        """,
        {
            "item_code": web_item.item_code,
            "item_group": web_item.item_group or "",
            "brand": web_item.brand or "",
        },
        as_dict=True,
    )

    if not rules:
        return []

    tiers = []
    first_min = int(rules.min_qty)
    if first_min > 1 and base_price > 0:
        tiers.append({
            "qty_label": f"1 – {first_min - 1}",
            "min_qty": 1,
            "unit_price": frappe.utils.fmt_money(base_price, currency=currency),
            "discount_label": "Standard",
        })

    for r in rules:
        min_q = int(r.min_qty)
        max_q = int(r.max_qty) if r.max_qty else 0
        qty_label = f"{min_q} – {max_q}" if max_q > 0 else f"{min_q}+"

        unit_rate = float(base_price)
        disc_label = "-"
        if r.rate_or_discount == "Rate" and r.rate:
            unit_rate = float(r.rate)
            if base_price > 0:
                pct = round((1 - (unit_rate / float(base_price))) * 100)
                disc_label = f"Save {pct}%" if pct > 0 else "Bulk Rate"
        elif r.rate_or_discount == "Discount Percentage" and r.discount_percentage:
            unit_rate = float(base_price) * (1 - float(r.discount_percentage) / 100.0)
            disc_label = f"Save {int(r.discount_percentage)}%"
        elif r.rate_or_discount == "Discount Amount" and r.discount_amount:
            unit_rate = max(0.0, float(base_price) - float(r.discount_amount))
            disc_label = f"-{frappe.utils.fmt_money(r.discount_amount, currency=currency)}"

        tiers.append({
            "qty_label": qty_label,
            "min_qty": min_q,
            "unit_price": frappe.utils.fmt_money(unit_rate, currency=currency) if unit_rate > 0 else "Quote",
            "discount_label": disc_label,
        })

    return tiers


@frappe.whitelist(allow_guest=True)
def submit_guest_quote(full_name, email, phone="", company="", notes=""):
    if frappe.session.user == "Guest" and not bool(frappe.db.get_single_value("Webshop Settings", "enable_guest_checkout")):
        frappe.throw("Guest checkout is currently disabled. Please log in or create an account to continue.")

    if not full_name or not email:
        frappe.throw("Please enter your full name and email address.")

    from webshop.webshop.shopping_cart.cart import _get_cart_quotation

    quote_obj = _get_cart_quotation()
    doc = quote_obj.get("doc") if quote_obj else None

    if not doc or not doc.items:
        frappe.throw("Your Quote List is currently empty.")

    lead_name = frappe.db.get_value("Lead", {"email_id": email}, "name")
    if not lead_name:
        lead = frappe.get_doc({
            "doctype": "Lead",
            "lead_name": full_name,
            "email_id": email,
            "mobile_no": phone,
            "company_name": company,
            "source": "Website",
        })
        lead.flags.ignore_permissions = True
        lead.insert()
        lead_name = lead.name

    doc.quotation_to = "Lead"
    doc.party_name = lead_name
    doc.customer_name = company or full_name
    doc.contact_display = full_name
    doc.contact_email = email
    doc.contact_mobile = phone
    if notes:
        doc.terms = notes

    doc.flags.ignore_permissions = True
    doc.save()
    doc.submit()

    # Build itemized HTML summary for emails
    rows_html = "".join(
        f"<tr>"
        f"<td style='padding:6px 8px;border:1px solid #e2e8f0;'>{frappe.utils.escape_html(i.item_code)}</td>"
        f"<td style='padding:6px 8px;border:1px solid #e2e8f0;'>{frappe.utils.escape_html(i.item_name)}</td>"
        f"<td style='padding:6px 8px;border:1px solid #e2e8f0;text-align:center;'>{int(i.qty)}</td>"
        f"<td style='padding:6px 8px;border:1px solid #e2e8f0;text-align:right;'>{frappe.utils.fmt_money(i.amount, currency=doc.currency)}</td>"
        f"</tr>"
        for i in doc.items
    )

    items_table = f"""
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:left;">SKU</th>
          <th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:left;">Product</th>
          <th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;">Qty</th>
          <th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;">Est. Total (ex VAT)</th>
        </tr>
      </thead>
      <tbody>{rows_html}</tbody>
    </table>
    """

    notes_block = (
        f"<p><strong>Branding &amp; Deadline Notes:</strong><br>{frappe.utils.escape_html(notes)}</p>"
        if notes
        else ""
    )

    # 1. Send confirmation email to the guest customer
    try:
        frappe.sendmail(
            recipients=[email],
            subject=f"PrintStoreAmaze Quote Request Received – Reference {doc.name}",
            message=f"""
            <div style="font-family:Arial,sans-serif;color:#1e293b;max-width:600px;">
              <h2 style="color:#0f766e;margin-bottom:8px;">Thank You for Your Quote Request</h2>
              <p>Hi {frappe.utils.escape_html(full_name)},</p>
              <p>We have received your quote request (<strong>{doc.name}</strong>). One of our account managers will review your items, apply any applicable bulk discounts, and send your formal quote with a <strong>free digital artwork mockup</strong> shortly.</p>
              {items_table}
              {notes_block}
              <p style="font-size:12px;color:#64748b;">Need urgent assistance? Call us on <strong>084 027 7327</strong> or reply directly to this email.</p>
            </div>
            """,
        )
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Guest Quote Customer Email Failed")

    # 2. Send alert email to your Sales Team
    sales_email = (
        frappe.db.get_value("Email Account", {"default_outgoing": 1, "enable_outgoing": 1}, "email_id")
        or "sales@a1its.net"
    )
    desk_url = frappe.utils.get_url_to_form("Quotation", doc.name)

    try:
        frappe.sendmail(
            recipients=[sales_email],
            subject=f"New Website Quote Request: {doc.name} ({company or full_name})",
            message=f"""
            <div style="font-family:Arial,sans-serif;color:#1e293b;max-width:600px;">
              <h2 style="color:#0f766e;margin-bottom:8px;">New Website Quote Request</h2>
              <p><strong>Quotation:</strong> <a href="{desk_url}">{doc.name}</a><br>
              <strong>Name:</strong> {frappe.utils.escape_html(full_name)}<br>
              <strong>Company:</strong> {frappe.utils.escape_html(company or '-')}<br>
              <strong>Email:</strong> {frappe.utils.escape_html(email)}<br>
              <strong>Phone:</strong> {frappe.utils.escape_html(phone or '-')}</p>
              {items_table}
              {notes_block}
              <p><a href="{desk_url}" style="display:inline-block;padding:8px 14px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Open Quotation in ERPNext</a></p>
            </div>
            """,
        )
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Guest Quote Sales Alert Email Failed")

    if hasattr(frappe.local, "cookie_manager"):
        frappe.local.cookie_manager.delete_cookie("party_name")

    return {
        "status": "success",
        "quotation_id": doc.name,
    }


@frappe.whitelist(allow_guest=True)
def save_quote_branding_notes(notes=""):
    from webshop.webshop.shopping_cart.cart import _get_cart_quotation

    quote_obj = _get_cart_quotation()
    if quote_obj and quote_obj.get("doc"):
        doc = quote_obj["doc"]
        doc.terms = notes
        doc.flags.ignore_permissions = True
        doc.save()
        return {"status": "saved"}
    return {"status": "no_cart"}


@frappe.whitelist(allow_guest=True)
def get_promo_card_meta(routes=None):
    if not routes:
        return {}
    if isinstance(routes, str):
        routes = frappe.parse_json(routes)

    clean_routes = set()
    for r in routes:
        if not r:
            continue
        decoded = urllib.parse.unquote(r).strip("/")
        clean_routes.add(decoded)
        clean_routes.add("/" + decoded)

    if not clean_routes:
        return {}

    wi_fields = ["name", "route", "item_code", "has_variants"]
    has_wi_brandable = frappe.db.has_column("Website Item", "custom_is_brandable")
    has_wi_new = frappe.db.has_column("Website Item", "custom_new_arrival")

    if has_wi_brandable:
        wi_fields.append("custom_is_brandable")
    if has_wi_new:
        wi_fields.append("custom_new_arrival")

    items = frappe.get_all(
        "Website Item",
        filters={"route": ["in", list(clean_routes)], "published": 1},
        fields=wi_fields,
    )

    item_codes = [d.item_code for d in items if d.item_code]
    template_codes = [d.item_code for d in items if d.item_code and d.has_variants]

    variant_to_template = {}
    all_codes_to_check = set(item_codes)
    if template_codes:
        variants = frappe.get_all(
            "Item",
            filters={"variant_of": ["in", template_codes], "disabled": 0},
            fields=["name", "variant_of"],
        )
        for v in variants:
            variant_to_template[v.name] = v.variant_of
            all_codes_to_check.add(v.name)

    in_stock_codes = set()
    if all_codes_to_check:
        bins = frappe.get_all(
            "Bin",
            filters={"item_code": ["in", list(all_codes_to_check)], "actual_qty": [">", 0]},
            fields=["item_code"],
        )
        for b in bins:
            in_stock_codes.add(b.item_code)
            if b.item_code in variant_to_template:
                in_stock_codes.add(variant_to_template[b.item_code])

    item_flags = {}
    if item_codes and (not has_wi_brandable or not has_wi_new):
        item_fields = ["name"]
        if frappe.db.has_column("Item", "custom_is_brandable"):
            item_fields.append("custom_is_brandable")
        if frappe.db.has_column("Item", "custom_new_arrival"):
            item_fields.append("custom_new_arrival")
        if len(item_fields) > 1:
            for row in frappe.get_all("Item", filters={"name": ["in", item_codes]}, fields=item_fields):
                item_flags[row.name] = row

    result = {}
    for item in items:
        variant_count = 0
        if item.has_variants:
            variant_count = frappe.db.count(
                "Item", {"variant_of": item.item_code, "disabled": 0}
            )

        fallback = item_flags.get(item.item_code, {})
        is_brandable = item.get("custom_is_brandable") if has_wi_brandable else fallback.get("custom_is_brandable", 0)
        new_arrival = item.get("custom_new_arrival") if has_wi_new else fallback.get("custom_new_arrival", 0)

        norm_key = "/" + item.route.strip("/")
        result[norm_key] = {
            "item_code": item.item_code,
            "in_stock": 1 if item.item_code in in_stock_codes else 0,
            "has_variants": item.has_variants,
            "variant_count": variant_count,
            "is_brandable": int(bool(is_brandable)),
            "new_arrival": int(bool(new_arrival)),
        }
    return result

@frappe.whitelist(allow_guest=True)
def get_nav_categories():
    groups = frappe.get_all(
        "Item Group",
        filters={"show_in_website": 1, "name": ["!=", "All Item Groups"]},
        fields=["name", "parent_item_group", "route", "weightage", "is_group"],
        order_by="weightage desc, name asc",
    )

    by_parent = {}
    top_level = []
    group_names = {g.name for g in groups}

    for g in groups:
        if not g.route:
            continue
        item = {
            "label": g.name,
            "route": "/" + g.route.strip("/"),
            "children": [],
        }
        if g.parent_item_group in group_names:
            by_parent.setdefault(g.parent_item_group, []).append(item)
        else:
            top_level.append(item)

    for cat in top_level:
        cat["children"] = by_parent.get(cat["label"], [])

    return top_level


@frappe.whitelist(allow_guest=True)
def get_product_variants(route=None, item_code=None):
    web_item = None
    if item_code:
        web_item = frappe.db.get_value(
            "Website Item",
            {"item_code": item_code, "published": 1},
            ["item_code", "has_variants"],
            as_dict=True,
        )
    if not web_item and route:
        clean_route = route.strip("/")
        web_item = frappe.db.get_value(
            "Website Item",
            {"route": ["in", [clean_route, "/" + clean_route]], "published": 1},
            ["item_code", "has_variants"],
            as_dict=True,
        )
    if not web_item or not web_item.item_code:
        return []

    template_code = web_item.item_code if web_item.has_variants else frappe.db.get_value(
        "Item", web_item.item_code, "variant_of"
    )
    if not template_code:
        return []

    variants = frappe.get_all(
        "Item",
        filters={"variant_of": template_code, "disabled": 0},
        fields=["name", "item_name", "image"],
    )
    if not variants:
        return []

    variant_names = [v.name for v in variants]
    attrs = frappe.get_all(
        "Item Variant Attribute",
        filters={"parent": ["in", variant_names]},
        fields=["parent", "attribute", "attribute_value"],
    )
    attr_map = {}
    for a in attrs:
        attr_map.setdefault(a.parent, {})[a.attribute] = a.attribute_value

    pub_routes = dict(
        frappe.get_all(
            "Website Item",
            filters={"item_code": ["in", variant_names], "published": 1},
            fields=["item_code", "route"],
            as_list=True,
        )
    )

    result = []
    for v in variants:
        result.append({
            "item_code": v.name,
            "item_name": v.item_name,
            "image": v.image,
            "route": "/" + pub_routes[v.name].strip("/") if v.name in pub_routes else "",
            "attributes": attr_map.get(v.name, {}),
        })
    return result


@frappe.whitelist(allow_guest=True)
def search_promo_products(query=""):
    q = (query or "").strip()
    if len(q) < 2:
        return []

    like_q = f"%{q}%"
    items = frappe.get_all(
        "Website Item",
        filters={"published": 1},
        or_filters=[
            ["web_item_name", "like", like_q],
            ["item_code", "like", like_q],
            ["item_group", "like", like_q],
        ],
        fields=["web_item_name", "item_code", "route", "website_image", "has_variants"],
        order_by="modified desc",
        limit_page_length=8,
    )

    if not items:
        return []

    price_list = frappe.db.get_single_value("Webshop Settings", "price_list") or "Standard Selling"
    currency = frappe.db.get_value("Price List", price_list, "currency") or "ZAR"
    codes = [d.item_code for d in items if d.item_code]

    prices = {}
    in_stock = set()
    if codes:
        for ip in frappe.get_all(
            "Item Price",
            filters={"item_code": ["in", codes], "price_list": price_list, "selling": 1},
            fields=["item_code", "price_list_rate"],
        ):
            prices[ip.item_code] = ip.price_list_rate

        for b in frappe.get_all(
            "Bin",
            filters={"item_code": ["in", codes], "actual_qty": [">", 0]},
            fields=["item_code"],
        ):
            in_stock.add(b.item_code)

    results = []
    for item in items:
        rate = prices.get(item.item_code, 0)
        results.append({
            "title": item.web_item_name or item.item_code,
            "item_code": item.item_code,
            "route": "/" + item.route.strip("/") if item.route else "/all-products",
            "image": item.website_image or "",
            "price": frappe.utils.fmt_money(rate, currency=currency) if rate else "",
            "has_variants": item.has_variants,
            "in_stock": 1 if item.item_code in in_stock else 0,
        })
    return results


@frappe.whitelist(allow_guest=True)
def submit_live_chat_inquiry(name, email, phone="", message="", page_url=""):
    if not name or not email or not message:
        frappe.throw("Please enter your name, email address, and message.")

    orig_user = frappe.session.user
    frappe.set_user("Administrator")
    try:
        lead_name = frappe.db.get_value("CRM Lead", {"email": email}, "name")
        if not lead_name:
            parts = name.strip().split(" ", 1)
            lead_data = {
                "doctype": "CRM Lead",
                "first_name": parts[0],
                "last_name": parts[1] if len(parts) > 1 else "",
                "email": email,
                "mobile_no": phone,
            }
            if frappe.db.exists("CRM Lead Source", "Website"):
                lead_data["source"] = "Website"
            lead = frappe.get_doc(lead_data)
            lead.flags.ignore_permissions = True
            lead.insert()
            lead_name = lead.name

        lead_doc = frappe.get_doc("CRM Lead", lead_name)
        lead_doc.add_comment(
            "Comment",
            f"<strong>Website Live Chat Inquiry</strong><br>"
            f"<strong>Page:</strong> {frappe.utils.escape_html(page_url or '-')}<br>"
            f"<strong>Phone:</strong> {frappe.utils.escape_html(phone or '-')}<br>"
            f"<strong>Message:</strong> {frappe.utils.escape_html(message)}",
        )

        sales_email = (
            frappe.db.get_value("Email Account", {"default_outgoing": 1, "enable_outgoing": 1}, "email_id")
            or "sales@a1its.net"
        )
        lead_url = frappe.utils.get_url(f"/crm/leads/{lead_name}")

        try:
            frappe.sendmail(
                recipients=[sales_email],
                sender=sales_email,
                subject=f"New Website Live Chat Message from {name}",
                message=f"""
                <div style="font-family:Arial,sans-serif;color:#1e293b;max-width:600px;">
                  <h2 style="color:#0f766e;margin-bottom:8px;">New Website Live Chat Inquiry</h2>
                  <p><strong>Name:</strong> {frappe.utils.escape_html(name)}<br>
                  <strong>Email:</strong> {frappe.utils.escape_html(email)}<br>
                  <strong>Phone:</strong> {frappe.utils.escape_html(phone or '-')}<br>
                  <strong>Page:</strong> {frappe.utils.escape_html(page_url or '-')}</p>
                  <div style="background:#f8fafc;border-left:3px solid #0f766e;padding:10px 12px;margin:12px 0;">
                    {frappe.utils.escape_html(message)}
                  </div>
                  <p><a href="{lead_url}" style="display:inline-block;padding:8px 14px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Open Lead in Frappe CRM</a></p>
                </div>
                """,
                delayed=False,
            )
        except Exception:
            frappe.log_error(frappe.get_traceback(), "Live Chat Email Failed")

        frappe.db.commit()
        return {"status": "success", "lead": lead_name}
    finally:
        frappe.set_user(orig_user)

@frappe.whitelist(allow_guest=True)
def get_store_contact():
    phone = (frappe.db.get_single_value("Contact Us Settings", "phone") or "084 027 7327").strip()
    email = (frappe.db.get_single_value("Contact Us Settings", "email_id") or "sales@a1its.net").strip()
    raw_banner = (frappe.db.get_single_value("Website Settings", "banner_html") or "").strip()
    banner_html = "" if frappe.utils.strip_html(raw_banner).strip() == "" else raw_banner
    enable_checkout = int(bool(frappe.db.get_single_value("Webshop Settings", "enable_checkout")))
    enable_guest_checkout = int(bool(frappe.db.get_single_value("Webshop Settings", "enable_guest_checkout")))
    enable_cod = int(bool(frappe.db.get_single_value("Webshop Settings", "enable_cod")))
    default_company = (
        frappe.db.get_single_value("Webshop Settings", "company")
        or frappe.db.get_single_value("Global Defaults", "default_company")
        or ""
    )
    logo_url = (
        frappe.db.get_single_value("Website Settings", "app_logo")
        or frappe.db.get_single_value("Website Settings", "banner_image")
        or (frappe.db.get_value("Company", default_company, "company_logo") if default_company else "")
        or ""
    ).strip()
    brand_name = (
        frappe.db.get_single_value("Website Settings", "app_name")
        or default_company
        or "PrintStoreAmaze"
    ).strip()

    digits = "".join(ch for ch in phone if ch.isdigit())
    wa_number = "27" + digits[1:] if digits.startswith("0") and len(digits) == 10 else digits

    return {
        "phone": phone,
        "tel_href": "tel:" + digits,
        "wa_number": wa_number,
        "email": email,
        "enable_checkout": enable_checkout,
        "enable_guest_checkout": enable_guest_checkout,
        "enable_cod": enable_cod,
        "cod_delivery_charge": float(frappe.db.get_single_value("Webshop Settings", "cod_delivery_charge") or 150),
        "cod_free_delivery_over": float(frappe.db.get_single_value("Webshop Settings", "cod_free_delivery_over") or 1500),
        "cod_delivery_charge": float(frappe.db.get_single_value("Webshop Settings", "cod_delivery_charge") or 150),
        "cod_free_delivery_over": float(frappe.db.get_single_value("Webshop Settings", "cod_free_delivery_over") or 1500),
        "logo_url": logo_url,
        "brand_name": brand_name,
        "announcement_html": banner_html
        or "<strong>FREE delivery</strong> on orders over R1,500 ex VAT &nbsp;|&nbsp; Fast turnaround &amp; free digital artwork",
    }




@frappe.whitelist(allow_guest=True)
def submit_artwork_inquiry():
    form = frappe.form_dict
    full_name = (form.get("full_name") or "").strip()
    email = (form.get("email") or "").strip()
    phone = (form.get("phone") or "").strip()
    company = (form.get("company") or "").strip()
    product_interest = (form.get("product_interest") or "").strip()
    quantity = (form.get("quantity") or "").strip()
    branding_method = (form.get("branding_method") or "").strip()
    deadline = (form.get("deadline") or "").strip()
    notes = (form.get("notes") or "").strip()

    if not full_name or not email:
        frappe.throw("Please provide your full name and work email address.")

    lead_name = frappe.db.get_value("Lead", {"email_id": email}, "name")
    if not lead_name:
        lead = frappe.get_doc({
            "doctype": "Lead",
            "lead_name": full_name,
            "email_id": email,
            "mobile_no": phone,
            "company_name": company,
            "source": "Website",
        })
        lead.flags.ignore_permissions = True
        lead.insert()
        lead_name = lead.name

    lead_doc = frappe.get_doc("Lead", lead_name)

    # Save uploaded artwork file (if provided) and attach it to the Lead
    uploaded_file_url = ""
    uploaded_file_name = ""
    if frappe.request and frappe.request.files and "artwork_file" in frappe.request.files:
        file_storage = frappe.request.files["artwork_file"]
        if file_storage and file_storage.filename:
            content = file_storage.stream.read()
            if content:
                from frappe.utils.file_manager import save_file
                saved_file = save_file(
                    file_storage.filename,
                    content,
                    "Lead",
                    lead_name,
                    is_private=1,
                )
                uploaded_file_url = saved_file.file_url
                uploaded_file_name = file_storage.filename

    summary_html = (
        f"<strong>PrintStoreAmaze Artwork &amp; Quote Inquiry</strong><br>"
        f"<strong>Company:</strong> {frappe.utils.escape_html(company or '-')}<br>"
        f"<strong>Phone:</strong> {frappe.utils.escape_html(phone or '-')}<br>"
        f"<strong>Products / SKUs:</strong> {frappe.utils.escape_html(product_interest or '-')}<br>"
        f"<strong>Estimated Qty:</strong> {frappe.utils.escape_html(quantity or '-')}<br>"
        f"<strong>Branding Technique:</strong> {frappe.utils.escape_html(branding_method or '-')}<br>"
        f"<strong>Required By:</strong> {frappe.utils.escape_html(deadline or '-')}<br>"
        f"<strong>Artwork File:</strong> {frappe.utils.escape_html(uploaded_file_name or 'None uploaded')}<br>"
        f"<strong>Notes:</strong> {frappe.utils.escape_html(notes or '-')}"
    )
    lead_doc.add_comment("Comment", summary_html)

    sales_email = (
        frappe.db.get_value("Email Account", {"default_outgoing": 1, "enable_outgoing": 1}, "email_id")
        or "sales@a1its.net"
    )
    lead_url = frappe.utils.get_url(f"/crm/leads/{lead_name}")
    full_file_link = frappe.utils.get_url(uploaded_file_url) if uploaded_file_url else ""

    try:
        frappe.sendmail(
            recipients=[sales_email],
            sender=sales_email,
            subject=f"PrintStoreAmaze Artwork & Quote Request: {company or full_name}",
            message=f"""
            <div style="font-family:Arial,sans-serif;color:#1e293b;max-width:600px;">
              <h2 style="color:#0f766e;margin-bottom:8px;">New Artwork &amp; Quote Submission</h2>
              <p>{summary_html}</p>
              {f'<p><strong>Download Artwork:</strong> <a href="{full_file_link}">{frappe.utils.escape_html(uploaded_file_name)}</a></p>' if full_file_link else ''}
              <p><a href="{lead_url}" style="display:inline-block;padding:8px 14px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Open Lead in ERPNext</a></p>
            </div>
            """,
            delayed=False,
        )
        frappe.sendmail(
            recipients=[email],
            sender=sales_email,
            subject="PrintStoreAmaze – We Received Your Artwork & Quote Request",
            message=f"""
            <div style="font-family:Arial,sans-serif;color:#1e293b;max-width:600px;">
              <h2 style="color:#0f766e;margin-bottom:8px;">Artwork &amp; Quote Request Received</h2>
              <p>Hi {frappe.utils.escape_html(full_name)},</p>
              <p>Thank you for reaching out to <strong>PrintStoreAmaze</strong>. Our branding specialists have received your details{f' and artwork file (<strong>{frappe.utils.escape_html(uploaded_file_name)}</strong>)' if uploaded_file_name else ''}, and will prepare your quote and <strong>free digital mockup</strong> shortly.</p>
              <p style="font-size:12px;color:#64748b;">Need immediate assistance? Call or WhatsApp us on <strong>084 027 7327</strong>.</p>
            </div>
            """,
            delayed=False,
        )
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Artwork Inquiry Email Failed")

    return {"status": "success", "lead": lead_name}


@frappe.whitelist(allow_guest=True)
def submit_guest_checkout(
    full_name,
    email,
    phone="",
    company="",
    address_line1="",
    city="",
    state="",
    pincode="",
    notes="",
    payment_method="payfast",
):
    if not full_name or not email:
        frappe.throw("Please enter your full name and email address.")

    from webshop.webshop.shopping_cart.cart import _get_cart_quotation

    doc = None
    try:
        quote_obj = _get_cart_quotation()
        doc = quote_obj.get("doc") if isinstance(quote_obj, dict) else quote_obj
    except Exception:
        doc = None

    if not doc or not getattr(doc, "items", None):
        party_cookie = frappe.request.cookies.get("party_name") if frappe.request else None
        filters = {"order_type": "Shopping Cart", "docstatus": 0}
        if party_cookie:
            filters["party_name"] = party_cookie
        else:
            filters["contact_email"] = "Guest"

        q_name = frappe.db.get_value("Quotation", filters, "name", order_by="modified desc")
        if q_name:
            doc = frappe.get_doc("Quotation", q_name)

    if not doc or not getattr(doc, "items", None):
        frappe.throw("Your cart is currently empty.")

    orig_user = frappe.session.user
    frappe.set_user("Administrator")
    try:
        return _process_guest_checkout_as_admin(
            doc, full_name, email, phone, company, address_line1, city, state, pincode, notes, payment_method
        )
    finally:
        frappe.set_user(orig_user)


def _process_guest_checkout_as_admin(
    doc, full_name, email, phone, company, address_line1, city, state, pincode, notes, payment_method="payfast"
):
    enable_checkout = bool(frappe.db.get_single_value("Webshop Settings", "enable_checkout"))

    # Mode A: Direct Online Checkout (Sales Order + Payment Gateway Redirect)
    if enable_checkout:
        if not address_line1 or not city:
            frappe.throw("Please enter your delivery street address and city.")

        customer_label = company.strip() or full_name.strip()
        customer_name = frappe.db.get_value("Customer", {"customer_name": customer_label}, "name")

        if not customer_name:
            # Check if a Contact with this email is already linked to a Customer
            contact_name = frappe.db.get_value("Contact", {"email_id": email}, "name")
            if contact_name:
                customer_name = frappe.db.get_value(
                    "Dynamic Link",
                    {"parent": contact_name, "parenttype": "Contact", "link_doctype": "Customer"},
                    "link_name",
                )

        if not customer_name:
            customer_group = (
                frappe.db.get_single_value("Webshop Settings", "default_customer_group")
                or frappe.db.get_single_value("Selling Settings", "customer_group")
                or "All Customer Groups"
            )
            territory = (
                frappe.db.get_single_value("Selling Settings", "territory")
                or frappe.db.get_single_value("Selling Settings", "territory")
                or "South Africa"
            )
            cust = frappe.get_doc({
                "doctype": "Customer",
                "customer_name": customer_label,
                "customer_type": "Company" if company.strip() else "Individual",
                "customer_group": customer_group,
                "territory": territory,
            })
            cust.flags.ignore_permissions = True
            cust.insert()
            customer_name = cust.name

        # Create or reuse Contact linked to Customer
        contact_name = frappe.db.get_value("Contact", {"email_id": email}, "name")
        if not contact_name:
            parts = full_name.strip().split(" ", 1)
            contact = frappe.get_doc({
                "doctype": "Contact",
                "first_name": parts[0],
                "last_name": parts[1] if len(parts) > 1 else "",
                "email_ids": [{"email_id": email, "is_primary": 1}],
                "phone_nos": [{"phone": phone, "is_primary_mobile_no": 1}] if phone else [],
                "links": [{"link_doctype": "Customer", "link_name": customer_name}],
            })
            contact.flags.ignore_permissions = True
            contact.insert()
            contact_name = contact.name

        # Create Shipping Address linked to Customer
        addr = frappe.get_doc({
            "doctype": "Address",
            "address_title": customer_label,
            "address_type": "Shipping",
            "address_line1": address_line1.strip(),
            "city": city.strip(),
            "state": state.strip(),
            "pincode": pincode.strip(),
            "country": frappe.db.get_default("country") or "South Africa",
            "email_id": email,
            "phone": phone,
            "links": [{"link_doctype": "Customer", "link_name": customer_name}],
        })
        addr.flags.ignore_permissions = True
        addr.insert()

        doc.quotation_to = "Customer"
        doc.party_name = customer_name
        doc.customer_name = customer_label
        doc.contact_person = contact_name
        doc.contact_display = full_name
        doc.contact_email = email
        doc.contact_mobile = phone
        doc.shipping_address_name = addr.name
        doc.customer_address = addr.name
        if notes:
            doc.terms = notes

        is_cod = (payment_method or "").strip().lower() == "cod"
        if is_cod and not bool(frappe.db.get_single_value("Webshop Settings", "enable_cod")):
            frappe.throw("Cash on Delivery is currently disabled.")

        cod_fee = float(frappe.db.get_single_value("Webshop Settings", "cod_delivery_charge") or 0)
        free_over = float(frappe.db.get_single_value("Webshop Settings", "cod_free_delivery_over") or 0)
        cart_net = float(doc.net_total or doc.total or sum((i.amount or 0) for i in doc.items))
        if cod_fee > 0 and (free_over <= 0 or cart_net < free_over):
            cod_item_code = "COD-DELIVERY"
            delivery_label = "Courier Delivery Fee"
            if not frappe.db.exists("Item", cod_item_code):
                item_group = frappe.db.get_value("Item Group", {"is_group": 0}, "name") or "All Item Groups"
                cod_item = frappe.get_doc({
                    "doctype": "Item",
                    "item_code": cod_item_code,
                    "item_name": delivery_label,
                    "item_group": item_group,
                    "stock_uom": "Nos",
                    "is_stock_item": 0,
                    "is_sales_item": 1,
                    "description": "Nationwide courier delivery fee (orders under free delivery threshold)",
                })
                cod_item.flags.ignore_permissions = True
                cod_item.insert()
            if not frappe.db.exists("Website Item", {"item_code": cod_item_code}):
                wi = frappe.get_doc({
                    "doctype": "Website Item",
                    "item_code": cod_item_code,
                    "web_item_name": delivery_label,
                    "published": 0,
                })
                wi.flags.ignore_permissions = True
                wi.insert()
            if not any(i.item_code == cod_item_code for i in doc.items):
                doc.append("items", {
                    "item_code": cod_item_code,
                    "item_name": delivery_label,
                    "qty": 1,
                    "rate": cod_fee,
                })
            doc.calculate_taxes_and_totals()

        if not doc.taxes:
            tax_template = (
                frappe.db.get_value("Sales Taxes and Charges Template", {"is_default": 1, "company": doc.company}, "name")
                or frappe.db.get_value("Sales Taxes and Charges Template", {"company": doc.company}, "name")
            )
            if tax_template:
                doc.taxes_and_charges = tax_template
                doc.set_taxes()
                doc.calculate_taxes_and_totals()

        doc.flags.ignore_permissions = True
        doc.save()
        doc.submit()

        from erpnext.selling.doctype.quotation.quotation import make_sales_order

        so = make_sales_order(doc.name)
        so.delivery_date = frappe.utils.add_days(frappe.utils.nowdate(), 7)
        if is_cod:
            so.terms = ((so.terms + "\n") if so.terms else "") + "Payment Method: Cash on Delivery (COD) — Collect payment upon delivery."
        so.flags.ignore_permissions = True
        so.insert()
        so.submit()

        if hasattr(frappe.local, "cookie_manager"):
            frappe.local.cookie_manager.delete_cookie("party_name")

        # Redirect to Payment Request if payment gateway is configured on Webshop Settings
        redirect_url = f"/orders/{so.name}"
        payment_gateway_account = (
            frappe.db.get_single_value("Webshop Settings", "payment_gateway_account")
            or frappe.db.get_value("Payment Gateway Account", {"is_default": 1}, "name")
            or "Payfast - ZAR - AD"
        )
        if is_cod:
            frappe.db.commit()
            return {
                "status": "success",
                "mode": "cod_order",
                "order_id": so.name,
                "grand_total": float(so.grand_total or 0),
                "redirect_url": f"/orders/{so.name}",
            }

        if payment_gateway_account and so.grand_total > 0:
            from erpnext.accounts.doctype.payment_request.payment_request import make_payment_request

            pr = make_payment_request(
                dt="Sales Order",
                dn=so.name,
                recipient_id=email,
                payment_gateway_account=payment_gateway_account,
                mute_email=1,
                submit_doc=1,
                return_doc=1,
            )
            pr_name = pr.get("name") if isinstance(pr, dict) else pr.name
            pr_doc = frappe.get_doc("Payment Request", pr_name)
            if pr_doc.payment_url:
                redirect_url = pr_doc.payment_url
            elif hasattr(pr_doc, "get_payment_url"):
                redirect_url = pr_doc.get_payment_url()

        frappe.db.commit()
        return {
            "status": "success",
            "mode": "order",
            "order_id": so.name,
            "redirect_url": redirect_url,
        }

    # Mode B: Quote Request Mode (when Enable Checkout is unchecked)
    lead_name = frappe.db.get_value("Lead", {"email_id": email}, "name")
    if not lead_name:
        lead = frappe.get_doc({
            "doctype": "Lead",
            "lead_name": full_name,
            "email_id": email,
            "mobile_no": phone,
            "company_name": company,
            "source": "Website",
        })
        lead.flags.ignore_permissions = True
        lead.insert()
        lead_name = lead.name

    doc.quotation_to = "Lead"
    doc.party_name = lead_name
    doc.customer_name = company or full_name
    doc.contact_display = full_name
    doc.contact_email = email
    doc.contact_mobile = phone
    if notes:
        doc.terms = notes

    doc.flags.ignore_permissions = True
    doc.save()
    doc.submit()
    frappe.db.commit()

    if hasattr(frappe.local, "cookie_manager"):
        frappe.local.cookie_manager.delete_cookie("party_name")

    return {
        "status": "success",
        "mode": "quote",
        "quotation_id": doc.name,
    }


@frappe.whitelist(allow_guest=True)
def guest_safe_update_cart(item_code, qty, additional_notes=None, with_items=False):
    from webshop.webshop.shopping_cart import cart as webshop_cart

    if frappe.session.user == "Guest":
        frappe.flags.ignore_permissions = True
        orig_get_settings = webshop_cart.get_shopping_cart_settings

        def _guest_cart_settings():
            settings = orig_get_settings()
            settings.enable_checkout = 0
            return settings

        webshop_cart.get_shopping_cart_settings = _guest_cart_settings
        try:
            return webshop_cart.update_cart(
                item_code=item_code,
                qty=qty,
                additional_notes=additional_notes,
                with_items=with_items,
            )
        finally:
            webshop_cart.get_shopping_cart_settings = orig_get_settings

    return webshop_cart.update_cart(
        item_code=item_code,
        qty=qty,
        additional_notes=additional_notes,
        with_items=with_items,
    )


@frappe.whitelist(allow_guest=True)
def guest_redirect_on_action():
    if frappe.db.get_single_value("Webshop Settings", "enable_guest_checkout"):
        return "/cart"
    return frappe.db.get_single_value("Webshop Settings", "redirect_on_action") or "/login"
@frappe.whitelist(allow_guest=True)
def create_chat_lead(full_name="", email="", phone="", message=""):
    full_name = (full_name or "").strip() or "Website Chat Visitor"
    email = (email or "").strip()
    phone = (phone or "").strip()
    message = (message or "").strip()

    if not email and not phone:
        frappe.throw("Please provide an email address or phone number so our team can reply.")

    lead_name = None
    if email:
        lead_name = frappe.db.get_value("CRM Lead", {"email": email}, "name")
    if not lead_name and phone:
        lead_name = frappe.db.get_value("CRM Lead", {"mobile_no": phone}, "name")

    if not lead_name:
        parts = full_name.split(" ", 1)
        lead_doc = frappe.get_doc({
            "doctype": "CRM Lead",
            "first_name": parts[0],
            "last_name": parts[1] if len(parts) > 1 else "",
            "email": email,
            "mobile_no": phone,
            "source": "Website" if frappe.db.exists("CRM Lead Source", "Website") else None,
        })
        lead_doc.flags.ignore_permissions = True
        lead_doc.insert()
        lead_name = lead_doc.name
    else:
        lead_doc = frappe.get_doc("CRM Lead", lead_name)

    if message:
        comment_html = (
            f"<strong>PrintStoreAmaze Live Chat Enquiry</strong><br>"
            f"<strong>Name:</strong> {frappe.utils.escape_html(full_name)}<br>"
            f"<strong>Email:</strong> {frappe.utils.escape_html(email or '-')}<br>"
            f"<strong>Phone / WhatsApp:</strong> {frappe.utils.escape_html(phone or '-')}<br>"
            f"<strong>Message:</strong> {frappe.utils.escape_html(message)}"
        )
        lead_doc.add_comment("Comment", comment_html)

    sales_email = (
        frappe.db.get_value("Contact Us Settings", None, "email_id")
        or frappe.db.get_value("Email Account", {"default_outgoing": 1, "enable_outgoing": 1}, "email_id")
        or "sales@a1its.net"
    )
    crm_url = frappe.utils.get_url(f"/crm/leads/{lead_name}")

    try:
        frappe.sendmail(
            recipients=[sales_email],
            sender=sales_email,
            subject=f"New CRM Lead (Live Chat): {full_name}",
            message=f"""
            <div style="font-family:Arial,sans-serif;color:#1e293b;max-width:560px;">
              <h3 style="color:#0f766e;margin-bottom:8px;">New Website Live Chat Enquiry</h3>
              <p><strong>Name:</strong> {frappe.utils.escape_html(full_name)}<br>
              <strong>Email:</strong> {frappe.utils.escape_html(email or '-')}<br>
              <strong>Phone:</strong> {frappe.utils.escape_html(phone or '-')}</p>
              <p><strong>Message:</strong><br>{frappe.utils.escape_html(message or '-')}</p>
              <p><a href="{crm_url}" style="display:inline-block;padding:8px 14px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Open Lead in Frappe CRM</a></p>
            </div>
            """,
            delayed=False,
        )
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Live Chat CRM Lead Email Failed")

    frappe.db.commit()
    return {"status": "success", "lead": lead_name}
