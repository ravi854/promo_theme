frappe.ready(() => {
  if (typeof webshop !== "undefined" && webshop.ProductGrid) {
    const orig_get_card_html = webshop.ProductGrid.prototype.get_card_html;

    webshop.ProductGrid.prototype.get_card_html = function(item) {
      let html = orig_get_card_html.call(this, item);
      let $card = $(html);

      // 1. Add Top Badges (In Stock + Brandable)
      let badges = `<div class="d-flex gap-1 mb-2 px-3 pt-3">`;
      if (item.in_stock) {
        badges += `<span class="badge-in-stock">In Stock</span>`;
      }
      if (item.custom_brandable) {
        badges += `<span class="badge bg-light text-dark border rounded-pill px-2 py-1 small">Brandable</span>`;
      }
      badges += `</div>`;
      $card.find(".card").prepend(badges);

      // 2. Inject SKU Code under Product Title
      let sku_html = `<div class="text-muted small mb-1">SKU: ${item.item_code}</div>`;
      $card.find(".product-title").after(sku_html);

      return $card.prop("outerHTML");
    };
  }
});
