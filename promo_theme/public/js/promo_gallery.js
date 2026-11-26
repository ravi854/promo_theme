frappe.ready(function () {
  var path = window.location.pathname.replace(/^\/+|\/+$/g, '');

  if (!document.getElementById('psa-multi-gallery-styles')) {
    var st = document.createElement('style');
    st.id = 'psa-multi-gallery-styles';
    st.textContent = `
      .psa-thumb-strip { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; justify-content: flex-start; }
      .psa-thumb-btn { width: 64px; height: 64px; padding: 3px; border: 2px solid #e2e8f0; border-radius: 8px; background: #ffffff; cursor: pointer; overflow: hidden; transition: border-color 0.16s ease, transform 0.16s ease; }
      .psa-thumb-btn:hover { border-color: #0f766e; transform: translateY(-2px); }
      .psa-thumb-btn.active { border-color: #0f766e; box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.2); }
      .psa-thumb-btn img { width: 100%; height: 100%; object-fit: contain; display: block; }
      img[data-psa-hover-src] { transition: opacity 0.22s ease, transform 0.28s ease; }
    `;
    document.head.appendChild(st);
  }

  // 1. Product Detail Page: Works both with and without a primary Website Image
  var nonDetailPaths = ['', 'home', 'promo_home', 'all-products', 'cart', 'request-for-quotation', 'login', 'me', 'orders', 'quotations', 'invoices'];
  if (nonDetailPaths.indexOf(path) === -1) {
    var attachDetailGallery = function () {
      if (document.getElementById('psa-detail-thumb-strip') || document.body.dataset.psaGalleryChecked === '1') return;
      var imageContainer = document.querySelector('.item-image, .product-image, .item-slideshow, .website-image-wrapper');
      var mainImg = document.querySelector('.item-image img, .product-image img, .website-image, .item-slideshow img');
      if (!imageContainer && !mainImg) return;

      document.body.dataset.psaGalleryChecked = '1';

      frappe.call({
        method: 'promo_theme.api.get_product_gallery',
        args: { route: path },
        callback: function (r) {
          var images = (r && r.message) || [];
          if (!images.length || document.getElementById('psa-detail-thumb-strip')) return;

          var host = imageContainer || (mainImg && (mainImg.closest('.item-image, .product-image, .col-md-5, .col-md-6') || mainImg.parentNode));
          if (!host) return;

          // If Website Item had no main image ("No Image" placeholder), create the main <img> from images[0]
          if (!mainImg) {
            host.innerHTML = '';
            mainImg = document.createElement('img');
            mainImg.className = 'website-image img-fluid';
            mainImg.style.cssText = 'max-height:420px;width:100%;object-fit:contain;border-radius:10px;background:#fff;';
            mainImg.src = images[0];
            host.appendChild(mainImg);
          } else if (!mainImg.getAttribute('src')) {
            mainImg.src = images[0];
          }

          if (images.length < 2) return;

          var strip = document.createElement('div');
          strip.id = 'psa-detail-thumb-strip';
          strip.className = 'psa-thumb-strip';

          images.forEach(function (src, idx) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'psa-thumb-btn' + (idx === 0 ? ' active' : '');
            btn.setAttribute('aria-label', 'Product image ' + (idx + 1));
            btn.innerHTML = '<img src="' + frappe.utils.escape_html(src) + '" alt="View ' + (idx + 1) + '">';

            var activate = function () {
              mainImg.src = src;
              if (mainImg.srcset) mainImg.removeAttribute('srcset');
              strip.querySelectorAll('.psa-thumb-btn').forEach(function (b) { b.classList.remove('active'); });
              btn.classList.add('active');
            };

            btn.addEventListener('click', activate);
            btn.addEventListener('mouseenter', activate);
            strip.appendChild(btn);
          });

          host.appendChild(strip);
        }
      });
    };

    attachDetailGallery();
    setTimeout(attachDetailGallery, 500);
  }

  // 2. Product Grid / Homepage Cards: Hover Image Swap (also populates cards missing a primary image)
  var enhanceCardHoverImages = function () {
    var cards = Array.from(document.querySelectorAll('.item-card, .product-card, .card'));
    var codeToCards = {};

    cards.forEach(function (card) {
      if (card.dataset.psaHoverBound === '1') return;
      var skuEl = card.querySelector('[data-item-code]');
      var code = skuEl ? skuEl.getAttribute('data-item-code') : null;
      if (!code) {
        var m = (card.textContent || '').match(/SKU:\s*([A-Za-z0-9._-]+)/i);
        if (m) code = m[1];
      }
      if (!code) return;

      card.dataset.psaHoverBound = '1';
      if (!codeToCards[code]) codeToCards[code] = [];
      codeToCards[code].push(card);
    });

    var codes = Object.keys(codeToCards);
    if (!codes.length) return;

    frappe.call({
      method: 'promo_theme.api.get_listing_secondary_images',
      args: { item_codes: JSON.stringify(codes) },
      callback: function (r) {
        var map = (r && r.message) || {};
        Object.keys(map).forEach(function (code) {
          var secondSrc = map[code];
          if (!secondSrc || !codeToCards[code]) return;

          var pre = new Image();
          pre.src = secondSrc;

          codeToCards[code].forEach(function (card) {
            var img = card.querySelector('img');
            if (!img) return;
            var origSrc = img.getAttribute('src');
            if (!origSrc || origSrc === secondSrc) return;
            img.dataset.psaOrigSrc = origSrc;
            img.dataset.psaHoverSrc = secondSrc;

            card.addEventListener('mouseenter', function () {
              img.src = secondSrc;
            });
            card.addEventListener('mouseleave', function () {
              img.src = img.dataset.psaOrigSrc;
            });
          });
        });
      }
    });
  };

  enhanceCardHoverImages();
  setTimeout(enhanceCardHoverImages, 700);
  setTimeout(enhanceCardHoverImages, 1600);
});
