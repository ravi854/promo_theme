import frappe

no_cache = 1


def get_context(context):
    context.title = "Request a Corporate Quote & Free Digital Mockup"
    context.no_breadcrumbs = 1
    try:
        from webshop.webshop.shopping_cart.cart import _get_cart_quotation

        party_name = frappe.request.cookies.get("party_name") if getattr(frappe, "request", None) else None
        quote_obj = _get_cart_quotation(party_name=party_name) if party_name else _get_cart_quotation()
        doc = quote_obj.get("doc") if isinstance(quote_obj, dict) else quote_obj
        context.quote_items = [i for i in (doc.items or []) if i.item_code != "COD-DELIVERY"] if doc else []
        context.quote_total = float(doc.net_total or 0) if doc else 0.0
    except Exception:
        context.quote_items = []
        context.quote_total = 0.0
