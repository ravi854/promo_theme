frappe.ready(() => {
  let isRunning = false;

  const enhancePromoCards = () => {
    if (isRunning) return;
    isRunning = true;

    try {
      const visibleCards = Array.from(document.querySelectorAll('.item-card')).filter(
        (c) => c.offsetParent !== null
      );
      if (!visibleCards.length) return;

      // 1. Force 4 columns per row on desktop
      if (window.innerWidth >= 992) {
        visibleCards.forEach((c) => {
          if (c.style.maxWidth !== 'calc(25% - 1px)') {
            c.style.setProperty('flex', '0 0 calc(25% - 1px)', 'important');
            c.style.setProperty('max-width', 'calc(25% - 1px)', 'important');
            c.style.setProperty('width', 'calc(25% - 1px)', 'important');
            c.style.setProperty('min-width', '0', 'important');
            c.style.setProperty('padding-left', '6px', 'important');
            c.style.setProperty('padding-right', '6px', 'important');
            c.style.setProperty('box-sizing', 'border-box', 'important');
          }

          const innerCard = c.querySelector('.card');
          if (innerCard && innerCard.style.width !== '100%') {
            innerCard.style.setProperty('min-width', '0', 'important');
            innerCard.style.setProperty('width', '100%', 'important');
          }
        });
      }

      const routesToFetch = [];

      visibleCards.forEach((card) => {
        // 2. Hide Frappe's native duplicate "Out of stock" / "In stock" text inside card body
        card.querySelectorAll('div, span, p, small').forEach((el) => {
          if (el.closest('.promo-badge-bar')) return;
          const txt = el.textContent.trim().toLowerCase();
          if (txt === 'out of stock' || txt === 'in stock') {
            el.style.setProperty('display', 'none', 'important');
          }
        });

        // 3. Compact title & price typography
        card.querySelectorAll('.product-title, .product-title a, .card-title, .card-title a').forEach((el) => {
          el.style.setProperty('font-size', '12px', 'important');
          el.style.setProperty('line-height', '1.3', 'important');
        });

        // 4. Append "ex VAT" once
        const priceEl = card.querySelector('.product-price');
        if (priceEl) {
          priceEl.style.setProperty('font-size', '13px', 'important');
          if (!priceEl.querySelector('.promo-vat-tag') && priceEl.textContent.trim()) {
            const vatSpan = document.createElement('span');
            vatSpan.className = 'promo-vat-tag';
            vatSpan.textContent = ' ex VAT';
            priceEl.appendChild(vatSpan);
          }
        }

        if (card.dataset.promoFetched) return;

        const linkEl = card.querySelector('a[href]');
        if (!linkEl) return;

        const rawPath = decodeURIComponent(new URL(linkEl.href, window.location.origin).pathname);
        const route = '/' + rawPath.replace(/^\/+|\/+$/g, '');

        card.dataset.promoRoute = route;
        card.dataset.promoFetched = '1';
        routesToFetch.push(route);
      });

      if (!routesToFetch.length) return;

      frappe.call({
        method: 'promo_theme.api.get_promo_card_meta',
        args: { routes: routesToFetch },
        callback: (r) => {
          const map = r.message || {};
          Array.from(document.querySelectorAll('.item-card'))
            .filter((c) => c.offsetParent !== null)
            .forEach((card) => {
              const info = map[card.dataset.promoRoute];
              if (!info) return;

              const cardInner = card.querySelector('.card') || card;

              // Top Badges
              if (!cardInner.querySelector('.promo-badge-bar')) {
                const bar = document.createElement('div');
                bar.className = 'promo-badge-bar';

                if (info.new_arrival) {
                  bar.innerHTML += '<span class="promo-badge promo-badge-new">New Arrival</span>';
                }
                if (info.in_stock) {
                  bar.innerHTML += '<span class="promo-badge promo-badge-stock">In Stock</span>';
                }
                if (info.is_brandable) {
                  bar.innerHTML += '<span class="promo-badge promo-badge-brandable">Brandable</span>';
                }

                if (bar.innerHTML) {
                  cardInner.style.position = 'relative';
                  cardInner.prepend(bar);
                }
              }

              // SKU Line
              const titleEl = card.querySelector('.product-title, .card-title, h6');
              if (titleEl && info.item_code && !card.querySelector('.promo-sku-line')) {
                const skuDiv = document.createElement('div');
                skuDiv.className = 'promo-sku-line';
                skuDiv.textContent = 'SKU: ' + info.item_code;
                titleEl.insertAdjacentElement('afterend', skuDiv);
              }

              // Variant Pill & "From" Price Prefix
              if (info.has_variants) {
                const pEl = card.querySelector('.product-price');
                if (pEl && !pEl.querySelector('.promo-from-tag')) {
                  const fromSpan = document.createElement('span');
                  fromSpan.className = 'promo-from-tag';
                  fromSpan.textContent = 'From ';
                  pEl.prepend(fromSpan);
                }
                const imgWrap = card.querySelector('.card-img-container, .product-image-container, a');
                if (imgWrap && info.variant_count > 1 && !imgWrap.querySelector('.promo-variant-pill')) {
                  imgWrap.style.position = 'relative';
                  const pill = document.createElement('span');
                  pill.className = 'promo-variant-pill';
                  pill.textContent = '+ ' + info.variant_count;
                  imgWrap.appendChild(pill);
                }
              }
            });
        },
      });
    } finally {
      isRunning = false;
    }
  };

  const enhanceProductDetailPage = () => {
    const detailContainer = document.querySelector('.product-details, .item-details');
    if (!detailContainer) return;

    const detailPrice = detailContainer.querySelector('.product-price, .item-price');
    if (detailPrice && !detailPrice.querySelector('.promo-vat-tag') && detailPrice.textContent.trim()) {
      const vatSpan = document.createElement('span');
      vatSpan.className = 'promo-vat-tag';
      vatSpan.textContent = ' ex VAT';
      detailPrice.appendChild(vatSpan);
    }

    if (detailContainer.dataset.promoDetailLoaded) return;
    detailContainer.dataset.promoDetailLoaded = '1';

    const rawPath = decodeURIComponent(window.location.pathname);
    const route = '/' + rawPath.replace(/^\/+|\/+$/g, '');

    frappe.call({
      method: 'promo_theme.api.get_promo_card_meta',
      args: { routes: [route] },
      callback: (r) => {
        const info = (r.message || {})[route];
        if (!info) return;

        const titleEl = detailContainer.querySelector('.product-title, h1, h2');
        if (!titleEl) return;

        if (!detailContainer.querySelector('.promo-detail-badges')) {
          const bar = document.createElement('div');
          bar.className = 'promo-detail-badges mb-2';
          if (info.new_arrival) {
            bar.innerHTML += '<span class="promo-badge promo-badge-new">New Arrival</span>';
          }
          if (info.in_stock) {
            bar.innerHTML += '<span class="promo-badge promo-badge-stock">In Stock</span>';
          }
          if (info.is_brandable) {
            bar.innerHTML += '<span class="promo-badge promo-badge-brandable">Brandable</span>';
          }
          if (bar.innerHTML) {
            titleEl.insertAdjacentElement('beforebegin', bar);
          }
        }

        if (info.item_code && !detailContainer.querySelector('.promo-detail-sku')) {
          const skuEl = document.createElement('div');
          skuEl.className = 'promo-sku-line promo-detail-sku mb-2';
          skuEl.textContent = 'SKU: ' + info.item_code;
          titleEl.insertAdjacentElement('afterend', skuEl);
        }

        if (info.is_brandable && !detailContainer.querySelector('.promo-branding-box')) {
          const box = document.createElement('div');
          box.className = 'promo-branding-box';
          box.innerHTML = '<strong>Custom Branding Available</strong><p class="mb-0">Includes free digital artwork layout before production. Add to your quote list or cart to specify branding details.</p>';
          const cartSection = detailContainer.querySelector('.item-cart, .cart-action, .product-price');
          if (cartSection) {
            cartSection.insertAdjacentElement('afterend', box);
          }
        }

            // 5. Render Quantity-Based Bulk Pricing Tiers table
    if (!detailContainer.querySelector('.promo-bulk-tiers')) {
      frappe.call({
        method: 'promo_theme.api.get_bulk_pricing_tiers',
        args: { route },
        callback: (res) => {
          const tiers = res.message || [];
          if (!tiers.length || detailContainer.querySelector('.promo-bulk-tiers')) return;

          const rowsHtml = tiers
            .map(
              (t) => `
              <tr class="promo-tier-row" data-min-qty="${t.min_qty}" title="Click to select ${t.min_qty} units">
                <td><strong>${t.qty_label}</strong> units</td>
                <td><strong>${t.unit_price}</strong> <span class="text-muted" style="font-size:10px;">ex VAT</span></td>
                <td><span class="promo-tier-badge">${t.discount_label}</span></td>
              </tr>`
            )
            .join('');

          const tableWrap = document.createElement('div');
          tableWrap.className = 'promo-bulk-tiers mt-3 mb-3';
          tableWrap.innerHTML = `
            <div class="promo-tiers-header">Bulk Quantity Pricing (Click row to apply qty)</div>
            <table class="table table-sm table-bordered mb-0">
              <thead>
                <tr>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Discount</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          `;

          const targetAnchor =
            detailContainer.querySelector('.promo-branding-box') ||
            detailContainer.querySelector('.product-price, .item-price');
          if (targetAnchor) {
            targetAnchor.insertAdjacentElement('afterend', tableWrap);
          }

          // Clicking a tier row automatically fills the Webshop quantity input
          tableWrap.querySelectorAll('.promo-tier-row').forEach((tr) => {
            tr.addEventListener('click', () => {
              const qtyInput = detailContainer.querySelector('input.cart-qty, input[type="number"]');
              if (qtyInput) {
                qtyInput.value = tr.dataset.minQty;
                qtyInput.dispatchEvent(new Event('change', { bubbles: true }));
              }
            });
          });
        },
      });
    }


      },
    });
  };

    const enhanceQuoteFlow = () => {
    // 1. Relabel "Add to Cart" buttons to "Add to Quote"
    document.querySelectorAll('.btn-add-to-cart, .btn-add-to-cart-list, button').forEach((btn) => {
      if (btn.dataset.quoteLabeled) return;
      const txt = btn.textContent.trim();
      if (txt === 'Add to Cart') {
        btn.innerHTML = btn.innerHTML.replace('Add to Cart', 'Add to Quote');
        btn.dataset.quoteLabeled = '1';
      } else if (txt === 'View in Cart') {
        btn.innerHTML = btn.innerHTML.replace('View in Cart', 'View Quote List');
        btn.dataset.quoteLabeled = '1';
      }
    });

    // 2. Relabel Navbar "Cart" link to "Quote List"
    document.querySelectorAll('.navbar a[href="/cart"], .shopping-cart a').forEach((link) => {
      if (!link.dataset.quoteNav && link.textContent.includes('Cart')) {
        link.innerHTML = link.innerHTML.replace('Cart', 'Quote List');
        link.dataset.quoteNav = '1';
      }
    });

    // 3. Add Branding & Artwork Notes field on the /cart (Quote List) page
    if (window.location.pathname === '/cart') {
      const pageTitle = document.querySelector('.cart-container h1, .cart-container h2, .cart-header');
      if (pageTitle && !pageTitle.dataset.quoteTitle) {
        pageTitle.textContent = 'Your Quote List';
        pageTitle.dataset.quoteTitle = '1';
      }

            // Allow Guest visitors to submit a Quote Request without logging in
      if (frappe.session.user === 'Guest') {
        const cartRight = document.querySelector('.cart-payment-addresses, .cart-tax-items, .cart-container .col-md-4');
        if (cartRight && !document.querySelector('#promo-guest-quote-box')) {
          // Hide default "Login to Proceed" button for guests
          cartRight.querySelectorAll('a[href*="/login"], .btn-login').forEach((el) => {
            el.style.setProperty('display', 'none', 'important');
          });

          const guestBox = document.createElement('div');
          guestBox.id = 'promo-guest-quote-box';
          guestBox.className = 'card p-3 mt-3';
          guestBox.innerHTML = `
            <h6 class="font-weight-bold mb-2" style="font-size: 14px;">Request Your Quote</h6>
            <p class="text-muted mb-2" style="font-size: 11.5px;">No account needed. Enter your details and our sales team will send your formal quote.</p>
            <div class="form-group mb-2">
              <input type="text" id="gq-name" class="form-control form-control-sm" placeholder="Full Name *" required>
            </div>
            <div class="form-group mb-2">
              <input type="email" id="gq-email" class="form-control form-control-sm" placeholder="Work Email *" required>
            </div>
            <div class="form-group mb-2">
              <input type="text" id="gq-phone" class="form-control form-control-sm" placeholder="Phone Number">
            </div>
            <div class="form-group mb-2">
              <input type="text" id="gq-company" class="form-control form-control-sm" placeholder="Company Name">
            </div>
            <div style="position:absolute;left:-9999px;opacity:0;height:0;overflow:hidden;" aria-hidden="true">
              <input type="text" id="gq-website-url" tabindex="-1" autocomplete="off">
            </div>
            <div class="form-group mb-2 d-flex align-items-center justify-content-between" style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:6px;padding:5px 8px;">
              <span style="font-size:11.5px;font-weight:700;color:#132a2e;">Check: <span id="gq-cap-q">...</span> =</span>
              <input type="hidden" id="gq-cap-tok">
              <input type="number" id="gq-cap-ans" class="form-control form-control-sm" style="width:68px;text-align:center;" placeholder="?">
            </div>
            <button type="button" id="gq-submit-btn" class="btn btn-primary btn-sm btn-block font-weight-bold">
              Submit Quote Request
            </button>
          `;
          cartRight.appendChild(guestBox);
          const loadGqCap = () => {
            frappe.call({
              method: 'promo_theme.api.get_quote_captcha',
              callback: (r) => {
                if (r && r.message) {
                  guestBox.querySelector('#gq-cap-q').textContent = r.message.question;
                  guestBox.querySelector('#gq-cap-tok').value = r.message.token;
                  guestBox.querySelector('#gq-cap-ans').value = '';
                }
              }
            });
          };
          loadGqCap();

          guestBox.querySelector('#gq-submit-btn').addEventListener('click', () => {
            const fullName = guestBox.querySelector('#gq-name').value.trim();
            const email = guestBox.querySelector('#gq-email').value.trim();
            const phone = guestBox.querySelector('#gq-phone').value.trim();
            const company = guestBox.querySelector('#gq-company').value.trim();
            const notes = (document.querySelector('#promo-branding-notes')?.value || '').trim();

            if (!fullName || !email) {
              frappe.msgprint('Please enter your Full Name and Email address.');
              return;
            }

            const btn = guestBox.querySelector('#gq-submit-btn');
            btn.disabled = true;
            btn.textContent = 'Submitting Quote...';

            frappe.call({
              method: 'promo_theme.api.submit_guest_quote',
              args: {
                full_name: fullName,
                email,
                phone,
                company,
                notes,
                website_url: (guestBox.querySelector('#gq-website-url')?.value || ''),
                challenge_token: (guestBox.querySelector('#gq-cap-tok')?.value || ''),
                challenge_answer: (guestBox.querySelector('#gq-cap-ans')?.value || '')
              },
              callback: (r) => {
                if (r.message && r.message.status === 'success') {
                  guestBox.innerHTML = `
                    <div class="alert alert-success mb-0" style="font-size: 12.5px;">
                      <strong>Quote Request Received!</strong><br>
                      Reference: <strong>${r.message.quotation_id}</strong><br>
                      We have sent your request to our sales team and will reply shortly.
                    </div>
                  `;
                } else {
                  btn.disabled = false;
                  btn.textContent = 'Submit Quote Request';
                }
              },
              error: () => {
                btn.disabled = false;
                btn.textContent = 'Submit Quote Request';
              },
            });
          });
        }
      }

            const cartRight = document.querySelector('.cart-payment-addresses, .cart-tax-items, .cart-container .col-md-4');
      if (cartRight && !document.querySelector('#promo-branding-notes-wrap')) {
        const wrap = document.createElement('div');
        wrap.id = 'promo-branding-notes-wrap';
        wrap.className = 'card p-3 mb-3';
        wrap.innerHTML = `
          <label class="font-weight-bold mb-1" style="font-size: 13px;">Branding & Deadline Notes (Optional)</label>
          <textarea id="promo-branding-notes" class="form-control" rows="3"
            placeholder="e.g. 1-colour screen print on front, needed by 15 December..."></textarea>
        `;
        cartRight.prepend(wrap);

        // Save notes onto the active draft Quotation whenever the customer types
        const textarea = wrap.querySelector('#promo-branding-notes');
        let noteTimer = null;
        textarea.addEventListener('input', () => {
          clearTimeout(noteTimer);
          noteTimer = setTimeout(() => {
            frappe.call({
              method: 'promo_theme.api.save_quote_branding_notes',
              args: { notes: textarea.value },
            });
          }, 500);
        });
      }


      const placeOrderBtn = document.querySelector('.btn-place-order, button[data-action="place-order"]');
      if (placeOrderBtn && !placeOrderBtn.dataset.quoteBtn) {
        placeOrderBtn.textContent = 'Submit Quote Request';
        placeOrderBtn.dataset.quoteBtn = '1';
      }
    }
  };




  const runAll = () => {
    enhancePromoCards();
    enhanceProductDetailPage();
  };

  runAll();

  let timer = null;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(runAll, 100);
  });
  setTimeout(runAll, 600);
  setTimeout(runAll, 1500);

  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(runAll, 120);
  });
  observer.observe(document.body, { childList: true, subtree: true });

      const renderPromoHeader = () => {
    const navbar = document.querySelector('nav.navbar, header.navbar, .navbar, header');
    if (document.querySelector('#promo-top-announcement')) return;

    // 1. Top Announcement Bar
    const topBar = document.createElement('div');
    topBar.id = 'promo-top-announcement';
    topBar.innerHTML = `
      <div class="container d-flex flex-wrap justify-content-between align-items-center">
        <div class="promo-announce-text">
          <strong>FREE delivery</strong> on orders over R1,500 ex VAT &nbsp;|&nbsp; Fast turnaround &amp; free digital artwork
        </div>
        <div class="promo-announce-contact d-none d-md-flex align-items-center">
          <a href="tel:0840277327">084 027 7327</a>
          <span class="mx-2">|</span>
          <a href="/cart">Quote List</a>
        </div>
      </div>
    `;

    if (navbar) {
      navbar.insertAdjacentElement('beforebegin', topBar);
    } else {
      document.body.prepend(topBar);
    }

    // 2. Horizontal Category Navigation Bar
    frappe.call({
      method: 'promo_theme.api.get_nav_categories',
      callback: (r) => {
        const cats = (r.message && r.message.length)
          ? r.message
          : [{ label: 'All Products', route: '/all-products' }];
        if (document.querySelector('#promo-category-nav')) return;

        const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
        const linksHtml = cats
          .map((c) => {
            const isActive = currentPath === c.route.replace(/\/+$/, '') ? 'active' : '';
            return `<a href="${c.route}" class="promo-cat-link ${isActive}">${frappe.utils.escape_html(c.label)}</a>`;
          })
          .join('');

        const catBar = document.createElement('div');
        catBar.id = 'promo-category-nav';
        catBar.innerHTML = `
          <div class="container">
            <div class="promo-cat-scroll">${linksHtml}</div>
          </div>
        `;

        if (navbar) {
          navbar.insertAdjacentElement('afterend', catBar);
        } else {
          topBar.insertAdjacentElement('afterend', catBar);
        }
      },
    });
  };


});

frappe.ready(function () {
  if (window.location.pathname.replace(/\/+$/, '') !== '/all-products') return;
  var params = new URLSearchParams(window.location.search);
  var raw = params.get('field_filters');
  if (!raw) return;
  try {
    var parsed = JSON.parse(raw);
    var vals = parsed.industry || [];
    if (!vals.length) return;
    var applyCheck = function () {
      vals.forEach(function (v) {
        var cb = document.querySelector('input.product-filter[data-filter-name="industry"][data-filter-value="' + CSS.escape(v) + '"]');
        if (cb && !cb.checked) {
          cb.checked = true;
          cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    };
    setTimeout(applyCheck, 300);
    setTimeout(applyCheck, 900);
  } catch (e) {}
});

frappe.ready(function () {
  if (window.location.pathname.replace(/\/+$/, '') !== '/all-products') return;
  var params = new URLSearchParams(window.location.search);
  var raw = params.get('field_filters');
  if (!raw) return;
  try {
    var parsed = JSON.parse(raw);
    var vals = parsed.industry || [];
    if (!vals.length) return;
    var applyCheck = function () {
      vals.forEach(function (v) {
        var cb = document.querySelector('input.product-filter[data-filter-name="industry"][data-filter-value="' + CSS.escape(v) + '"]');
        if (cb && !cb.checked) {
          cb.checked = true;
          cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    };
    setTimeout(applyCheck, 300);
    setTimeout(applyCheck, 900);
  } catch (e) {}
});

frappe.ready(function () {
  if (window.location.pathname.replace(/\/+$/, '') !== '/cart') return;

  var insertCartQuoteBtn = function () {
    if (document.getElementById('psa-cart-request-quote-btn')) return;

    var pastOrdersLink = Array.from(document.querySelectorAll('a, button')).find(function (el) {
      var t = (el.textContent || '').trim().toLowerCase();
      return t === 'past orders' || t === 'past order';
    });

    var continueBtn = Array.from(document.querySelectorAll('a, button')).find(function (el) {
      var t = (el.textContent || '').trim().toLowerCase();
      return t === 'continue shopping';
    });

    var anchor = continueBtn || pastOrdersLink;
    if (!anchor || !anchor.parentNode) return;

    var quoteBtn = document.createElement('a');
    quoteBtn.id = 'psa-cart-request-quote-btn';
    quoteBtn.href = '/request-for-quotation';
    quoteBtn.className = (continueBtn && continueBtn.className) || (pastOrdersLink && pastOrdersLink.className) || 'btn btn-sm btn-secondary';
    quoteBtn.style.cssText = 'margin:0 8px;';
    quoteBtn.textContent = 'Request Quote';

    if (continueBtn && continueBtn.parentNode) {
      continueBtn.parentNode.insertBefore(quoteBtn, continueBtn);
    } else if (pastOrdersLink && pastOrdersLink.parentNode) {
      pastOrdersLink.parentNode.insertBefore(quoteBtn, pastOrdersLink.nextSibling);
    }
  };

  insertCartQuoteBtn();
  setTimeout(insertCartQuoteBtn, 400);
  setTimeout(insertCartQuoteBtn, 1100);
});

frappe.ready(function () {
  var path = window.location.pathname.replace(/^\/+|\/+$/g, '');
  if (!path || path === 'all-products' || path === 'cart' || path === 'request-for-quotation' || path === 'promo_home') return;
  if (document.getElementById('psa-product-jsonld')) return;

  frappe.call({
    method: 'promo_theme.api.get_product_jsonld',
    args: { route: path },
    callback: function (r) {
      if (r && r.message && r.message['@type'] === 'Product') {
        var s = document.createElement('script');
        s.id = 'psa-product-jsonld';
        s.type = 'application/ld+json';
        s.textContent = JSON.stringify(r.message);
        document.head.appendChild(s);
      }
    }
  });
});

frappe.ready(function () {
  var defaultWa = 'https://wa.me';
  document.querySelectorAll('a').forEach(function (a) {
    var href = (a.getAttribute('href') || '').trim();
    var text = (a.textContent || '').trim().toLowerCase();
    if (text.indexOf('whatsapp') !== -1 || href.indexOf('wa.me') !== -1 || href.indexOf('whatsapp.com') !== -1) {
      if (!href || href === '#' || href.indexOf('wa.me/0') !== -1 || href.indexOf('wa.me/+') !== -1 || href.indexOf(' ') !== -1) {
        a.setAttribute('href', defaultWa);
      }
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
  });
});

frappe.ready(function () {
  var fixWaLinks = function () {
    document.querySelectorAll('a[href*="wa.me"]').forEach(function (a) {
      var h = a.getAttribute('href') || '';
      if (/^https?:\/\/wa\.me[0-9]/i.test(h)) {
        a.setAttribute('href', h.replace(/^(https?:\/\/wa\.me)([0-9])/i, '$1/$2'));
      }
    });
  };
  fixWaLinks();
  setTimeout(fixWaLinks, 500);
  setTimeout(fixWaLinks, 1500);
});
