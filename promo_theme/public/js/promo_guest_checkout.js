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
      var deliveryFeeCfg = parseFloat(cfg.cod_delivery_charge || '0') || 0;
      var freeOver = parseFloat(cfg.cod_free_delivery_over || '0') || 0;

      if (parseInt(frappe.get_cookie('cart_count') || '0', 10) > 0) {
        $('.shopping-cart').removeClass('hidden').css('display', 'inline-flex');
        $('.cart-icon').css('display', 'inline');
      }
      if (window.location.pathname.replace(/\/+$/, '') !== '/cart') return;

      var fmt = function (n) {
        return 'R ' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      var getCartExVat = function () {
        var totalText = '';
        document.querySelectorAll('.cart-tax-items td, .cart-tax-items .text-right, .payment-summary td').forEach(function (el) {
          var m = el.textContent.replace(/,/g, '').match(/R\s*([0-9]+(?:\.[0-9]+)?)/);
          if (m) totalText = m[1];
        });
        return parseFloat(totalText || '0') || 0;
      };

      var showThresholdModal = function (exVat) {
        if (deliveryFeeCfg <= 0 || freeOver <= 0 || exVat <= 0 || exVat >= freeOver) return;
        var oldModal = document.getElementById('psa-cod-threshold-modal');
        if (oldModal) oldModal.remove();

        var remaining = Math.max(0, freeOver - exVat);
        var overlay = document.createElement('div');
        overlay.id = 'psa-cod-threshold-modal';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(19,42,46,0.58);z-index:10050;display:flex;align-items:center;justify-content:center;padding:16px;';
        overlay.innerHTML =
          '<div style="background:#ffffff;max-width:440px;width:100%;border-radius:12px;box-shadow:0 20px 45px rgba(0,0,0,0.22);overflow:hidden;border:1.5px solid #0f766e;">' +
          '<div style="background:#132a2e;color:#ffffff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">' +
          '<strong style="font-size:15px;">Delivery Fee Notice</strong>' +
          '<button type="button" id="psa-cod-close-x" style="background:none;border:none;color:#ffffff;font-size:20px;line-height:1;cursor:pointer;">&times;</button></div>' +
          '<div style="padding:18px;font-size:13.5px;line-height:1.5;color:#132a2e;">' +
          '<p class="mb-2">Your current order subtotal is <b>' + fmt(exVat) + ' ex VAT</b>, which is below our <b>' + fmt(freeOver) + ' ex VAT</b> free delivery threshold.</p>' +
          '<div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;padding:10px 12px;margin-bottom:16px;font-size:13px;">' +
          '<div>&bull; Orders below ' + fmt(freeOver) + ' ex VAT incur a <b>' + fmt(deliveryFeeCfg) + ' ex VAT</b> courier delivery fee.</div>' +
          '<div class="mt-1">&bull; Add <b>' + fmt(remaining) + ' ex VAT</b> more to qualify for <b>FREE Delivery</b>!</div></div>' +
          '<div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">' +
          '<a href="/all-products" class="btn btn-outline-secondary font-weight-bold" style="font-size:13px;">Continue Shopping</a>' +
          '<button type="button" id="psa-cod-proceed-btn" class="btn btn-primary font-weight-bold" style="font-size:13px;">Proceed (+' + fmt(deliveryFeeCfg) + ' Delivery)</button>' +
          '</div></div></div>';

        document.body.appendChild(overlay);
        var closeModal = function () { overlay.remove(); };
        document.getElementById('psa-cod-close-x').addEventListener('click', closeModal);
        document.getElementById('psa-cod-proceed-btn').addEventListener('click', closeModal);
        overlay.addEventListener('click', function (ev) { if (ev.target === overlay) closeModal(); });
      };

      var renderVat = function (box) {
        var exVat = getCartExVat();
        if (!exVat || exVat <= 0) return;
        var deliveryFee = (checkoutOn && deliveryFeeCfg > 0 && (freeOver <= 0 || exVat < freeOver)) ? deliveryFeeCfg : 0;
        var taxableSub = exVat + deliveryFee;
        var vat = taxableSub * 0.15;

        var sum = document.getElementById('psa-vat-summary'); if (sum) sum.setAttribute('data-ex-vat', String(exVat));
        if (!sum) {
          sum = document.createElement('div');
          sum.id = 'psa-vat-summary';
          sum.style.cssText = 'background:#f0fdfa;border:1px solid #99f6e4;border-radius:6px;padding:8px 10px;margin-bottom:10px;font-size:12px;';
          var form = document.getElementById('psa-guest-checkout-form');
          if (form) box.insertBefore(sum, form);
        }

        var deliveryRow = checkoutOn
          ? '<div class="d-flex justify-content-between"><span>Courier Delivery (ex VAT):</span><b>' + (deliveryFee > 0 ? fmt(deliveryFee) : 'FREE') + '</b></div>'
          : '';

        sum.innerHTML =
          '<div class="d-flex justify-content-between"><span>Items Subtotal (ex VAT):</span><b>' + fmt(exVat) + '</b></div>' +
          deliveryRow +
          '<div class="d-flex justify-content-between"><span>VAT (15%):</span><b>' + fmt(vat) + '</b></div>' +
          '<div class="d-flex justify-content-between mt-1 pt-1" style="border-top:1px solid #99f6e4;color:#0f766e;font-size:13.5px;">' +
          '<span><b>Final Total (incl. VAT):</b></span><b>' + fmt(taxableSub + vat) + '</b></div>';
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

        var feeNote = (deliveryFeeCfg > 0 && freeOver > 0)
          ? '<div class="text-muted mb-1" style="font-size:11px;">Orders under ' + fmt(freeOver) + ' ex VAT incur a ' + fmt(deliveryFeeCfg) + ' ex VAT delivery fee.</div>'
          : '';

        var payHtml = checkoutOn
          ? '<div class="mb-2" style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;padding:8px 10px;font-size:12px;">' +
            '<div class="font-weight-bold mb-1" style="color:#132a2e;">Select Payment Option:</div>' + feeNote +
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

        setTimeout(function () {
          var exVatNow = getCartExVat();
          if (checkoutOn && exVatNow > 0 && exVatNow < freeOver && !window._psaFeeModalShown) {
            window._psaFeeModalShown = true;
            showThresholdModal(exVatNow);
          }
        }, 500);

        box.querySelectorAll('input[name="gc-payment-method"]').forEach(function (radio) {
          radio.addEventListener('change', function () {
            var btn = document.getElementById('gc-submit-btn');
            if (btn) btn.innerHTML = radio.value === 'cod' ? 'Place Order (Cash on Delivery)' : 'Place Order &amp; Pay Now';
            renderVat(box);
            showThresholdModal(getCartExVat());
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
              payment_method: payMethod,
              shipping_rate: (document.querySelector('input[name="gc-shipping-option"]:checked') && document.querySelector('input[name="gc-shipping-option"]:checked').getAttribute('data-rate')) || '',
              shipping_service: (document.querySelector('input[name="gc-shipping-option"]:checked') && document.querySelector('input[name="gc-shipping-option"]:checked').getAttribute('data-service')) || ''
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

frappe.ready(function () {
  if (frappe.session.user !== 'Guest') return;
  if (window.location.pathname.replace(/\/+$/, '') !== '/cart') return;

  var syncGuestCartQty = function (itemCode, newQty) {
    frappe.call({
      type: 'POST',
      method: 'webshop.webshop.shopping_cart.cart.update_cart',
      args: { item_code: itemCode, qty: newQty, with_items: 1 },
      callback: function (r) {
        if (!r || r.exc || !r.message) return;
        if (newQty <= 0 || !r.message.items) {
          window.location.reload();
          return;
        }
        $('.cart-items').html(r.message.items);
        $('.cart-tax-items').html(r.message.total).css('display', 'block');
        $('.payment-summary').html(r.message.taxes_and_totals);

        var exVat = 0;
        document.querySelectorAll('.cart-tax-items td, .cart-tax-items .text-right, .payment-summary td').forEach(function (el) {
          var m = el.textContent.replace(/,/g, '').match(/R\s*([0-9]+(?:\.[0-9]+)?)/);
          if (m && m[1]) exVat = parseFloat(m[1]) || exVat;
        });

        if (exVat > 0) {
          frappe.call({
            method: 'promo_theme.api.get_store_contact',
            callback: function (cfgRes) {
              var cfg = cfgRes.message || {};
              var checkoutOn = Boolean(cfg.enable_checkout);
              var feeCfg = parseFloat(cfg.cod_delivery_charge || '0') || 0;
              var freeOver = parseFloat(cfg.cod_free_delivery_over || '0') || 0;
              var deliveryFee = (checkoutOn && feeCfg > 0 && (freeOver <= 0 || exVat < freeOver)) ? feeCfg : 0;
              var taxableSub = exVat + deliveryFee;
              var vat = taxableSub * 0.15;
              var fmt = function (n) {
                return 'R ' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              };

              var sum = document.getElementById('psa-vat-summary'); if (sum) sum.setAttribute('data-ex-vat', String(exVat));
              if (sum) {
                var deliveryRow = checkoutOn
                  ? '<div class="d-flex justify-content-between"><span>Courier Delivery (ex VAT):</span><b>' + (deliveryFee > 0 ? fmt(deliveryFee) : 'FREE') + '</b></div>'
                  : '';
                sum.innerHTML =
                  '<div class="d-flex justify-content-between"><span>Items Subtotal (ex VAT):</span><b>' + fmt(exVat) + '</b></div>' +
                  deliveryRow +
                  '<div class="d-flex justify-content-between"><span>VAT (15%):</span><b>' + fmt(vat) + '</b></div>' +
                  '<div class="d-flex justify-content-between mt-1 pt-1" style="border-top:1px solid #99f6e4;color:#0f766e;font-size:13.5px;">' +
                  '<span><b>Final Total (incl. VAT):</b></span><b>' + fmt(taxableSub + vat) + '</b></div>';
              }
            }
          });
        }
      }
    });
  };

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.cart-btn, .remove-cart-item');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    var row = btn.closest('tr, .cart-item-wrapper');
    var input = row ? row.querySelector('input.cart-qty') : null;
    var itemCode = btn.getAttribute('data-item-code') || (input && input.getAttribute('data-item-code'));
    if (!itemCode) return;

    if (btn.classList.contains('remove-cart-item')) {
      syncGuestCartQty(itemCode, 0);
      return;
    }

    var cur = input ? (parseFloat(input.value) || 1) : 1;
    var dir = btn.getAttribute('data-dir');
    var next = dir === 'up' ? cur + 1 : Math.max(0, cur - 1);
    if (input) input.value = next;
    syncGuestCartQty(itemCode, next);
  }, true);

  document.addEventListener('change', function (e) {
    var input = e.target;
    if (!input || !input.classList || !input.classList.contains('cart-qty')) return;
    e.stopPropagation();
    e.stopImmediatePropagation();
    var itemCode = input.getAttribute('data-item-code');
    var next = Math.max(0, parseFloat(input.value) || 0);
    if (itemCode) syncGuestCartQty(itemCode, next);
  }, true);
});

frappe.ready(function () {
  if (window.location.pathname.replace(/\/+$/, '') !== '/cart') return;

  var fmt = function (n) {
    return 'R ' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  var getCartExVat = function () {
    var totalText = '';
    document.querySelectorAll('.cart-tax-items td, .cart-tax-items .text-right, .payment-summary td').forEach(function (el) {
      var m = el.textContent.replace(/,/g, '').match(/R\s*([0-9]+(?:\.[0-9]+)?)/);
      if (m) totalText = m;
    });
    return parseFloat(totalText || '0') || 0;
  };

  var updateVatWithSelectedShipping = function () {
    var sumEl = document.getElementById('psa-vat-summary');
    var exVat = sumEl ? (parseFloat(sumEl.getAttribute('data-ex-vat') || '0') || 0) : 0;
    if (!exVat) {
      var tEl = document.querySelector('.cart-tax-items td.text-right, .cart-tax-items .text-right, .cart-tax-items tr:last-child td:last-child');
      if (tEl) exVat = parseFloat(tEl.textContent.replace(/[^0-9.]/g, '')) || 0;
    }
    if (!exVat || exVat <= 0) return;

    var selShip = document.querySelector('input[name="gc-shipping-option"]:checked');
    var shipFee = selShip ? (parseFloat(selShip.getAttribute('data-rate') || '0') || 0) : 0;
    var taxableSub = exVat + shipFee;
    var vat = taxableSub * 0.15;

    var sum = document.getElementById('psa-vat-summary'); if (sum) sum.setAttribute('data-ex-vat', String(exVat));
    if (sum) {
      sum.innerHTML =
        '<div class="d-flex justify-content-between"><span>Items Subtotal (ex VAT):</span><b>' + fmt(exVat) + '</b></div>' +
        '<div class="d-flex justify-content-between"><span>Courier Delivery (ex VAT):</span><b>' + (shipFee > 0 ? fmt(shipFee) : 'FREE') + '</b></div>' +
        '<div class="d-flex justify-content-between"><span>VAT (15%):</span><b>' + fmt(vat) + '</b></div>' +
        '<div class="d-flex justify-content-between mt-1 pt-1" style="border-top:1px solid #99f6e4;color:#0f766e;font-size:13.5px;">' +
        '<span><b>Final Total (incl. VAT):</b></span><b>' + fmt(taxableSub + vat) + '</b></div>';
    }
  };

  var fetchLiveRates = function () {
    var shipBox = document.getElementById('psa-shipping-rates-box');
    if (!shipBox) return;
    var city = (document.getElementById('gc-city') && document.getElementById('gc-city').value.trim()) || '';
    var state = (document.getElementById('gc-state') && document.getElementById('gc-state').value.trim()) || 'Gauteng';
    var pincode = (document.getElementById('gc-pincode') && document.getElementById('gc-pincode').value.trim()) || '';
    var addr1 = (document.getElementById('gc-address1') && document.getElementById('gc-address1').value.trim()) || '';

    shipBox.innerHTML = '<div class="text-muted" style="font-size:11.5px;">Fetching South African courier rates...</div>';

    frappe.call({
      method: 'promo_theme.api.get_webshop_shipping_rates',
      args: { address_line1: addr1, city: city, state: state, pincode: pincode, cart_total: getCartExVat() },
      callback: function (r) {
        var data = r.message || {};
        var rates = data.rates || [];
        if (!rates.length) return;

        var html = '<div class="font-weight-bold mb-1" style="color:#132a2e;">Select Courier Delivery Option:</div>';
        rates.forEach(function (rt, idx) {
          var label = rt.carrier + ' — ' + rt.service_name;
          var priceTxt = rt.rate_ex_vat > 0 ? (fmt(rt.rate_ex_vat) + ' ex VAT') : 'FREE';
          html +=
            '<label class="d-flex justify-content-between align-items-center mb-1" style="cursor:pointer;gap:6px;">' +
            '<span><input type="radio" name="gc-shipping-option" value="' + idx + '" data-rate="' + rt.rate_ex_vat + '" data-service="' + frappe.utils.escape_html(label) + '"' + (idx === 0 ? ' checked' : '') + '> ' +
            frappe.utils.escape_html(label) + '</span>' +
            '<b>' + priceTxt + '</b></label>';
        });
        shipBox.innerHTML = html;

        shipBox.querySelectorAll('input[name="gc-shipping-option"]').forEach(function (rad) {
          rad.addEventListener('change', updateVatWithSelectedShipping);
        });
        updateVatWithSelectedShipping();
      }
    });
  };

  var mountShippingSelector = function () {
    var form = document.getElementById('psa-guest-checkout-form');
    var pinInput = document.getElementById('gc-pincode');
    if (!form || !pinInput || document.getElementById('psa-shipping-rates-box')) return;

    var wrap = document.createElement('div');
    wrap.id = 'psa-shipping-rates-box';
    wrap.className = 'mb-2';
    wrap.style.cssText = 'background:#f0fdfa;border:1px solid #99f6e4;border-radius:6px;padding:8px 10px;font-size:12px;';
    wrap.innerHTML =
      '<div class="d-flex justify-content-between align-items-center">' +
      '<span style="color:#132a2e;">Enter City &amp; Postal Code for courier rates</span>' +
      '<button type="button" id="psa-calc-ship-btn" class="btn btn-xs btn-outline-primary font-weight-bold">Get Rates</button></div>';

    var notesField = document.getElementById('gc-notes');
    if (notesField && notesField.parentNode) {
      form.insertBefore(wrap, notesField.parentNode);
    }

    document.getElementById('psa-calc-ship-btn').addEventListener('click', fetchLiveRates);
    ['gc-city', 'gc-state', 'gc-pincode'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', fetchLiveRates);
    });
  };

  // Include selected shipping_rate & shipping_service in checkout submission
  $(document).ajaxSend(function (event, jqxhr, settings) {
    if (settings.url && settings.url.indexOf('submit_guest_checkout') !== -1 && typeof settings.data === 'string') {
      var selShip = document.querySelector('input[name="gc-shipping-option"]:checked');
      if (selShip) {
        var extra =
          '&shipping_rate=' + encodeURIComponent(selShip.getAttribute('data-rate') || '0') +
          '&shipping_service=' + encodeURIComponent(selShip.getAttribute('data-service') || '');
        settings.data += extra;
      }
    }
  });

  setTimeout(mountShippingSelector, 500);
  setTimeout(mountShippingSelector, 1200);
});

frappe.ready(function () {
  if (window.location.pathname.replace(/\/+$/, '') !== '/cart') return;

  window._psaCodVerified = null;

  var openCodSecurityModal = function (onVerified) {
    frappe.call({
      method: 'promo_theme.api.get_cod_challenge',
      callback: function (r) {
        var data = r.message || {};
        if (!data.token || !data.question) return;

        var old = document.getElementById('psa-cod-captcha-modal');
        if (old) old.remove();

        var overlay = document.createElement('div');
        overlay.id = 'psa-cod-captcha-modal';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(19,42,46,0.62);z-index:10060;display:flex;align-items:center;justify-content:center;padding:16px;';
        overlay.innerHTML =
          '<div style="background:#ffffff;max-width:380px;width:100%;border-radius:12px;box-shadow:0 20px 45px rgba(0,0,0,0.25);overflow:hidden;border:1.5px solid #0f766e;">' +
          '<div style="background:#132a2e;color:#ffffff;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;">' +
          '<strong style="font-size:14.5px;">Confirm Cash on Delivery Order</strong>' +
          '<button type="button" id="psa-cap-x" style="background:none;border:none;color:#ffffff;font-size:20px;line-height:1;cursor:pointer;">&times;</button></div>' +
          '<div style="padding:18px;font-size:13.5px;color:#132a2e;">' +
          '<p class="mb-2">Please complete this quick security check to confirm your Cash on Delivery order:</p>' +
          '<div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;padding:12px;text-align:center;margin-bottom:12px;">' +
          '<div style="font-size:17px;font-weight:800;color:#0f766e;margin-bottom:8px;">' + frappe.utils.escape_html(data.question) + '</div>' +
          '<input type="number" id="psa-cap-input" class="form-control text-center font-weight-bold" placeholder="Enter answer" style="max-width:160px;margin:0 auto;font-size:16px;" autocomplete="off">' +
          '</div>' +
          '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
          '<button type="button" id="psa-cap-cancel" class="btn btn-outline-secondary btn-sm">Cancel</button>' +
          '<button type="button" id="psa-cap-confirm" class="btn btn-primary btn-sm font-weight-bold">Verify &amp; Place COD Order</button>' +
          '</div></div></div>';

        document.body.appendChild(overlay);
        var inp = document.getElementById('psa-cap-input');
        if (inp) inp.focus();

        var close = function () { overlay.remove(); };
        document.getElementById('psa-cap-x').addEventListener('click', close);
        document.getElementById('psa-cap-cancel').addEventListener('click', close);

        var submitCheck = function () {
          var val = (inp && inp.value || '').trim();
          if (!val) {
            if (inp) inp.focus();
            return;
          }
          window._psaCodVerified = { token: data.token, answer: val };
          close();
          onVerified();
        };

        document.getElementById('psa-cap-confirm').addEventListener('click', submitCheck);
        if (inp) {
          inp.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter') {
              ev.preventDefault();
              submitCheck();
            }
          });
        }
      }
    });
  };

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || form.id !== 'psa-guest-checkout-form') return;

    var sel = document.querySelector('input[name="gc-payment-method"]:checked');
    var isCod = sel && sel.value === 'cod';
    if (!isCod) return;

    if (!window._psaCodVerified) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      openCodSecurityModal(function () {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
    }
  }, true);

  $(document).ajaxSend(function (event, jqxhr, settings) {
    if (settings.url && settings.url.indexOf('submit_guest_checkout') !== -1 && typeof settings.data === 'string') {
      if (window._psaCodVerified) {
        settings.data +=
          '&challenge_token=' + encodeURIComponent(window._psaCodVerified.token) +
          '&challenge_answer=' + encodeURIComponent(window._psaCodVerified.answer);
        window._psaCodVerified = null;
      }
    }
  });
});

window.psa_delegated_ship_listener = true;
document.addEventListener('change', function (e) {
  if (!e.target || e.target.name !== 'gc-shipping-option') return;
  var sel = e.target;
  var shipFee = parseFloat(sel.getAttribute('data-rate') || '0') || 0;
  var sum = document.getElementById('psa-vat-summary');
  if (!sum) return;

  var exVat = parseFloat(sum.getAttribute('data-ex-vat') || '0') || 0;
  if (!exVat || isNaN(exVat)) {
    var totalEl = document.querySelector('.cart-tax-items td.text-right, .cart-tax-items .text-right, .cart-tax-items tr:last-child td:last-child');
    if (totalEl) {
      exVat = parseFloat(totalEl.textContent.replace(/[^0-9.]/g, '')) || 0;
    }
  }
  if (!exVat || isNaN(exVat)) return;
  sum.setAttribute('data-ex-vat', String(exVat));

  var taxableSub = exVat + shipFee;
  var vat = taxableSub * 0.15;
  var fmt = function (n) {
    return 'R ' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  sum.innerHTML =
    '<div class="d-flex justify-content-between"><span>Items Subtotal (ex VAT):</span><b>' + fmt(exVat) + '</b></div>' +
    '<div class="d-flex justify-content-between"><span>Courier Delivery (ex VAT):</span><b>' + (shipFee > 0 ? fmt(shipFee) : 'FREE') + '</b></div>' +
    '<div class="d-flex justify-content-between"><span>VAT (15%):</span><b>' + fmt(vat) + '</b></div>' +
    '<div class="d-flex justify-content-between mt-1 pt-1" style="border-top:1px solid #99f6e4;color:#0f766e;font-size:13.5px;">' +
    '<span><b>Final Total (incl. VAT):</b></span><b>' + fmt(taxableSub + vat) + '</b></div>';
});
