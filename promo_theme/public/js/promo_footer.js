frappe.ready(() => {
  const renderPromoFooter = () => {
    if (document.querySelector('#promo-custom-footer')) return;

    const existingFooter = document.querySelector('footer.web-footer, footer');
    const year = new Date().getFullYear();

    const footerEl = document.createElement('footer');
    footerEl.id = 'promo-custom-footer';
    footerEl.className = 'promo-footer';
    footerEl.innerHTML = `
      <div class="container py-5">
        <div class="row">
          <!-- Column 1: Brand & B2B Promise -->
          <div class="col-lg-4 col-md-6 mb-4 mb-lg-0">
            <h5 class="promo-footer-heading">PrintStoreAmaze – Corporate Gifts &amp; Branded Apparel</h5>
            <p class="promo-footer-text">
              Your trusted South African partner for custom branded promotional products, corporate clothing, headwear, and executive gifts. Every order includes a <strong>free digital artwork mockup</strong> before production.
            </p>
            <div class="promo-footer-badges mt-3">
              <span>Free Delivery Over R1,500 ex VAT</span>
              <span>Nationwide SA Delivery</span>
            </div>
          </div>

          <!-- Column 2: Quick Links -->
          <div class="col-lg-2 col-md-6 mb-4 mb-lg-0">
            <h6 class="promo-footer-heading">Quick Links</h6>
            <ul class="promo-footer-links">
              <li><a href="/">Home</a></li>
              <li><a href="/all-products">All Products</a></li>
              <li><a href="/shop-by-category">Shop by Category</a></li>
              <li><a href="/cart">Your Quote List</a></li>
              <li><a href="/contact">Contact Us</a></li>
            </ul>
          </div>

          <!-- Column 3: Branding Methods -->
          <div class="col-lg-3 col-md-6 mb-4 mb-md-0">
            <h6 class="promo-footer-heading">Branding Services</h6>
            <ul class="promo-footer-links">
              <li><a href="/all-products">Screen &amp; Pad Printing</a></li>
              <li><a href="/all-products">Custom Embroidery</a></li>
              <li><a href="/all-products">Laser Engraving</a></li>
              <li><a href="/all-products">Digital &amp; Sublimation Print</a></li>
              <li><a href="/all-products">Debossing &amp; Foiling</a></li>
            </ul>
          </div>

          <!-- Column 4: South Africa Branches & Contact -->
          <div class="col-lg-3 col-md-6">
            <h6 class="promo-footer-heading">South Africa Branches</h6>
            <p class="promo-footer-text mb-2">
              <strong>Gauteng (HQ):</strong> Roodepoort / Johannesburg &amp; Pretoria<br />
              <strong>Coastal:</strong> Cape Town &amp; Durban
            </p>
            <div class="promo-footer-contact">
              <div><strong>Tel:</strong> <a href="tel:0840277327">084 027 7327</a></div>
              <div><strong>Email:</strong> <a href="mailto:sales@a1its.net">sales@a1its.net</a></div>
              <div class="mt-2" style="font-size: 11.5px; color: #99f6e4;">
                Mon – Fri: 08:00 – 17:00 SAST
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Copyright Bar -->
      <div class="promo-footer-bottom">
        <div class="container d-flex flex-wrap justify-content-between align-items-center">
          <div>&copy; ${year} PrintStoreAmaze. All Rights Reserved. All prices exclude 15% VAT unless stated otherwise.</div>
          <div class="mt-2 mt-md-0">
            <a href="/terms">Terms &amp; Conditions</a>
            <span class="mx-2">|</span>
            <a href="/privacy">Privacy Policy</a>
          </div>
        </div>
      </div>
    `;

    if (existingFooter) {
      existingFooter.replaceWith(footerEl);
    } else {
      document.body.appendChild(footerEl);
    }
  };

  renderPromoFooter();
});
