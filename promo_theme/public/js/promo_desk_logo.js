frappe.ready(function () {
  var applyDeskRailLogo = function () {
    var wsLogo = frappe.boot && frappe.boot.website_settings && frappe.boot.website_settings.app_logo;
    var bootLogo = frappe.boot && frappe.boot.app_logo_url;
    var customLogo = wsLogo || bootLogo || '/files/a1its_logo1.png';
    if (!customLogo || customLogo.indexOf('erpnext-logo') !== -1 || customLogo.indexOf('frappe-framework-logo') !== -1) {
      customLogo = '/files/a1its_logo1.png';
    }

    document.querySelectorAll('img').forEach(function (img) {
      var src = img.getAttribute('src') || '';
      if (
        src.indexOf('erpnext-logo') !== -1 ||
        src.indexOf('frappe-framework-logo') !== -1 ||
        img.classList.contains('app-logo')
      ) {
        if (src !== customLogo) {
          img.setAttribute('src', customLogo);
          img.style.objectFit = 'contain';
          img.style.borderRadius = '6px';
        }
      }
    });
  };

  applyDeskRailLogo();
  setTimeout(applyDeskRailLogo, 250);
  setTimeout(applyDeskRailLogo, 800);
  setTimeout(applyDeskRailLogo, 1600);

  if (window.MutationObserver && document.body) {
    var obs = new MutationObserver(function () {
      applyDeskRailLogo();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }
});
