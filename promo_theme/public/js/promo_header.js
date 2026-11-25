frappe.ready(() => {
  const buildPromoHeader = () => {
    // 1. Remove the first banner ("99.9% on-time delivery" / "sales@a1its.net")
    document.querySelectorAll('div, section, header').forEach((el) => {
      if (el.id === 'promo-top-announcement' || el.closest('#promo-top-announcement')) return;
      if (el.children.length <= 4 && el.textContent.includes('99.9% on-time delivery')) {
        el.remove();
      }
    });

    const navbar = document.querySelector('nav.navbar, header.navbar, .navbar, header');

    // 2. Render our single #promo-top-announcement bar ("Fast turnaround & free digital artwork | Quote List")
    if (!document.querySelector('#promo-top-announcement')) {
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
    }

    // 3. Render "Shop by Category" Navigation Bar once
    if (document.querySelector('#promo-category-nav') || window._promoNavFetching) return;
    window._promoNavFetching = true;

    frappe.call({
      method: 'promo_theme.api.get_nav_categories',
      callback: (r) => {
        window._promoNavFetching = false;
        if (document.querySelector('#promo-category-nav')) return;

        const cats = r.message || [];
        const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';

        const dropdownItemsHtml = cats.length
          ? cats
              .map((c) => {
                const subHtml = (c.children || [])
                  .map(
                    (sub) =>
                      `<a href="${sub.route}" class="promo-subcat-item">${frappe.utils.escape_html(sub.label)}</a>`
                  )
                  .join('');
                return `
                  <div class="promo-dd-group">
                    <a href="${c.route}" class="promo-dd-parent">${frappe.utils.escape_html(c.label)}</a>
                    ${subHtml ? `<div class="promo-dd-children">${subHtml}</div>` : ''}
                  </div>
                `;
              })
              .join('')
          : '<a href="/all-products" class="promo-dd-parent">All Products</a>';

        const topLinksHtml = [
          `<a href="/all-products" class="promo-cat-link ${currentPath === '/all-products' ? 'active' : ''}">All Products</a>`,
          ...cats.slice(0, 8).map((c) => {
            const isActive = currentPath === c.route.replace(/\/+$/, '') ? 'active' : '';
            return `<a href="${c.route}" class="promo-cat-link ${isActive}">${frappe.utils.escape_html(c.label)}</a>`;
          }),
        ].join('');

        const catBar = document.createElement('div');
        catBar.id = 'promo-category-nav';
        catBar.innerHTML = `
          <div class="container">
            <div class="promo-nav-inner">
              <div class="promo-shop-cat-wrap">
                <button type="button" id="promo-shop-cat-btn" class="promo-shop-cat-btn">
                  <span>&#9776; Shop by Category</span>
                  <span style="font-size:10px;margin-left:6px;">&#9662;</span>
                </button>
                <div id="promo-shop-cat-menu" class="promo-shop-cat-menu">
                  ${dropdownItemsHtml}
                </div>
              </div>
              <div class="promo-cat-scroll">${topLinksHtml}</div>
            </div>
          </div>
        `;

        if (navbar) {
          navbar.insertAdjacentElement('afterend', catBar);
        } else {
          document.querySelector('#promo-top-announcement')?.insertAdjacentElement('afterend', catBar);
        }

        const btn = catBar.querySelector('#promo-shop-cat-btn');
        const menu = catBar.querySelector('#promo-shop-cat-menu');
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          menu.classList.toggle('open');
        });
        document.addEventListener('click', (e) => {
          if (!catBar.contains(e.target)) {
            menu.classList.remove('open');
          }
        });
      },
      error: () => {
        window._promoNavFetching = false;
      },
    });
  };

  buildPromoHeader();
});

frappe.ready(() => {
  const brandEl = document.querySelector('.navbar .navbar-brand');
  if (!brandEl || brandEl.dataset.printstoreLogo) return;
  brandEl.dataset.printstoreLogo = '1';

  // If you uploaded a Brand Image in Website Settings, keep it and style its height
  const existingImg = brandEl.querySelector('img');
  if (existingImg) {
    existingImg.style.maxHeight = '38px';
    existingImg.style.width = 'auto';
    return;
  }

  // Otherwise fall back to the PrintStoreAmaze vector logo
  brandEl.innerHTML = `
    <span class="psa-logo-wrap">
      <svg width="30" height="30" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect width="36" height="36" rx="8" fill="#0f766e"/>
        <path d="M10 13h16v4H10v-4zm3-5h10v4H13V8zm-3 11h16v6h-4v3H14v-3h-4v-6z" fill="#ffffff"/>
        <circle cx="23" cy="21.5" r="1.2" fill="#5eead4"/>
      </svg>
      <span class="psa-logo-text">
        <span><span class="psa-word-main">PrintStore</span><span class="psa-word-accent">Amaze</span></span>
        <span class="psa-word-tag">Corporate Branding &amp; Gifts</span>
      </span>
    </span>
  `;
});

frappe.ready(() => {
  frappe.call({
    method: 'promo_theme.api.get_store_contact',
    callback: (r) => {
      const info = r.message;
      if (!info) return;

      // Update all tel: links and displayed phone numbers in header & footer
      document.querySelectorAll('a[href^="tel:"]').forEach((a) => {
        a.href = info.tel_href;
        a.textContent = info.phone;
      });

      // Update all mailto: links
      document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
        a.href = 'mailto:' + info.email;
        a.textContent = info.email;
      });

      // Update WhatsApp links in floating button & live chat widget
      document.querySelectorAll('a[href*="://whatsapp.com"]').forEach((a) => {
        try {
          const url = new URL(a.href);
          url.searchParams.set('phone', info.wa_number);
          a.href = url.toString();
        } catch (e) {}
      });
    },
  });
});

frappe.ready(() => {
  frappe.call({
    method: 'promo_theme.api.get_store_contact',
    callback: (r) => {
      const info = r.message;
      if (!info) return;

      const announceEl = document.querySelector('#promo-top-announcement .promo-announce-text');
      if (announceEl && info.announcement_html) {
        announceEl.innerHTML = info.announcement_html;
      }

      document.querySelectorAll('a[href^="tel:"]').forEach((a) => {
        a.href = info.tel_href;
        a.textContent = info.phone;
      });

      document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
        a.href = 'mailto:' + info.email;
        a.textContent = info.email;
      });

      document.querySelectorAll('a[href*="://whatsapp.com"]').forEach((a) => {
        try {
          const url = new URL(a.href);
          url.searchParams.set('phone', info.wa_number);
          a.href = url.toString();
        } catch (e) {}
      });
    },
  });
});

frappe.ready(() => {
  const addUploadArtworkBtn = () => {
    const navInner = document.querySelector('#promo-category-nav .promo-nav-inner');
    if (!navInner || navInner.querySelector('#psa-nav-artwork-btn')) return;

    const btn = document.createElement('a');
    btn.id = 'psa-nav-artwork-btn';
    btn.href = '/contact';
    btn.className = 'psa-nav-artwork-btn';
    btn.innerHTML = '&#128228; Upload Artwork';
    navInner.appendChild(btn);
  };

  addUploadArtworkBtn();
  setTimeout(addUploadArtworkBtn, 400);
  setTimeout(addUploadArtworkBtn, 1000);
});

frappe.ready(() => {
  const syncTopBanner = () => {
    frappe.call({
      method: 'promo_theme.api.get_store_contact',
      callback: (r) => {
        const info = r.message;
        if (!info) return;
        const announceEl = document.querySelector('#promo-top-announcement .promo-announce-text');
        if (announceEl && info.announcement_html) {
          announceEl.innerHTML = info.announcement_html;
        }
      },
    });
  };
  syncTopBanner();
  setTimeout(syncTopBanner, 600);
});

frappe.ready(() => {
  if (window.location.pathname.replace(/\/+$/, '') !== '/cart') return;

  frappe.call({
    method: 'promo_theme.api.get_store_contact',
    callback: (r) => {
      const checkoutOn = Boolean(r.message && r.message.enable_checkout);
      const applyCartLabel = () => {
        document.querySelectorAll('.cart-container .btn-place-order').forEach((btn) => {
          btn.textContent = checkoutOn ? 'Proceed to Checkout' : 'Submit Quote Request';
        });
        document.querySelectorAll('.cart-container a[href*="login"], .cart-container .btn-login').forEach((btn) => {
          btn.textContent = checkoutOn ? 'Login / Sign Up to Checkout' : 'Login / Sign Up to Request Quote';
        });
      };

      applyCartLabel();
      setTimeout(applyCartLabel, 400);
      setTimeout(applyCartLabel, 1000);
    },
  });
});

frappe.ready(() => {
  if (window.location.pathname.startsWith('/helpdesk') || window.location.pathname.startsWith('/raven')) {
    document.querySelectorAll('#promo-top-announcement, #promo-main-header, #promo-category-nav, .promo-footer').forEach((el) => {
      el.style.display = 'none';
    });
    return;
  }

  const addSupportLink = () => {
    const navInner = document.querySelector('#promo-category-nav .promo-nav-inner');
    if (!navInner || navInner.querySelector('#psa-nav-support-btn')) return;

    const artworkBtn = navInner.querySelector('#psa-nav-artwork-btn');
    const supportLink = document.createElement('a');
    supportLink.id = 'psa-nav-support-btn';
    supportLink.href = '/helpdesk';
    supportLink.className = 'psa-nav-support-btn';
    supportLink.innerHTML = '&#127911; Support / My Tickets';

    if (artworkBtn) {
      artworkBtn.style.marginLeft = '8px';
      navInner.insertBefore(supportLink, artworkBtn);
    } else {
      navInner.appendChild(supportLink);
    }
  };

  addSupportLink();
  setTimeout(addSupportLink, 400);
  setTimeout(addSupportLink, 1000);
});

frappe.ready(function () {
  if (window.location.pathname.startsWith('/helpdesk') || window.location.pathname.startsWith('/raven')) return;

  frappe.call({
    method: 'promo_theme.api.get_store_contact',
    callback: function (r) {
      var info = r.message || {};
      if (!info.logo_url) return;

      var applyLogo = function () {
        var logoLink = document.querySelector('nav.navbar .navbar-brand, header.navbar .navbar-brand, .navbar .navbar-brand');
        if (logoLink && !logoLink.querySelector('img.psa-dynamic-logo')) {
          logoLink.innerHTML =
            '<img class="psa-dynamic-logo" src="' +
            encodeURI(info.logo_url) +
            '" alt="' +
            frappe.utils.escape_html(info.brand_name || 'Logo') +
            '" style="max-height:44px;width:auto;object-fit:contain;display:block;">';
        }

        var footerLogo = document.querySelector('.promo-footer .promo-footer-logo, .promo-footer .footer-brand');
        if (footerLogo && !footerLogo.querySelector('img.psa-dynamic-logo')) {
          footerLogo.innerHTML =
            '<img class="psa-dynamic-logo" src="' +
            encodeURI(info.logo_url) +
            '" alt="' +
            frappe.utils.escape_html(info.brand_name || 'Logo') +
            '" style="max-height:40px;width:auto;object-fit:contain;display:block;">';
        }
      };

      applyLogo();
      setTimeout(applyLogo, 400);
      setTimeout(applyLogo, 1000);
    }
  });
});

frappe.ready(function () {
  if (window.location.pathname.startsWith('/helpdesk') || window.location.pathname.startsWith('/raven')) return;
  document.querySelectorAll('nav.navbar .navbar-brand, header.navbar .navbar-brand, .navbar .navbar-brand').forEach(function (a) {
    a.setAttribute('href', '/');
  });
});

frappe.ready(function () {
  var path = window.location.pathname || '';
  if (
    path.startsWith('/app') ||
    path.startsWith('/desk') ||
    path.startsWith('/helpdesk') ||
    path.startsWith('/raven') ||
    path.startsWith('/login')
  ) {
    return;
  }
  frappe.call({
    method: 'promo_theme.api.get_promo_banner',
    callback: function (r) {
      var data = r && r.message;
      if (!data || !data.enabled || document.getElementById('psa-floating-promo-bar')) return;

      var bar = document.createElement('div');
      bar.id = 'psa-floating-promo-bar';
      bar.style.cssText = [
        'position:fixed',
        'top:0',
        'left:0',
        'right:0',
        'z-index:1060',
        'width:100%',
        'background:linear-gradient(90deg, #132a2e 0%, #0f766e 50%, #132a2e 100%)',
        'color:#ffffff',
        'padding:9px 16px',
        'font-size:13px',
        'line-height:1.35',
        'box-shadow:0 4px 14px rgba(0,0,0,0.22)',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'flex-wrap:wrap',
        'gap:10px',
        'text-align:center'
      ].join(';');

      var badge = '<span style="background:#f59e0b;color:#132a2e;font-weight:800;font-size:10.5px;letter-spacing:0.6px;padding:2px 8px;border-radius:999px;text-transform:uppercase;">PROMO</span>';
      var textHtml = '<span style="font-weight:600;">' + frappe.utils.escape_html(data.text || '') + '</span>';
      var btnHtml = data.btn_text
        ? '<a href="' + frappe.utils.escape_html(data.btn_link || '/all-products') + '" style="background:#ffffff;color:#0f766e;font-weight:700;font-size:12px;padding:3px 12px;border-radius:999px;text-decoration:none;white-space:nowrap;">' +
          frappe.utils.escape_html(data.btn_text) + '</a>'
        : '';

      bar.innerHTML = badge + textHtml + btnHtml;
      document.body.insertBefore(bar, document.body.firstChild);

      var adjustTopOffset = function () {
        var h = bar.offsetHeight || 38;
        document.body.style.paddingTop = h + 'px';
        var nav = document.querySelector('nav.navbar.sticky-top, nav.navbar.fixed-top, header.sticky-top');
        if (nav) nav.style.top = h + 'px';
      };
      adjustTopOffset();
      window.addEventListener('resize', adjustTopOffset);
    }
  });
});

frappe.ready(function () {
  var path = window.location.pathname || '';
  if (path.startsWith('/app') || path.startsWith('/desk') || path.startsWith('/helpdesk') || path.startsWith('/raven')) {
    return;
  }

  frappe.call({
    method: 'promo_theme.api.get_google_marketing_config',
    callback: function (r) {
      var cfg = r && r.message;
      if (!cfg) return;

      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

      if (cfg.gtm_id && !document.getElementById('psa-gtm-script')) {
        window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
        var gtm = document.createElement('script');
        gtm.id = 'psa-gtm-script';
        gtm.async = true;
        gtm.src = 'https://googletagmanager.com' + encodeURIComponent(cfg.gtm_id);
        document.head.appendChild(gtm);
      }

      if (cfg.ga4_id && !document.getElementById('psa-ga4-script')) {
        var ga = document.createElement('script');
        ga.id = 'psa-ga4-script';
        ga.async = true;
        ga.src = 'https://googletagmanager.com' + encodeURIComponent(cfg.ga4_id);
        document.head.appendChild(ga);

        window.gtag('js', new Date());
        window.gtag('config', cfg.ga4_id, { currency: 'ZAR' });
      }

      if (cfg.ads_conversion_id) {
        var adsBase = cfg.ads_conversion_id.split('/')[0];
        if (adsBase) {
          window.gtag('config', adsBase);
        }
      }

      if (cfg.meta_pixel_id && !window.fbq) {
        !(function (f, b, e, v, n, t, s) {
          if (f.fbq) return;
          n = f.fbq = function () {
            n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
          };
          if (!f._fbq) f._fbq = n;
          n.push = n;
          n.loaded = !0;
          n.version = '2.0';
          n.queue = [];
          t = b.createElement(e);
          t.async = !0;
          t.src = v;
          s = b.getElementsByTagName(e);
          s.parentNode.insertBefore(t, s);
        })(window, document, 'script', 'https://facebook.net');
        window.fbq('init', cfg.meta_pixel_id);
        window.fbq('track', 'PageView');
      }

      if (path.replace(/\/+$/, '') === '/cart') {
        if (window.fbq && cfg.meta_pixel_id) {
          window.fbq('track', 'InitiateCheckout', { currency: 'ZAR' });
        }
        window.gtag('event', 'begin_checkout', { currency: 'ZAR' });
      }

      $(document).ajaxSuccess(function (event, xhr, settings) {
        if (!settings || !settings.url || settings.url.indexOf('submit_guest_checkout') === -1) return;
        try {
          var resp = xhr.responseJSON || JSON.parse(xhr.responseText || '{}');
          var msg = resp && resp.message;
          if (msg && msg.sales_order) {
            var val = parseFloat(msg.grand_total || 0) || 0;
            if (window.fbq && cfg.meta_pixel_id) {
              window.fbq('track', 'Purchase', {
                value: val,
                currency: 'ZAR',
                content_type: 'product'
              });
            }
            window.gtag('event', 'purchase', {
              transaction_id: msg.sales_order,
              value: val,
              currency: 'ZAR'
            });
            if (cfg.ads_conversion_id) {
              window.gtag('event', 'conversion', {
                send_to: cfg.ads_conversion_id,
                value: val,
                currency: 'ZAR',
                transaction_id: msg.sales_order
              });
            }
          }
        } catch (e) {}
      });
    }
  });
});
