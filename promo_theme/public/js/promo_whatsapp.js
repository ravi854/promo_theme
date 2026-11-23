frappe.ready(() => {
  const initWhatsAppButton = () => {
    if (document.querySelector('#promo-whatsapp-float')) return;

    const waNumber = '27840277327';

    const buildWhatsAppUrl = () => {
      const detailContainer = document.querySelector('.product-details, .item-details');
      let message = 'Hi! I would like to request a quote for promotional products.';

      if (detailContainer) {
        const title = detailContainer.querySelector('.product-title, h1, h2')?.textContent?.trim() || '';
        const skuEl = document.querySelector('[data-item-code]');
        const sku = skuEl
          ? skuEl.getAttribute('data-item-code')
          : (detailContainer.querySelector('.promo-detail-sku')?.textContent || '').replace(/SKU:\s*/i, '').trim();

        if (title) {
          message = `Hi! I'd like a quick quote for ${title}${sku ? ` (SKU: ${sku})` : ''}. Link: ${window.location.href}`;
        }
      }

      const params = new URLSearchParams({ phone: waNumber, text: message });
      return 'https://wa.me?' + params.toString();
    };

    const btn = document.createElement('a');
    btn.id = 'promo-whatsapp-float';
    btn.className = 'promo-wa-btn';
    btn.href = buildWhatsAppUrl();
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.title = 'Chat with us on WhatsApp for a Quick Quote';
    btn.innerHTML = `
      <svg viewBox="0 0 32 32" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M16.004 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.256.59 4.46 1.71 6.404L3.1 28.8l6.58-1.726a12.74 12.74 0 0 0 6.324 1.676h.006c7.058 0 12.796-5.74 12.796-12.8 0-3.42-1.332-6.636-3.75-9.054A12.716 12.716 0 0 0 16.004 3.2zm0 23.38h-.004a10.6 10.6 0 0 1-5.404-1.48l-.388-.23-3.904 1.024 1.042-3.806-.252-.402a10.566 10.566 0 0 1-1.622-5.646c0-5.858 4.766-10.624 10.628-10.624 2.838 0 5.506 1.106 7.512 3.114a10.556 10.556 0 0 1 3.11 7.514c0 5.86-4.766 10.626-10.624 10.626zm5.828-7.958c-.32-.16-1.89-.932-2.182-1.038-.292-.106-.506-.16-.718.16-.214.32-.826 1.038-1.012 1.252-.186.212-.372.24-.692.08-.32-.16-1.35-.498-2.572-1.588-.95-.848-1.592-1.896-1.778-2.216-.186-.32-.02-.492.14-.652.144-.144.32-.372.48-.558.16-.186.212-.32.32-.532.106-.214.052-.4-.026-.56-.08-.16-.718-1.732-.984-2.372-.26-.622-.524-.538-.718-.548l-.612-.01c-.214 0-.56.08-.852.4-.292.32-1.118 1.092-1.118 2.664s1.144 3.09 1.304 3.304c.16.212 2.252 3.438 5.456 4.822.762.328 1.358.524 1.822.672.766.244 1.462.21 2.012.128.614-.092 1.89-.772 2.156-1.518.266-.746.266-1.384.186-1.518-.08-.132-.292-.212-.612-.372z"/>
      </svg>
      <span class="promo-wa-label">Quick Quote</span>
    `;

    btn.addEventListener('click', () => {
      btn.href = buildWhatsAppUrl();
    });

    document.body.appendChild(btn);
  };

  initWhatsAppButton();
});
