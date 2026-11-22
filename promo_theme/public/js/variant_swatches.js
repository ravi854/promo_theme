frappe.ready(() => {
  const colorHexMap = {
    black: '#111827',
    white: '#ffffff',
    navy: '#1e3a8a',
    'navy blue': '#1e3a8a',
    blue: '#2563eb',
    'royal blue': '#1d4ed8',
    'sky blue': '#38bdf8',
    red: '#dc2626',
    green: '#16a34a',
    yellow: '#eab308',
    orange: '#f97316',
    pink: '#ec4899',
    purple: '#9333ea',
    grey: '#6b7280',
    gray: '#6b7280',
    charcoal: '#374151',
    brown: '#78350f',
    beige: '#e7e5e4',
  };

  const sizeShortMap = {
    'extra small': 'XS',
    small: 'S',
    medium: 'M',
    large: 'L',
    'extra large': 'XL',
    '2x large': '2XL',
    '3x large': '3XL',
  };

  const renderDirectPageSwatches = () => {
    const detailContainer = document.querySelector('.product-details, .item-details');
    if (!detailContainer || detailContainer.dataset.directSwatchesLoaded) return;

    const rawPath = decodeURIComponent(window.location.pathname);
    const route = '/' + rawPath.replace(/^\/+|\/+$/g, '');

    const itemCodeEl = document.querySelector('[data-item-code]');
    let itemCode = itemCodeEl ? itemCodeEl.getAttribute('data-item-code') : '';
    if (!itemCode) {
      const skuText = detailContainer.querySelector('.promo-detail-sku, .item-code')?.textContent || '';
      const match = skuText.match(/SKU:\s*([^\s]+)/i);
      if (match) itemCode = match.at(1);
    }

    detailContainer.dataset.directSwatchesLoaded = '1';

    frappe.call({
      method: 'promo_theme.api.get_product_variants',
      args: { route, item_code: itemCode },
      callback: (r) => {
        const variants = r.message || [];
        if (!variants.length) {
          delete detailContainer.dataset.directSwatchesLoaded;
          return;
        }
        if (detailContainer.querySelector('#promo-direct-swatches')) return;

        const currentVariant = variants.find((v) => v.item_code === itemCode) || variants.at(0) || {};
        const currentAttrs = currentVariant.attributes || {};
        const activeColor = currentAttrs.Colour || currentAttrs.Color || '';
        const activeSize = currentAttrs.Size || '';

        const colorMap = new Map();
        const sizeMap = new Map();

        variants.forEach((v) => {
          const c = v.attributes?.Colour || v.attributes?.Color;
          const s = v.attributes?.Size;
          if (c && (!colorMap.has(c) || s === activeSize)) {
            colorMap.set(c, v);
          }
          if (s && (!sizeMap.has(s) || c === activeColor)) {
            sizeMap.set(s, v);
          }
        });

        const wrap = document.createElement('div');
        wrap.id = 'promo-direct-swatches';
        wrap.className = 'mt-3 mb-3';
        wrap.style.cssText = 'display:block;width:100%;clear:both;';

        if (colorMap.size) {
          const colorHeader = document.createElement('div');
          colorHeader.style.cssText = 'font-size:12px;font-weight:600;margin-bottom:6px;';
          colorHeader.innerHTML = `Colour: <span id="promo-active-color-name" class="text-muted font-weight-normal">${frappe.utils.escape_html(activeColor)}</span>`;
          wrap.appendChild(colorHeader);

          const colorRow = document.createElement('div');
          colorRow.className = 'promo-color-swatches mb-3';

          colorMap.forEach((variantObj, colorName) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'promo-swatch-circle' + (colorName === activeColor ? ' active' : '');
            btn.title = colorName;
            btn.style.backgroundColor = colorHexMap[colorName.trim().toLowerCase()] || colorName.trim().toLowerCase();

            btn.addEventListener('click', () => {
              if (variantObj.route && variantObj.route !== route) {
                window.location.href = variantObj.route;
                return;
              }
              colorRow.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
              btn.classList.add('active');
              const span = wrap.querySelector('#promo-active-color-name');
              if (span) span.textContent = colorName;
              if (variantObj.image) {
                const img = document.querySelector('.product-image img, .item-image img, .website-image');
                if (img) img.src = variantObj.image;
              }
            });

            colorRow.appendChild(btn);
          });

          wrap.appendChild(colorRow);
        }

        if (sizeMap.size) {
          const sizeHeader = document.createElement('div');
          sizeHeader.style.cssText = 'font-size:12px;font-weight:600;margin-bottom:6px;';
          sizeHeader.innerHTML = `Size: <span id="promo-active-size-name" class="text-muted font-weight-normal">${frappe.utils.escape_html(activeSize)}</span>`;
          wrap.appendChild(sizeHeader);

          const sizeRow = document.createElement('div');
          sizeRow.className = 'promo-size-pills';

          sizeMap.forEach((variantObj, sizeName) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'promo-size-pill' + (sizeName === activeSize ? ' active' : '');
            btn.title = sizeName;
            btn.textContent = sizeShortMap[sizeName.trim().toLowerCase()] || sizeName;

            btn.addEventListener('click', () => {
              if (variantObj.route && variantObj.route !== route) {
                window.location.href = variantObj.route;
                return;
              }
              sizeRow.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
              btn.classList.add('active');
              const span = wrap.querySelector('#promo-active-size-name');
              if (span) span.textContent = sizeName;
            });

            sizeRow.appendChild(btn);
          });

          wrap.appendChild(sizeRow);
        }

        // Insert right before the Add to Quote / Cart action area so it never stretches the In Stock badge
        const cartAnchor = detailContainer.querySelector('.item-cart, .cart-action, .add-to-cart-btn, #item-add-to-cart');
        if (cartAnchor) {
          const cartBlock = cartAnchor.closest('.row, .form-group, .mt-3, .mt-4') || cartAnchor;
          cartBlock.insertAdjacentElement('beforebegin', wrap);
        } else {
          detailContainer.appendChild(wrap);
        }
      },
    });
  };

  renderDirectPageSwatches();
  setTimeout(renderDirectPageSwatches, 500);
  setTimeout(renderDirectPageSwatches, 1200);
});
