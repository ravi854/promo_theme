import frappe

no_cache = 1


def get_context(context):
    context.no_cache = 1
    context.title = "Contact & Artwork Upload | PrintStoreAmaze"
    context.phone = (frappe.db.get_single_value("Contact Us Settings", "phone") or "084 027 7327").strip()
    context.email = (frappe.db.get_single_value("Contact Us Settings", "email_id") or "sales@a1its.net").strip()
    digits = "".join(ch for ch in context.phone if ch.isdigit())
    context.tel_href = "tel:" + digits
    context.wa_number = "27" + digits[1:] if digits.startswith("0") and len(digits) == 10 else digits
