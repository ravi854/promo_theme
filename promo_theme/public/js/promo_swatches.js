frappe.ready(function () {
  var COLOR_MAP = {
    jade: { hex: '#00A86B', bg: '#00A86B' },
    quartz: { hex: '#F7CAC9', bg: 'linear-gradient(135deg, #f9d5d3 0%, #e8a5a8 100%)' },
    chrome: { hex: '#D8DCE3', bg: 'linear-gradient(135deg, #f8fafc 0%, #94a3b8 50%, #e2e8f0 100%)' },
    bronze: { hex: '#CD7F32', bg: 'linear-gradient(135deg, #e6a15c 0%, #cd7f32 55%, #8c5319 100%)' },
    cobalt: { hex: '#0047AB', bg: '#0047AB' },
    silver: { hex: '#C0C0C0', bg: 'linear-gradient(135deg, #f1f5f9 0%, #b0b7c3 55%, #8b95a5 100%)' },
    gold: { hex: '#D4AF37', bg: 'linear-gradient(135deg, #fde047 0%, #d4af37 55%, #a16207 100%)' },
    platinum: { hex: '#E5E4E2', bg: 'linear-gradient(135deg, #ffffff 0%, #d8dadf 55%, #b8bcc4 100%)' },
    diamond: { hex: '#BAE6FD', bg: 'linear-gradient(135deg, #ffffff 0%, #bae6fd 55%, #7dd3fc 100%)' },
    titanium: { hex: '#878681', bg: 'linear-gradient(135deg, #b5b4ae 0%, #787772 55%, #4b4a46 100%)' },
    tanzanite: { hex: '#4B3869', bg: 'linear-gradient(135deg, #6d28d9 0%, #4b3869 60%, #2e1065 100%)' },
    black: { hex: '#111827', bg: '#111827' },
    white: { hex: '#FFFFFF', bg: '#FFFFFF' },
    navy: { hex: '#1E3A8A', bg: '#1E3A8A' },
    'navy blue': { hex: '#1E3A8A', bg: '#1E3A8A' },
    blue: { hex: '#2563EB', bg: '#2563EB' },
    'royal blue': { hex: '#1D4ED8', bg: '#1D4ED8' },
    red: { hex: '#DC2626', bg: '#DC2626' },
    green: { hex: '#16A34A', bg: '#16A34A' },
    yellow: { hex: '#EAB308', bg: '#EAB308' },
    orange: { hex: '#EA580C', bg: '#EA580C' },
    grey: { hex: '#6B7280', bg: '#6B7280' },
    gray: { hex: '#6B7280', bg: '#6B7280' },
    charcoal: { hex: '#374151', bg: '#374151' },
    pink: { hex: '#EC4899', bg: '#EC4899' },
    purple: { hex: '#7C3AED', bg: '#7C3AED' },
    brown: { hex: '#78350F', bg: '#78350F' },
    beige: { hex: '#D6C7B2', bg: '#D6C7B2' },
    khaki: { hex: '#C3B091', bg: '#C3B091' },
    teal: { hex: '#0F766E', bg: '#0F766E' }
  };

  if (!document.getElementById('psa-swatch-styles')) {
    var st = document.createElement('style');
    st.id = 'psa-swatch-styles';
    st.textContent = `
      .psa-swatch-wrap { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 6px; }
      .psa-swatch-item { width: 30px; height: 30px; border-radius: 50%; border: 2px solid #cbd5e1; padding: 0; cursor: pointer; position: relative; transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease; box-shadow: inset 0 1px 2px rgba(255,255,255,0.6), 0 1px 3px rgba(15,23,42,0.12); }
      .psa-swatch-item:hover { transform: scale(1.12); border-color: #0f766e; }
      .psa-swatch-item.active { border: 2px solid #0f766e; box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #0f766e; transform: scale(1.08); }
      .psa-swatch-selected-label { font-size: 12px; font-weight: 700; color: #0f766e; margin-left: 6px; }
    `;
    document.head.appendChild(st);
  }

  var applyColors = function () {
    // 1. Patch any native Webshop/Theme swatch circles already rendered in the DOM
    var nativeSwatches = Array.from(document.querySelectorAll('.color-swatch, .swatch, [data-attribute-value], [data-value]'));
    nativeSwatches.forEach(function (el) {
      var raw = (
        el.getAttribute('data-attribute-value') ||
        el.getAttribute('data-value') ||
        el.getAttribute('title') ||
        el.getAttribute('aria-label') ||
        el.textContent ||
        ''
      ).trim().toLowerCase();
      var entry = COLOR_MAP[raw];
      if (!entry) return;
      // Only colour circle elements (avoid re-backgrounding full text pills/buttons)
      if (el.tagName === 'SELECT' || el.tagName === 'OPTION' || el.offsetWidth > 60) return;
      el.style.setProperty('background-color', entry.hex, 'important');
      el.style.setProperty('background', entry.bg, 'important');
    });

    // 2. Also build custom swatches next to any Colour <select> dropdowns
    var selects = Array.from(document.querySelectorAll('select.variant-select, select[data-attribute], .item-variants select, select'));
    selects.forEach(function (sel) {
      if (sel.dataset.psaSwatchesBound === '1') return;

      var attrName = (sel.getAttribute('data-attribute') || sel.name || sel.id || '').toLowerCase();
      var labelEl = sel.closest('.form-group, .variant-attribute, div') && sel.closest('.form-group, .variant-attribute, div').querySelector('label, .attribute-name, span');
      var labelText = (labelEl ? labelEl.textContent : '').toLowerCase();

      var validOptions = Array.from(sel.options).filter(function (o) {
        return o.value && o.value.trim() !== '';
      });
      if (!validOptions.length) return;

      var matchedCount = validOptions.filter(function (o) {
        return !!COLOR_MAP[o.value.trim().toLowerCase()];
      }).length;

      var isColorSelect = attrName.indexOf('col') !== -1 || labelText.indexOf('col') !== -1 || matchedCount >= Math.ceil(validOptions.length / 2);
      if (!isColorSelect || matchedCount === 0) return;

      sel.dataset.psaSwatchesBound = '1';

      var wrap = document.createElement('div');
      wrap.className = 'psa-swatch-wrap';

      var activeBadge = document.createElement('span');
      activeBadge.className = 'psa-swatch-selected-label';
      activeBadge.textContent = sel.value || '';

      validOptions.forEach(function (opt) {
        var rawVal = opt.value.trim();
        var entry = COLOR_MAP[rawVal.toLowerCase()];
        if (!entry) return;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'psa-swatch-item' + (sel.value === opt.value ? ' active' : '');
        btn.title = rawVal;
        btn.setAttribute('aria-label', rawVal);
        btn.style.setProperty('background-color', entry.hex, 'important');
        btn.style.setProperty('background', entry.bg, 'important');

        btn.addEventListener('click', function () {
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          wrap.querySelectorAll('.psa-swatch-item').forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
          activeBadge.textContent = rawVal;
        });

        wrap.appendChild(btn);
      });

      wrap.appendChild(activeBadge);
      sel.parentNode.insertBefore(wrap, sel.nextSibling);
    });
  };

  applyColors();
  setTimeout(applyColors, 350);
  setTimeout(applyColors, 950);
  setTimeout(applyColors, 1800);
});
