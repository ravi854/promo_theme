frappe.ready(() => {
  // 1. Patch webshop.webshop.shopping_cart so Guests can add items & view cart without /login redirect
  const patchWebshopGuestCart = () => {
    if (frappe.session.user !== 'Guest') return;
    const sc = window.webshop && window.webshop.webshop && window.webshop.webshop.shopping_cart;
    if (!sc || sc._psaGuestPatched) return;

    sc._psaGuestPatched = true;

    sc.set_cart_count = function (animate = false) {
      $('.intermediate-empty-cart').remove();
      const count = parseInt(frappe.get_cookie('cart_count') || '0', 10);
      if (count > 0) {
        $('.shopping-cart').removeClass('hidden').css('display', 'inline-flex');
        const icon = $('.cart-icon');
        icon.css('display', 'inline');
        let badge = icon.find('#cart-count');
        if (!badge.length) {
          icon.append(`<span class="badge badge-primary cart-badge" id="cart-count">${count}</span>`);
        } else {
          badge.text(count);
        }
        if (animate) {
          icon.addClass('cart-animate');
          setTimeout(() => icon.removeClass('cart-animate'), 500);
        }
      }
    };

    sc.update_cart = function (opts) {
      if (sc.freeze) sc.freeze();
      return frappe.call({
        type: 'POST',
        method: 'webshop.webshop.shopping_cart.cart.update_cart',
        args: {
          item_code: opts.item_code,
          qty: opts.qty,
          additional_notes: opts.additional_notes !== undefined ? opts.additional_notes : undefined,
          with_items: opts.with_items || 0,
        },
        btn: opts.btn,
        callback: function (r) {
          if (sc.unfreeze) sc.unfreeze();
          sc.set_cart_count(true);
          if (opts.callback) opts.callback(r);
          if (!opts.with_items && r && !r.exc) {
            frappe.show_alert({
              message: __('Item added to cart. <a href="/cart" style="font-weight:bold;text-decoration:underline;">View Cart &amp; Checkout &rarr;</a>'),
              indicator: 'green',
            });
          }
        },
      });
    };

    $('.page_content').off('click', '.btn-add-to-cart-list');
    $('.page_content').on('click', '.btn-add-to-cart-list', function (e) {
      e.preventDefault();
      e.stopPropagation();
      const $btn = $(e.currentTarget);
      $btn.prop('disabled', true);
      $btn.addClass('hidden');
      $btn.closest('.cart-action-container').addClass('d-flex');
      $btn.parent().find('.go-to-cart').removeClass('hidden');
      $btn.parent().find('.go-to-cart-grid').removeClass('hidden');
      $btn.parent().find('.cart-indicator').removeClass('hidden');
      const itemCode = $btn.data('item-code');
      sc.update_cart({ item_code: itemCode, qty: 1 });
    });

    sc.set_cart_count(false);
  };

  patchWebshopGuestCart();
  setTimeout(patchWebshopGuestCart, 150);
  setTimeout(patchWebshopGuestCart, 500);
  setTimeout(patchWebshopGuestCart, 1200);

  // 2. Render Guest Express Checkout / Quote Panel on /cart
  if (window.location.pathname.replace(/\/+$/, '') !== '/cart') return;

  const renderGuestCheckout = (checkoutOn) => {
    if (frappe.session.user !== 'Guest') return;
    if (document.querySelector('#psa-guest-checkout-box')) return;

    const cartContainer =
      document.querySelector('.cart-container') ||
      document.querySelector('.page_content .container');
    if (!cartContainer) return;

    // Only render if cart has items (skip if empty cart state is shown)
    const hasCartRows = document.querySelectorAll('.cart-items tr, .cart-item-wrapper').length > 0;
    const isEmptyCart = !!document.querySelector('.cart-empty, .no-item-wrapper');
    if (isEmptyCart && !hasCartRows) return;

    // Make sure totals block stays visible for Guests when items exist
    document.querySelectorAll('.cart-tax-items').forEach((el) => {
      el.style.removeProperty('display');
      el.style.display = 'block';
    });

    // Hide login prompts inside cart
    cartContainer.querySelectorAll('a[href*="login"], .btn-login, .btn-place-order').forEach((el) => {
      el.style.setProperty('display', 'none', 'important');
    });

    // Find a visible right-side column or append directly after .cart-table / inside .cart-container
    let targetHost = cartContainer.querySelector('.col-md-4, .col-lg-4');
    if (!targetHost || targetHost.offsetParent === null) {
      targetHost = cartContainer;
    }

    const addressFieldsHtml = checkoutOn
      ? `
        <div class="form-group mb-2">
          <input type="text" id="gc-address1" class="form-control form-control-sm" placeholder="Delivery Street Address *" required />
        </div>
        <div class="row no-gutters mb-2" style="gap: 6px;">
          <div class="col">
            <input type="text" id="gc-city" class="form-control form-control-sm" placeholder="City / Suburb *" required />
          </div>
          <div class="col">
            <select id="gc-state" class="form-control form-control-sm">
              <option value="Gauteng">Gauteng</option>
              <option value="Western Cape">Western Cape</option>
              <option value="KwaZulu-Natal">KwaZulu-Natal</option>
              <option value="Eastern Cape">Eastern Cape</option>
              <option value="Free State">Free State</option>
              <option value="Limpopo">Limpopo</option>
              <option value="Mpumalanga">Mpumalanga</option>
              <option value="North West">North West</option>
              <option value="Northern Cape">Northern Cape</option>
            </select>
          </div>
          <div class="col-4">
            <input type="text" id="gc-pincode" class="form-control form-control-sm" placeholder="Postal Code" />
          </div>
        </div>
      `
      : '';

    const box = document.createElement('div');
    box.id = 'psa-guest-checkout-box';
    box.className = 'psa-guest-checkout-box mt-4';
    box.style.display = 'block';
    box.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-1">
        <h5 class="font-weight-bold mb-0" style="color: #132a2e; font-size: 16px;">
          ${checkoutOn ? 'Guest Express Checkout' : 'Request Your Quote'}
        </h5>
        <a href="/login?redirect-to=/cart" style="font-size: 11.5px; color: #0f766e; font-weight: 600;">Have an account? Login</a>
      </div>
      <p class="text-muted mb-3" style="font-size: 12px;">
        ${
          checkoutOn
            ? 'Complete your contact and delivery details below to place your order immediately without creating an account.'
            : 'Enter your contact details below to receive a formal quote and free digital artwork mockup.'
        }
      </p>

      <form id="psa-guest-checkout-form">
        <div class="form-group mb-2">
          <input type="text" id="gc-name" class="form-control form-control-sm" placeholder="Full Name *" required />
        </div>
        <div class="form-group mb-2">
          <input type="email" id="gc-email" class="form-control form-control-sm" placeholder="Email Address *" required />
        </div>
        <div class="row no-gutters mb-2" style="gap: 6px;">
          <div class="col">
            <input type="text" id="gc-phone" class="form-control form-control-sm" placeholder="Phone / WhatsApp *" required />
          </div>
          <div class="col">
            <input type="text" id="gc-company" class="form-control form-control-sm" placeholder="Company (Optional)" />
          </div>
        </div>
        ${addressFieldsHtml}
        <div class="form-group mb-3">
          <textarea id="gc-notes" rows="2" class="form-control form-control-sm" placeholder="Branding notes, logo colours, or delivery instructions..."></textarea>
        </div>
        <button type="submit" id="gc-submit-btn" class="btn btn-primary btn-block font-weight-bold py-2" style="font-size: 14px;">
          ${checkoutOn ? 'Place Order &amp; Pay Now' : 'Submit Quote Request'}
        </button>
      </form>
    `;

    targetHost.appendChild(box);

    const form = box.querySelector('#psa-guest-checkout-form');
    const submitBtn = box.querySelector('#gc-submit-btn');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.textContent = checkoutOn ? 'Processing Order...' : 'Submitting Quote...';

      frappe.call({
        method: 'promo_theme.api.submit_guest_checkout',
        args: {
          full_name: box.querySelector('#gc-name').value.trim(),
          email: box.querySelector('#gc-email').value.trim(),
          phone: box.querySelector('#gc-phone').value.trim(),
          company: box.querySelector('#gc-company').value.trim(),
          address_line1: box.querySelector('#gc-address1')?.value.trim() || '',
          city: box.querySelector('#gc-city')?.value.trim() || '',
          state: box.querySelector('#gc-state')?.value.trim() || '',
          pincode: box.querySelector('#gc-pincode')?.value.trim() || '',
          notes: box.querySelector('#gc-notes').value.trim(),
        },
        callback: (r) => {
          const res = r.message;
          if (!res || res.status !== 'success') {
            submitBtn.disabled = false;
            submitBtn.innerHTML = checkoutOn ? 'Place Order &amp; Pay Now' : 'Submit Quote Request';
            return;
          }

          if (res.mode === 'order' && res.redirect_url) {
            window.location.href = res.redirect_url;
          } else {
            box.innerHTML = `
              <div class="alert alert-success mb-0" style="font-size: 13px;">
                <strong>Quote Request Received!</strong><br>
                Reference: <strong>${frappe.utils.escape_html(res.quotation_id || '')}</strong><br>
                We have sent a confirmation to your email and will prepare your formal quote and free digital mockup shortly.
              </div>
`;
}
},
error: () => {
submitBtn.disabled = false;
submitBtn.innerHTML = checkoutOn ? 'Place Order & Pay Now' : 'Submit Quote Request';
},
});
});
};
frappe.call({
method: 'promo_theme.api.get_store_contact',
callback: (r) => {
const checkoutOn = Boolean(r.message && r.message.enable_checkout);
renderGuestCheckout(checkoutOn);
setTimeout(() => renderGuestCheckout(checkoutOn), 400);
setTimeout(() => renderGuestCheckout(checkoutOn), 1000);
setTimeout(() => renderGuestCheckout(checkoutOn), 2000);
},
});
});
