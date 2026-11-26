frappe.ready(function () {
  var path = window.location.pathname.replace(/\/+$/, '');
  var bodyPath = (document.body && document.body.getAttribute('data-path')) || '';
  var isHome = (path === '' || path === '/' || path === '/index' || path === '/home' || path === '/promo_home' || bodyPath === 'promo_home' || bodyPath === 'home');
  var existingTarget = document.getElementById('psa-branding-techniques-section');

  if (!isHome && !existingTarget) return;
  if (existingTarget && existingTarget.dataset.loaded === '1') return;

  var techniques = [
    { num: '01', name: 'Screen Printing', tag: 'Ink & Print', desc: 'Vibrant, durable ink pressed through mesh stencils; ideal for bulk apparel, tote bags, and flat goods.' },
    { num: '02', name: 'Embroidery', tag: 'Thread & Stitch', desc: 'Classic stitched thread branding that adds premium texture and longevity to caps, polos, and jackets.' },
    { num: '03', name: 'Laser Engraving', tag: 'Etch & Carve', desc: 'High-precision laser etching that permanently marks metal, wood, glass, and leather surfaces.' },
    { num: '04', name: 'Pad Printing', tag: 'Ink & Print', desc: 'Silicone pad transfers crisp ink logos onto curved or uneven surfaces like pens, mugs, and stress balls.' },
    { num: '05', name: 'Digital / UV Printing', tag: 'Full Color', desc: 'Direct full-color printing cured instantly with UV light for sharp detail on flat rigid promotional items.' },
    { num: '06', name: 'Sublimation', tag: 'Full Color', desc: 'Heat-infused dye bonds permanently into polyester fabrics and coated drinkware with zero surface feel.' },
    { num: '07', name: 'Heat Transfer Vinyl', tag: 'Heat & Press', desc: 'Precision-cut vinyl heat-pressed onto garments; ideal for crisp lettering, names, and short runs.' },
    { num: '08', name: 'Direct-to-Garment (DTG)', tag: 'Full Color', desc: 'Specialty textile inkjet printing delivering photo-realistic, soft-hand prints on cotton apparel.' },
    { num: '09', name: 'Direct-to-Film (DTF)', tag: 'Heat & Press', desc: 'Full-color printed transfers bonded via adhesive film onto virtually any fabric color or blend.' },
    { num: '10', name: 'Debossing', tag: 'Impression', desc: 'Heated metal die presses your logo into leather, notebooks, or PU covers for an understated indent.' },
    { num: '11', name: 'Embossing', tag: 'Impression', desc: 'Raises your artwork above the surface of paper, cardstock, or leather for a tactile 3D impression.' },
    { num: '12', name: 'Foil Stamping', tag: 'Impression', desc: 'Metallic gold, silver, or pigmented foil bonded with heat and pressure for a luxury reflective finish.' },
    { num: '13', name: 'Epoxy Dome', tag: 'Specialty', desc: 'Full-color printed decal sealed under a clear, scratch-resistant 3D polyurethane resin lens.' },
    { num: '14', name: 'Rotary Screen Printing', tag: 'Ink & Print', desc: 'Cylindrical printing process allowing seamless wrap-around logos on water bottles, tumblers, and pens.' },
    { num: '15', name: 'Sandblasting / Deep Etch', tag: 'Etch & Carve', desc: 'Abrasive blasting carves deep, frosted detail into crystal trophies, glass awards, and ceramic mugs.' },
    { num: '16', name: 'Woven Patches & Labels', tag: 'Thread & Stitch', desc: 'Custom-woven fabric badges sewn or heat-applied onto headwear, backpacks, and outerwear.' },
    { num: '17', name: '3D Puff Embroidery', tag: 'Thread & Stitch', desc: 'High-density stitching over raised foam backing to give caps and headwear bold 3D dimension.' },
    { num: '18', name: 'Die-Struck / Metal Cast', tag: 'Specialty', desc: 'Custom-molded metal emblems, keyrings, coins, and lapel pins finished with soft or hard enamel.' },
    { num: '19', name: 'Hydrographics', tag: 'Specialty', desc: 'Water-transfer film wraps complex 3D shapes with seamless patterns and full-coverage graphics.' },
    { num: '20', name: 'Offset Lithography', tag: 'Ink & Print', desc: 'High-volume, sharp CMYK and Pantone printing for packaging, folders, notebooks, and desk pads.' },
    { num: '21', name: 'Digital Transfer', tag: 'Heat & Press', desc: 'Full-color printed transfers with fine gradients heat-applied to bags, umbrellas, and sportswear.' },
    { num: '22', name: 'Appliqué Stitching', tag: 'Thread & Stitch', desc: 'Laser-cut fabric shapes stitched onto garments for bold, oversized branding with reduced stitch weight.' }
  ];

  if (!document.getElementById('psa-branding-styles')) {
    var style = document.createElement('style');
    style.id = 'psa-branding-styles';
    style.textContent = `
      #psa-branding-techniques-section { max-width: 1280px; margin: 1.75rem auto; padding: 0 1rem; }
      #psa-branding-techniques-section .psa-bt-header { text-align: center; margin-bottom: 0.9rem; }
      #psa-branding-techniques-section .psa-bt-header h2 { font-size: 21px !important; line-height: 1.3 !important; font-weight: 800 !important; color: #132a2e !important; margin: 0 0 6px 0 !important; }
      #psa-branding-techniques-section .psa-bt-header p { font-size: 13px !important; line-height: 1.45 !important; color: #475569 !important; max-width: 620px; margin: 0 auto 10px auto !important; }
      #psa-branding-techniques-section .psa-bt-controls { display: flex; flex-wrap: wrap; justify-content: center; gap: 5px; margin-bottom: 12px; }
      #psa-branding-techniques-section .psa-bt-btn { border: 1px solid #cbd5e1; background: #ffffff; color: #132a2e; padding: 3px 9px; border-radius: 999px; font-size: 11.5px !important; font-weight: 600; cursor: pointer; transition: all 0.18s ease; }
      #psa-branding-techniques-section .psa-bt-btn.active, #psa-branding-techniques-section .psa-bt-btn:hover { background: #0f766e; border-color: #0f766e; color: #ffffff; }
      #psa-branding-techniques-section .psa-bt-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
      @media (max-width: 1024px) { #psa-branding-techniques-section .psa-bt-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      @media (max-width: 576px) { #psa-branding-techniques-section .psa-bt-grid { grid-template-columns: 1fr; } }
      #psa-branding-techniques-section .psa-bt-card { background: #ffffff; border: 1px solid #d1fae5; border-top: 3px solid #0f766e; border-radius: 10px; padding: 8px 10px; box-shadow: 0 2px 6px rgba(19, 42, 46, 0.04); transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease; }
      #psa-branding-techniques-section .psa-bt-card:hover { transform: translateY(-3px); border-color: #0f766e; box-shadow: 0 8px 18px rgba(15, 118, 110, 0.12); }
      #psa-branding-techniques-section .psa-bt-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
      #psa-branding-techniques-section .psa-bt-tag { font-size: 9.5px !important; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; background: #f0fdfa; color: #0f766e; border: 1px solid #99f6e4; padding: 1px 7px; border-radius: 999px; }
      #psa-branding-techniques-section .psa-bt-num { font-size: 10px !important; font-weight: 700; color: #132a2e; background: #e2e8f0; padding: 1px 6px; border-radius: 5px; }
      #psa-branding-techniques-section .psa-bt-card h4 { font-size: 13.5px !important; line-height: 1.3 !important; font-weight: 700 !important; margin: 0 0 2px 0 !important; color: #132a2e !important; }
      #psa-branding-techniques-section .psa-bt-card p { font-size: 11.5px !important; line-height: 1.42 !important; color: #64748b !important; margin: 0 !important; }
    `;
    document.head.appendChild(style);
  }

  var section = existingTarget || document.createElement('section');
  section.id = 'psa-branding-techniques-section';
  section.dataset.loaded = '1';

  var categories = ['All', 'Ink & Print', 'Thread & Stitch', 'Full Color', 'Heat & Press', 'Etch & Carve', 'Impression', 'Specialty'];

  section.innerHTML = `
    <div class="psa-bt-header">
      <h2>22 Branding &amp; Decoration Techniques</h2>
      <p>Explore our full range of custom branding methods tailored for apparel, drinkware, corporate gifts, and promotional merchandise.</p>
      <div class="psa-bt-controls">
        ${categories.map(function (c, i) {
          return '<button type="button" class="psa-bt-btn' + (i === 0 ? ' active' : '') + '" data-cat="' + c + '">' + c + '</button>';
        }).join('')}
      </div>
    </div>
    <div class="psa-bt-grid" id="psa-bt-grid"></div>
  `;

  if (!existingTarget) {
    var oldHeading = Array.from(document.querySelectorAll('h2')).find(function (el) {
      return el.textContent && el.textContent.indexOf('Custom Branding Techniques Guide') !== -1;
    });
    var oldSection = oldHeading ? oldHeading.closest('section, .section, .container, div') : null;
    if (oldSection && oldSection.parentNode) {
      oldSection.parentNode.replaceChild(section, oldSection);
    } else {
      var footer = document.querySelector('footer, .web-footer');
      var main = document.querySelector('main, .page_content, #page-index, body');
      if (footer && footer.parentNode) {
        footer.parentNode.insertBefore(section, footer);
      } else if (main) {
        main.appendChild(section);
      }
    }
  }

  var grid = section.querySelector('#psa-bt-grid');
  var renderCards = function (cat) {
    var list = cat === 'All' ? techniques : techniques.filter(function (t) { return t.tag === cat; });
    grid.innerHTML = list.map(function (t) {
      return `
        <div class="psa-bt-card">
          <div class="psa-bt-top">
            <span class="psa-bt-tag">${t.tag}</span>
            <span class="psa-bt-num">#${t.num}</span>
          </div>
          <h4>${t.name}</h4>
          <p>${t.desc}</p>
        </div>
      `;
    }).join('');
  };

  section.querySelectorAll('.psa-bt-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
section.querySelectorAll('.psa-bt-btn').forEach(function (b) { b.classList.remove('active'); });
btn.classList.add('active');
renderCards(btn.dataset.cat);
});
});
renderCards('All');
});
