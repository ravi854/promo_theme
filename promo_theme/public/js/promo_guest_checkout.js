window._psaGuestCheckoutEnabled = true;

document.addEventListener('click', function (e) {
  var user = (window.frappe && frappe.session && frappe.session.user) || 'Guest';
  if (user !== 'Guest' || !window._psaGuestCheckoutEnabled) return;
  var btn = e.target.closest('.btn-add-to-cart-list, .btn-add-to-cart, .promo-btn-cart');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  var itemCode = btn.getAttribute('data-item-code') || (btn.closest('[data-item-code]') && btn.closest('[data-item-code]').getAttribute('data-item-code'));
  if (!itemCode) return;
  var qtyEl = btn.closest('.item-cart, .cart-action-container, .product-details, .promo-card');
  var qtyInput = qtyEl ? qtyEl.querySelector('input.cart-qty, input[type="number"]') : null;
  var qty = qtyInput ? (parseFloat(qtyInput.value) || 1) : 1;
  btn.disabled = true;
  frappe.call({
    type: 'POST',
    method: 'webshop.webshop.shopping_cart.cart.update_cart',
    args: { item_code: itemCode, qty: qty },
    callback: function (r) {
      btn.disabled = false;
      if (r && !r.exc) {
        var count = parseInt(frappe.get_cookie('cart_count') || '1', 10) || 1;
        $('.shopping-cart').removeClass('hidden').css('display', 'inline-flex');
        $('.cart-icon').css('display', 'inline');
        if (!$('#cart-count').length) {
          $('.cart-icon').append('<span class="badge badge-primary cart-badge" id="cart-count">' + count + '</span>');
        } else {
          $('#cart-count').text(count);
        }
        frappe.show_alert({ message: 'Added to cart. <a href="/cart"><b>View Cart &amp; Checkout</b></a>', indicator: 'green' });
      }
    }
  });
}, true);

frappe.ready(function () {
  if (frappe.session.user !== 'Guest') return;
  frappe.call({
    method: 'promo_theme.api.get_store_contact',
    callback: function (r) {
      var cfg = r.message || {};
      window._psaGuestCheckoutEnabled = Boolean(cfg.enable_guest_checkout);
      if (!window._psaGuestCheckoutEnabled) return;
      var checkoutOn = Boolean(cfg.enable_checkout);
      var codOn = Boolean(cfg.enable_cod);
      if (parseInt(frappe.get_cookie('cart_count') || '0', 10) > 0) {
        $('.shopping-cart').removeClass('hidden').css('display', 'inline-flex');
        $('.cart-icon').css('display', 'inline');
      }
      if (window.location.pathname.replace(/\/+$/, '') !== '/cart') return;

      var renderVat = function (box) {
        var totalText = '';
        document.querySelectorAll('.cart-tax-items td, .cart-tax-items .text-right, .payment-summary td').forEach(function (el) {
          var m = el.textContent.replace(/,/g, '').match(/R\s*([0-9]+(?:\.[0-9]+)?)/);
          if (m) totalText = m;
        });
        var exVat = parseFloat(totalText || '0');
        if (!exVat || exVat <= 0) return;
        var vat = exVat * 0.15;
        var fmt = function (n) { return 'R ' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
        var sum = document.getElementById('psa-vat-summary');
        if (!sum) {
          sum = document.createElement('div');
          sum.id = 'psa-vat-summary';
          sum.style.cssText = 'background:#f0fdfa;border:1px solid #99f6e4;border-radius:6px;padding:8px 10px;margin-bottom:10px;font-size:12px;';
          var form = document.getElementById('psa-guest-checkout-form');
          if (form) box.insertBefore(sum, form);
        }
        sum.innerHTML =
          '<div class="d-flex justify-content-between"><span>Subtotal (ex VAT):</span><b>' + fmt(exVat) + '</b></div>' +
          '<div class="d-flex justify-content-between"><span>VAT (15%):</span><b>' + fmt(vat) + '</b></div>' +
          '<div class="d-flex justify-content-between mt-1 pt-1" style="border-top:1px solid #99f6e4;color:#0f766e;font-size:13.5px;">' +
          '<span><b>Final Total (incl. VAT):</b></span><b>' + fmt(exVat + vat) + '</b></div>';
      };

      var renderBox = function () {
        var existing = document.getElementById('psa-guest-checkout-box');
        if (existing) { renderVat(existing); return; }
        var host = document.querySelector('.cart-container .col-md-4, .cart-container .col-lg-4') || document.querySelector('.cart-container');
        if (!host) return;
        if (document.querySelector('.cart-empty, .no-item-wrapper') && !document.querySelector('.cart-items tr, .cart-item-wrapper')) return;

        $('.cart-tax-items').css('display', 'block');
        $('.cart-container a[href*="login"], .cart-container .btn-login, .cart-container .btn-place-order').hide();

        var addrHtml = checkoutOn
          ? '<div class="form-group mb-2"><input type="text" id="gc-address1" class="form-control form-control-sm" placeholder="Delivery Street Address *" required></div>' +
            '<div class="form-row mb-2"><div class="col"><input type="text" id="gc-city" class="form-control form-control-sm" placeholder="City *" required></div>' +
            '<div class="col"><select id="gc-state" class="form-control form-control-sm">' +
            '<option value="Gauteng">Gauteng</option><option value="Western Cape">Western Cape</option><option value="KwaZulu-Natal">KwaZulu-Natal</option>' +
            '<option value="Eastern Cape">Eastern Cape</option><option value="Free State">Free State</option><option value="Limpopo">Limpopo</option>' +
            '<option value="Mpumalanga">Mpumalanga</option><option value="North West">North West</option><option value="Northern Cape">Northern Cape</option></select></div>' +
            '<div class="col-4"><input type="text" id="gc-pincode" class="form-control form-control-sm" placeholder="Code"></div></div>'
          : '';

        var payHtml = checkoutOn
          ? '<div class="mb-2" style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;padding:8px 10px;font-size:12px;">' +
            '<div class="font-weight-bold mb-1" style="color:#132a2e;">Select Payment Option:</div>' +
            '<label class="d-flex align-items-center mb-1" style="cursor:pointer;gap:6px;"><input type="radio" name="gc-payment-method" value="payfast" checked> <span><b>Pay Online via Payfast</b></span></label>' +
            (codOn ? '<label class="d-flex align-items-center mb-0" style="cursor:pointer;gap:6px;"><input type="radio" name="gc-payment-method" value="cod"> <span><b>Cash on Delivery (COD)</b></span></label>' : '') +
            '</div>'
          : '';

        var box = document.createElement('div');
        box.id = 'psa-guest-checkout-box';
        box.className = 'psa-guest-checkout-box mt-3';
        box.innerHTML =
          '<h5 class="font-weight-bold mb-1">' + (checkoutOn ? 'Guest Express Checkout' : 'Request Your Quote') + '</h5>' +
          '<form id="psa-guest-checkout-form">' +
          '<div class="form-group mb-2"><input type="text" id="gc-name" class="form-control form-control-sm" placeholder="Full Name *" required></div>' +
          '<div class="form-group mb-2"><input type="email" id="gc-email" class="form-control form-control-sm" placeholder="Email Address *" required></div>' +
          '<div class="form-row mb-2"><div class="col"><input type="text" id="gc-phone" class="form-control form-control-sm" placeholder="Phone / WhatsApp *" required></div>' +
          '<div class="col"><input type="text" id="gc-company" class="form-control form-control-sm" placeholder="Company (Optional)"></div></div>' +
          addrHtml +
          '<div class="form-group mb-2"><textarea id="gc-notes" rows="2" class="form-control form-control-sm" placeholder="Branding or delivery notes..."></textarea></div>' +
          payHtml +
          '<button type="submit" id="gc-submit-btn" class="btn btn-primary btn-block font-weight-bold">' +
          (checkoutOn ? 'Place Order &amp; Pay Now' : 'Submit Quote Request') + '</button></form>';

        host.appendChild(box);
        renderVat(box);

        box.querySelectorAll('input[name="gc-payment-method"]').forEach(function (radio) {
          radio.addEventListener('change', function () {
            var btn = document.getElementById('gc-submit-btn');
            if (btn) btn.innerHTML = radio.value === 'cod' ? 'Place Order (Cash on Delivery)' : 'Place Order &amp; Pay Now';
          });
        });

        document.getElementById('psa-guest-checkout-form').addEventListener('submit', function (e) {
          e.preventDefault();
          var btn = document.getElementById('gc-submit-btn');
          var sel = box.querySelector('input[name="gc-payment-method"]:checked');
          var payMethod = sel ? sel.value : 'payfast';
          btn.disabled = true;
          btn.textContent = 'Processing Order...';

          frappe.call({
            method: 'promo_theme.api.submit_guest_checkout',
            args: {
              full_name: document.getElementById('gc-name').value.trim(),
              email: document.getElementById('gc-email').value.trim(),
              phone: document.getElementById('gc-phone').value.trim(),
              company: document.getElementById('gc-company').value.trim(),
              address_line1: document.getElementById('gc-address1') ? document.getElementById('gc-address1').value.trim() : '',
              city: document.getElementById('gc-city') ? document.getElementById('gc-city').value.trim() : '',
              state: document.getElementById('gc-state') ? document.getElementById('gc-state').value.trim() : '',
              pincode: document.getElementById('gc-pincode') ? document.getElementById('gc-pincode').value.trim() : '',
              notes: document.getElementById('gc-notes').value.trim(),
              payment_method: payMethod
            },
            callback: function (res) {
              var out = res.message;
              if (!out || out.status !== 'success') return;
              if (out.mode === 'cod_order') {
                var amt = (out.grand_total || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                box.innerHTML = '<div class="alert alert-success mb-0"><b>Order Confirmed (Cash on Delivery)!</b><br>Order: <b>' + frappe.utils.escape_html(out.order_id || '') + '</b><br>Payable on Delivery: <b>R ' + amt + ' (incl. VAT)</b></div>';
              } else if (out.mode === 'order' && out.redirect_url) {
                window.location.href = out.redirect_url;
              } else {
                box.innerHTML = '<div class="alert alert-success mb-0"><b>Quote Request Received!</b> Ref: ' + frappe.utils.escape_html(out.quotation_id || '') + '</div>';
              }
            },
            always: function () {
              if (!document.getElementById('gc-submit-btn')) return;
              btn.disabled = false;
              btn.innerHTML = payMethod === 'cod' ? 'Place Order (Cash on Delivery)' : (checkoutOn ? 'Place Order &amp; Pay Now' : 'Submit Quote Request');
            }
          });
        });
      };

      renderBox();
      setTimeout(renderBox, 400);
      setTimeout(renderBox, 1000);
    }
  });
});
