frappe.ready(function () {
  var path = window.location.pathname.replace(/^\/+|\/+$/g, '');

  if (!document.getElementById('psa-multi-gallery-styles')) {
    var st = document.createElement('style');
    st.id = 'psa-multi-gallery-styles';
    st.textContent = `
      #psa-detail-thumb-wrap {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 8px 0 4px 0 !important;
        position: relative !important;
        z-index: 10 !important;
      }
      #psa-detail-thumb-strip {
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: nowrap !important;
        align-items: center !important;
        justify-content: flex-start !important;
        gap: 6px !important;
        padding: 2px 0 !important;
        flex: 1 1 auto !important;
        min-width: 0 !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        scroll-behavior: smooth !important;
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
      #psa-detail-thumb-strip::-webkit-scrollbar {
        display: none !important;
      }
      .psa-thumb-nav {
        width: 26px !important;
        height: 46px !important;
        min-width: 26px !important;
        flex: 0 0 26px !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 6px !important;
        background: #ffffff !important;
        color: #132a2e !important;
        font-size: 16px !important;
        font-weight: 700 !important;
        line-height: 1 !important;
        padding: 0 !important;
        cursor: pointer !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08) !important;
        transition: all 0.15s ease !important;
      }
      .psa-thumb-nav:hover:not(:disabled) {
        background: #0f766e !important;
        border-color: #0f766e !important;
        color: #ffffff !important;
      }
      .psa-thumb-nav:disabled {
        opacity: 0.35 !important;
        cursor: default !important;
      }
      #psa-detail-thumb-strip .psa-thumb-btn {
        width: 46px !important;
        height: 46px !important;
        min-width: 46px !important;
        min-height: 46px !important;
        flex: 0 0 46px !important;
        padding: 3px !important;
        border: 2px solid #cbd5e1 !important;
        border-radius: 8px !important;
        background: #ffffff !important;
        cursor: pointer !important;
        overflow: hidden !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: border-color 0.16s ease, transform 0.16s ease !important;
      }
      #psa-detail-thumb-strip .psa-thumb-btn:hover {
        border-color: #0f766e !important;
        transform: translateY(-2px) !important;
      }
      #psa-detail-thumb-strip .psa-thumb-btn.active {
        border-color: #0f766e !important;
        box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.25) !important;
      }
      #psa-detail-thumb-strip .psa-thumb-btn img {
        width: 100% !important;
        height: 100% !important;
        max-width: 38px !important;
        max-height: 38px !important;
        object-fit: contain !important;
        display: block !important;
      }
      img[data-psa-hover-src] { transition: opacity 0.22s ease, transform 0.28s ease; }
    `;
    document.head.appendChild(st);
  }

  // 1. Product Detail Page: Interactive Multi-Image Thumbnail Strip with Left/Right Scroll Arrows (> 6 images)
  var nonDetailPaths = ['', 'home', 'promo_home', 'all-products', 'cart', 'request-for-quotation', 'contact', 'login', 'me', 'orders', 'quotations', 'invoices'];
  if (nonDetailPaths.indexOf(path) === -1) {
    var galleryFetchStarted = false;
    var cachedImages = null;

    var renderStripIntoDom = function (images) {
      if (!images || !images.length || document.getElementById('psa-detail-thumb-wrap')) return;

      var firstImgUrl = images.at(0);
      var mainImg = document.querySelector('.item-image img, .product-image img, img.website-image, .item-slideshow img, .page_content .col-md-5 img, .page_content .col-md-6 img');
      var imageBox = document.querySelector('.item-image, .product-image, .item-slideshow, .website-image-wrapper') || (mainImg && mainImg.parentNode);
      if (!imageBox && !mainImg) return;

      if (!mainImg && imageBox) {
        imageBox.innerHTML = '';
        mainImg = document.createElement('img');
        mainImg.className = 'website-image img-fluid';
        mainImg.style.cssText = 'max-height:360px;width:100%;object-fit:contain;border-radius:10px;background:#fff;display:block;';
        mainImg.src = firstImgUrl;
        imageBox.appendChild(mainImg);
      } else if (mainImg && !mainImg.getAttribute('src')) {
        mainImg.src = firstImgUrl;
      }

      if (images.length < 2) return;

      var wrap = document.createElement('div');
      wrap.id = 'psa-detail-thumb-wrap';

      var strip = document.createElement('div');
      strip.id = 'psa-detail-thumb-strip';

      images.forEach(function (src, idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'psa-thumb-btn' + (idx === 0 ? ' active' : '');
        btn.setAttribute('aria-label', 'Product image ' + (idx + 1));
        btn.innerHTML = '<img src="' + frappe.utils.escape_html(src) + '" alt="View ' + (idx + 1) + '">';

        var activate = function () {
          var currentMain = document.querySelector('.item-image img, .product-image img, img.website-image, .item-slideshow img') || mainImg;
          if (currentMain) {
            currentMain.src = src;
            if (currentMain.srcset) currentMain.removeAttribute('srcset');
          }
          strip.querySelectorAll('.psa-thumb-btn').forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
        };

        btn.addEventListener('click', activate);
        btn.addEventListener('mouseenter', activate);
        strip.appendChild(btn);
      });

      var showArrows = images.length > 6;
      var prevBtn = null;
      var nextBtn = null;

      if (showArrows) {
        prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'psa-thumb-nav psa-thumb-prev';
        prevBtn.setAttribute('aria-label', 'Previous thumbnails');
        prevBtn.innerHTML = '&#8249;';

        nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'psa-thumb-nav psa-thumb-next';
        nextBtn.setAttribute('aria-label', 'Next thumbnails');
        nextBtn.innerHTML = '&#8250;';

        var updateNavState = function () {
          prevBtn.disabled = strip.scrollLeft <= 2;
          nextBtn.disabled = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 2;
        };

        prevBtn.addEventListener('click', function () {
          strip.scrollBy({ left: -208, behavior: 'smooth' });
          setTimeout(updateNavState, 260);
        });
        nextBtn.addEventListener('click', function () {
          strip.scrollBy({ left: 208, behavior: 'smooth' });
          setTimeout(updateNavState, 260);
        });
        strip.addEventListener('scroll', updateNavState);

        wrap.appendChild(prevBtn);
        wrap.appendChild(strip);
        wrap.appendChild(nextBtn);
        setTimeout(updateNavState, 100);
      } else {
        wrap.appendChild(strip);
      }

      if (mainImg) {
        mainImg.style.setProperty('position', 'static', 'important');
        mainImg.style.setProperty('display', 'block', 'important');
        mainImg.style.setProperty('max-height', '360px', 'important');
        mainImg.style.setProperty('width', '100%', 'important');
        mainImg.style.setProperty('object-fit', 'contain', 'important');
        mainImg.style.setProperty('margin', '0 auto', 'important');
      }
      if (imageBox) {
        imageBox.style.setProperty('position', 'relative', 'important');
        imageBox.style.setProperty('overflow', 'hidden', 'important');
        imageBox.style.setProperty('height', 'auto', 'important');
        imageBox.style.setProperty('min-height', '0', 'important');
        imageBox.style.setProperty('flex-shrink', '0', 'important');
      }

      var leftCol = (imageBox && imageBox.closest('.col-md-5, .col-md-6, .product-image-container, .item-image-wrapper')) || (imageBox && imageBox.parentNode);
      if (leftCol && imageBox && imageBox.parentNode === leftCol) {
        leftCol.style.setProperty('display', 'flex', 'important');
        leftCol.style.setProperty('flex-direction', 'column', 'important');
        leftCol.style.setProperty('gap', '10px', 'important');
        imageBox.insertAdjacentElement('afterend', wrap);
      } else if (imageBox) {
        imageBox.style.setProperty('display', 'flex', 'important');
        imageBox.style.setProperty('flex-direction', 'column', 'important');
        imageBox.style.setProperty('gap', '10px', 'important');
        imageBox.appendChild(wrap);
      } else if (mainImg && mainImg.parentNode) {
        mainImg.insertAdjacentElement('afterend', wrap);
      }
    };

    var attachDetailGallery = function () {
      if (document.getElementById('psa-detail-thumb-wrap')) return;
      if (cachedImages) {
        renderStripIntoDom(cachedImages);
        return;
      }
      if (galleryFetchStarted) return;
      galleryFetchStarted = true;

      frappe.call({
        method: 'promo_theme.api.get_product_gallery',
        args: { route: path },
        callback: function (r) {
cachedImages = (r && r.message) || [];
renderStripIntoDom(cachedImages);
}
});
};
attachDetailGallery();
setTimeout(attachDetailGallery, 400);
setTimeout(attachDetailGallery, 1200);
if (window.MutationObserver && document.body) {
var detailObs = new MutationObserver(function () {
if (cachedImages && !document.getElementById('psa-detail-thumb-wrap')) {
renderStripIntoDom(cachedImages);
}
});
detailObs.observe(document.body, { childList: true, subtree: true });
}
}
// 2. Product Grid / Homepage Cards: Hover Image Swap
var enhanceCardHoverImages = function () {
var cards = Array.from(document.querySelectorAll('.item-card, .product-card, .card'));
var codeToCards = {};
cards.forEach(function (card) {
if (card.dataset.psaHoverBound === '1') return;
var skuEl = card.querySelector('[data-item-code]');
var code = skuEl ? skuEl.getAttribute('data-item-code') : null;
if (!code) {
var m = (card.textContent || '').match(/SKU:\s*([A-Za-z0-9._-]+)/i);
if (m) code = m.at(1);
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
if (!secondSrc || typeof secondSrc !== 'string' || !codeToCards[code]) return;
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
