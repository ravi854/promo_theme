frappe.ready(() => {
  const initLiveSearch = () => {
    if (document.querySelector('#promo-live-search-dropdown')) return;

    const navbar = document.querySelector('nav.navbar, header.navbar, .navbar');
    if (!navbar) return;

    // Look for an existing navbar search input or inject one inside the navbar
    let inputEl = navbar.querySelector('input[type="search"], input[name="search"], .search-input');
    let searchWrap = null;

    if (inputEl) {
      searchWrap = inputEl.closest('form, .input-group, .search-box') || inputEl.parentElement;
      searchWrap.classList.add('promo-nav-search-wrap');
    } else {
      const navCollapse = navbar.querySelector('.navbar-collapse, .container') || navbar;
      searchWrap = document.createElement('form');
      searchWrap.action = '/all-products';
      searchWrap.method = 'get';
      searchWrap.className = 'promo-nav-search-wrap my-2 my-lg-0 mx-lg-3';
      searchWrap.innerHTML = `
        <div class="input-group input-group-sm">
          <input type="text" name="search" id="promo-nav-search-input" class="form-control"
            placeholder="Search products or SKU..." autocomplete="off" />
          <div class="input-group-append">
            <button class="btn promo-nav-search-btn" type="submit">&#128269;</button>
          </div>
        </div>
      `;
      const rightNav = navCollapse.querySelector('.navbar-nav:last-child, .ml-auto');
      if (rightNav) {
        rightNav.insertAdjacentElement('beforebegin', searchWrap);
      } else {
        navCollapse.appendChild(searchWrap);
      }
      inputEl = searchWrap.querySelector('#promo-nav-search-input');
    }

    if (!inputEl || !searchWrap) return;
    inputEl.setAttribute('autocomplete', 'off');

    const dropdown = document.createElement('div');
    dropdown.id = 'promo-live-search-dropdown';
    dropdown.className = 'promo-search-dropdown';
    searchWrap.appendChild(dropdown);

    let debounceTimer = null;

    const renderResults = (items, query) => {
      if (!items.length) {
        dropdown.innerHTML = `
          <div class="promo-search-empty">
            No products found for "<strong>${frappe.utils.escape_html(query)}</strong>".
            <a href="/all-products?search=${encodeURIComponent(query)}" class="d-block mt-1">Search full catalogue &rarr;</a>
          </div>
        `;
        dropdown.classList.add('open');
        return;
      }

      const rowsHtml = items
        .map(
          (item) => `
          <a href="${item.route}" class="promo-search-item">
            <div class="promo-search-thumb">
              ${
                item.image
                  ? `<img src="${item.image}" alt="${frappe.utils.escape_html(item.title)}" />`
                  : `<span>${frappe.utils.escape_html((item.item_code || 'PR').slice(0, 2))}</span>`
              }
            </div>
            <div class="promo-search-meta">
              <div class="promo-search-title">${frappe.utils.escape_html(item.title)}</div>
              <div class="promo-search-sub">
                <span>SKU: ${frappe.utils.escape_html(item.item_code)}</span>
                ${item.in_stock ? '<span class="promo-search-stock">In Stock</span>' : ''}
              </div>
            </div>
            <div class="promo-search-price">
              ${
                item.price
                  ? `${item.has_variants ? '<small>From</small> ' : ''}${item.price} <small>ex VAT</small>`
                  : '<small>Quote</small>'
              }
            </div>
          </a>`
        )
        .join('');

      dropdown.innerHTML = `
        ${rowsHtml}
        <a href="/all-products?search=${encodeURIComponent(query)}" class="promo-search-view-all">
          View all results for "${frappe.utils.escape_html(query)}" &rarr;
        </a>
      `;
      dropdown.classList.add('open');
    };

    inputEl.addEventListener('input', () => {
      const q = inputEl.value.trim();
      clearTimeout(debounceTimer);

      if (q.length < 2) {
        dropdown.classList.remove('open');
        return;
      }

      debounceTimer = setTimeout(() => {
        frappe.call({
          method: 'promo_theme.api.search_promo_products',
          args: { query: q },
          callback: (r) => {
            if (inputEl.value.trim() === q) {
              renderResults(r.message || [], q);
            }
          },
        });
      }, 220);
    });

    inputEl.addEventListener('focus', () => {
      if (inputEl.value.trim().length >= 2 && dropdown.innerHTML.trim()) {
        dropdown.classList.add('open');
      }
    });

    document.addEventListener('click', (e) => {
      if (!searchWrap.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });
  };

  initLiveSearch();
});
