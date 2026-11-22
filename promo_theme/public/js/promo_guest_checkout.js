frappe.ready(() => {
  if (window.location.pathname.replace(/\/+$/, '') !== '/cart') return;

  const renderGuestCheckout = (checkoutOn) => {
    if (frappe.session.user !== 'Guest') return;
    if (document.querySelector('#psa-guest-checkout-box')) return;

    const cartContainer = document.querySelector('.cart-container');
    if (!cartContainer) return;

    // Hide login buttons/prompts inside cart so guests can check out directly
    cartContainer.querySelectorAll('a[href*="login"], .btn-login, .btn-place-order').forEach((el) => {
      el.style.setProperty('display', 'none', 'important');
    });

    const targetCol =
      cartContainer.querySelector('.cart-payment-addresses, .cart-tax-items, .col-md-4, .col-lg-4') ||
      cartContainer;

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
    box.className = 'psa-guest-checkout-box mt-3';
    box.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-1">
        <h5 class="font-weight-bold mb-0" style="color: #132a2e; font-size: 15px;">
          ${checkoutOn ? 'Guest Express Checkout' : 'Request Your Quote'}
        </h5>
        <a href="/login?redirect-to=/cart" style="font-size: 11px; color: #0f766e; font-weight: 600;">Have an account? Login</a>
      </div>
      <p class="text-muted mb-2" style="font-size: 11.5px;">
        ${
          checkoutOn
            ? 'Complete your delivery details below to place your order immediately without creating an account.'
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
        <div class="form-group mb-2">
          <textarea id="gc-notes" rows="2" class="form-control form-control-sm" placeholder="Branding notes, logo colours, or delivery instructions..."></textarea>
        </div>
        <button type="submit" id="gc-submit-btn" class="btn btn-primary btn-block font-weight-bold py-2">
          ${checkoutOn ? 'Place Order & Pay Now' : 'Submit Quote Request'}
        </button>
      </form>
    `;

    targetCol.appendChild(box);

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
            submitBtn.textContent = checkoutOn ? 'Place Order & Pay Now' : 'Submit Quote Request';
            return;
          }

          if (res.mode === 'order' && res.redirect_url) {
            window.location.href = res.redirect_url;
          } else {
            box.innerHTML = `
              <div class="alert alert-success mb-0" style="font-size: 12.5px;">
                <strong>Quote Request Received!</strong><br>
                Reference: <strong>${frappe.utils.escape_html(res.quotation_id || '')}</strong><br>
                We have sent a confirmation to your email and will prepare your formal quote and free digital mockup shortly.
              </div>
            `;
          }
        },
        error: () => {
          submitBtn.disabled = false;
          submitBtn.textContent = checkoutOn ? 'Place Order & Pay Now' : 'Submit Quote Request';
        },
      });
    });
  };

  frappe.call({
    method: 'promo_theme.api.get_store_contact',
    callback: (r) => {
      const checkoutOn = Boolean(r.message && r.message.enable_checkout);
      renderGuestCheckout(checkoutOn);
      setTimeout(() => renderGuestCheckout(checkoutOn), 500);
      setTimeout(() => renderGuestCheckout(checkoutOn), 1200);
    },
  });
});
