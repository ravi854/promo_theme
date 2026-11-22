window._psaGuestCheckoutEnabled = true;

document.addEventListener('click', function (e) {
  var user = (window.frappe && frappe.session && frappe.session.user) || 'Guest';
  if (user !== 'Guest') return;
  if (!window._psaGuestCheckoutEnabled) return;

  var btn = e.target.closest('.btn-add-to-cart-list, .btn-add-to-cart, .promo-btn-cart');
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  var itemCode =
    btn.getAttribute('data-item-code') ||
    (btn.closest('[data-item-code]') && btn.closest('[data-item-code]').getAttribute('data-item-code'));
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
        frappe.show_alert({
          message: 'Added to cart. <a href="/cart"><b>View Cart &amp; Checkout</b></a>',
          indicator: 'green'
        });
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
      var count = parseInt(frappe.get_cookie('cart_count') || '0', 10);
      if (count > 0) {
        $('.shopping-cart').removeClass('hidden').css('display', 'inline-flex');
        $('.cart-icon').css('display', 'inline');
      }

      if (window.location.pathname.replace(/\/+$/, '') !== '/cart') return;

      var renderBox = function () {
        if (document.getElementById('psa-guest-checkout-box')) return;
        var host = document.querySelector('.cart-container .col-md-4, .cart-container .col-lg-4') || document.querySelector('.cart-container');
        if (!host) return;
        if (document.querySelector('.cart-empty, .no-item-wrapper') && !document.querySelector('.cart-items tr, .cart-item-wrapper')) return;

        $('.cart-tax-items').css('display', 'block');
        $('.cart-container a[href*="login"], .cart-container .btn-login, .cart-container .btn-place-order').hide();

        var addrHtml = checkoutOn
          ? '<div class="form-group mb-2"><input type="text" id="gc-address1" class="form-control form-control-sm" placeholder="Delivery Street Address *" required></div>' +
            '<div class="form-row mb-2">' +
            '<div class="col"><input type="text" id="gc-city" class="form-control form-control-sm" placeholder="City *" required></div>' +
            '<div class="col"><select id="gc-state" class="form-control form-control-sm">' +
            '<option value="Gauteng">Gauteng</option><option value="Western Cape">Western Cape</option>' +
            '<option value="KwaZulu-Natal">KwaZulu-Natal</option><option value="Eastern Cape">Eastern Cape</option>' +
            '<option value="Free State">Free State</option><option value="Limpopo">Limpopo</option>' +
            '<option value="Mpumalanga">Mpumalanga</option><option value="North West">North West</option>' +
            '<option value="Northern Cape">Northern Cape</option></select></div>' +
            '<div class="col-4"><input type="text" id="gc-pincode" class="form-control form-control-sm" placeholder="Code"></div></div>'
          : '';

        var box = document.createElement('div');
        box.id = 'psa-guest-checkout-box';
        box.className = 'psa-guest-checkout-box mt-3';
        box.innerHTML =
          '<h5 class="font-weight-bold mb-1">' + (checkoutOn ? 'Guest Express Checkout' : 'Request Your Quote') + '</h5>' +
          '<p class="text-muted mb-2" style="font-size:12px;">' +
          (checkoutOn ? 'Enter delivery details to place your order without logging in.' : 'Enter your details to receive a formal quote.') +
          '</p>' +
          '<form id="psa-guest-checkout-form">' +
          '<div class="form-group mb-2"><input type="text" id="gc-name" class="form-control form-control-sm" placeholder="Full Name *" required></div>' +
          '<div class="form-group mb-2"><input type="email" id="gc-email" class="form-control form-control-sm" placeholder="Email Address *" required></div>' +
          '<div class="form-row mb-2">' +
          '<div class="col"><input type="text" id="gc-phone" class="form-control form-control-sm" placeholder="Phone / WhatsApp *" required></div>' +
          '<div class="col"><input type="text" id="gc-company" class="form-control form-control-sm" placeholder="Company (Optional)"></div></div>' +
          addrHtml +
          '<div class="form-group mb-2"><textarea id="gc-notes" rows="2" class="form-control form-control-sm" placeholder="Branding or delivery notes..."></textarea></div>' +
          '<button type="submit" id="gc-submit-btn" class="btn btn-primary btn-block font-weight-bold">' +
          (checkoutOn ? 'Place Order &amp; Pay Now' : 'Submit Quote Request') +
          '</button></form>';

        host.appendChild(box);

        document.getElementById('psa-guest-checkout-form').addEventListener('submit', function (e) {
          e.preventDefault();
          var btn = document.getElementById('gc-submit-btn');
          btn.disabled = true;
          btn.textContent = checkoutOn ? 'Processing Order...' : 'Submitting Quote...';

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
              notes: document.getElementById('gc-notes').value.trim()
            },
            callback: function (res) {
              var out = res.message;
              if (!out || out.status !== 'success') return;
              if (out.mode === 'order' && out.redirect_url) {
                window.location.href = out.redirect_url;
              } else {
                box.innerHTML = '<div class="alert alert-success mb-0"><b>Quote Request Received!</b> Ref: ' + frappe.utils.escape_html(out.quotation_id || '') + '</div>';
              }
            },
            always: function () {
              btn.disabled = false;
              btn.innerHTML = checkoutOn ? 'Place Order &amp; Pay Now' : 'Submit Quote Request';
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
