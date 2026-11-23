frappe.ready(() => {
  const initPromoChat = () => {
    if (document.querySelector('#promo-chat-widget')) return;

    // Remove the standalone WhatsApp float so both sit unified inside this chat widget

    const waNumber = '27840277327';

    const quickAnswers = {
      artwork:
        'Every order includes a <strong>free digital artwork mockup</strong> before production starts! Simply add items to your Quote List or send us your logo.',
      delivery:
        'We offer <strong>FREE nationwide delivery</strong> across South Africa on orders over R1,500 ex VAT. Standard branded lead time is 5–10 working days from artwork approval.',
      bulk:
        'Need 50, 100, or 500+ units? Add items to your <strong>Quote List</strong> or message us below and our account managers will apply volume discounts.',
    };

    const widget = document.createElement('div');
    widget.id = 'promo-chat-widget';
    widget.innerHTML = `
      <!-- Chat Popup Window -->
      <div id="promo-chat-box" class="promo-chat-box" aria-hidden="true">
        <div class="promo-chat-header">
          <div>
            <div class="promo-chat-title">
              <span class="promo-online-dot"></span> PrintStoreAmaze Support
            </div>
            <div class="promo-chat-sub">We typically reply within a few minutes</div>
          </div>
          <button type="button" id="promo-chat-close" class="promo-chat-close" title="Close chat">&times;</button>
        </div>

        <div id="promo-chat-messages" class="promo-chat-messages">
          <div class="promo-msg promo-msg-bot">
            Hi there! &#128075; Welcome to PrintStoreAmaze! Ask us a question about branding, bulk pricing, or stock—or tap a quick topic below:
          </div>
          <div class="promo-quick-chips">
            <button type="button" data-topic="artwork">Free Artwork</button>
            <button type="button" data-topic="delivery">Delivery &amp; Lead Times</button>
            <button type="button" data-topic="bulk">Bulk Discounts</button>
            <a id="promo-chat-wa-link" href="https://whatsapp.com{waNumber}" target="_blank" rel="noopener noreferrer" class="promo-chip-wa">
              WhatsApp Chat &#8599;
            </a>
          </div>
        </div>

        <form id="promo-chat-form" class="promo-chat-form">
          <div class="promo-chat-form-title">Start a Live Chat / Request Callback</div>
          <input type="text" id="pc-name" class="form-control form-control-sm mb-1" placeholder="Your Name *" required />
          <div class="d-flex gap-1 mb-1" style="gap: 4px;">
            <input type="email" id="pc-email" class="form-control form-control-sm" placeholder="Work Email *" required />
            <input type="text" id="pc-phone" class="form-control form-control-sm" placeholder="Phone" />
          </div>
          <div class="d-flex gap-1" style="gap: 4px;">
            <input type="text" id="pc-msg" class="form-control form-control-sm" placeholder="Type your question..." required />
            <button type="submit" id="pc-send-btn" class="btn btn-sm promo-chat-send">Send</button>
          </div>
        </form>
      </div>

      <!-- Floating Launcher Button -->
      <button type="button" id="promo-chat-launcher" class="promo-chat-launcher" title="Chat with Sales Support">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span class="promo-chat-launcher-text">Chat with Us</span>
      </button>
    `;

    document.body.appendChild(widget);

    const chatBox = widget.querySelector('#promo-chat-box');
    const launcher = widget.querySelector('#promo-chat-launcher');
    const closeBtn = widget.querySelector('#promo-chat-close');
    const msgContainer = widget.querySelector('#promo-chat-messages');
    const form = widget.querySelector('#promo-chat-form');
    const waLink = widget.querySelector('#promo-chat-wa-link');

    const updateWaHref = () => {
      const text = `Hi! I'm browsing ${window.location.href} and need help with a quote.`;
      const params = new URLSearchParams({ phone: waNumber, text });
      waLink.href = 'https://whatsapp.com?' + params.toString();
    };
    updateWaHref();

    const appendBubble = (html, isUser = false) => {
      const div = document.createElement('div');
      div.className = isUser ? 'promo-msg promo-msg-user' : 'promo-msg promo-msg-bot';
      div.innerHTML = html;
      msgContainer.appendChild(div);
      msgContainer.scrollTop = msgContainer.scrollHeight;
    };

    launcher.addEventListener('click', () => {
      updateWaHref();
      chatBox.classList.toggle('open');
    });

    closeBtn.addEventListener('click', () => {
      chatBox.classList.remove('open');
    });

    // Quick FAQ chip responses
    widget.querySelectorAll('.promo-quick-chips button[data-topic]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const topic = chip.dataset.topic;
        appendBubble(frappe.utils.escape_html(chip.textContent), true);
        setTimeout(() => {
          appendBubble(quickAnswers[topic] || 'Our team is ready to help!');
        }, 250);
      });
    });

    // Live inquiry submission to ERPNext Lead + Sales Email
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = widget.querySelector('#pc-name').value.trim();
      const email = widget.querySelector('#pc-email').value.trim();
      const phone = widget.querySelector('#pc-phone').value.trim();
      const message = widget.querySelector('#pc-msg').value.trim();
      if (!name || !email || !message) return;

      const sendBtn = widget.querySelector('#pc-send-btn');
      sendBtn.disabled = true;
      sendBtn.textContent = '...';

      appendBubble(frappe.utils.escape_html(message), true);
      widget.querySelector('#pc-msg').value = '';

      frappe.call({
        method: 'promo_theme.api.submit_live_chat_inquiry',
        args: { name, email, phone, message, page_url: window.location.href },
        callback: (r) => {
          sendBtn.disabled = false;
          sendBtn.textContent = 'Send';
          if (r.message && r.message.status === 'success') {
            appendBubble(
              `Thanks <strong>${frappe.utils.escape_html(name)}</strong>! Your message has been sent to our sales team. We will reply to <strong>${frappe.utils.escape_html(email)}</strong> shortly (or call <strong>084 027 7327</strong> anytime).`
            );
          }
        },
        error: () => {
          sendBtn.disabled = false;
          sendBtn.textContent = 'Send';
          appendBubble('Sorry, something went wrong. Please call us on <strong>084 027 7327</strong> or tap <strong>WhatsApp Chat</strong> above.');
        },
      });
    });
  };

  initPromoChat();
});

frappe.ready(() => {
  if (window.location.pathname.startsWith('/helpdesk')) return;

  const injectTicketShortcut = () => {
    const panel = document.querySelector('#psa-chat-panel, .psa-chat-panel');
    if (!panel || panel.querySelector('#psa-chat-ticket-bar')) return;

    const bar = document.createElement('div');
    bar.id = 'psa-chat-ticket-bar';
    bar.style.cssText = 'padding:6px 12px;background:#f0fdfa;border-bottom:1px solid #ccfbf1;font-size:11.5px;display:flex;justify-content:space-between;align-items:center;';
    bar.innerHTML = '<span style="color:#132a2e;">Need order or artwork help?</span><a href="/helpdesk/tickets/new" style="color:#0f766e;font-weight:700;text-decoration:underline;">Open Ticket &rarr;</a>';

    const body = panel.querySelector('.psa-chat-body, .psa-chat-messages') || panel.children;
    if (body && body.parentNode) {
      body.parentNode.insertBefore(bar, body);
    }
  };

  injectTicketShortcut();
  setTimeout(injectTicketShortcut, 600);
});

frappe.ready(function () {
  if (window.location.pathname.startsWith('/helpdesk')) return;

  var addTicketBanner = function () {
    var box = document.querySelector('#promo-chat-window, #promo-chat-box, .promo-chat-window, #psa-chat-panel, .psa-chat-panel');
    if (!box || box.querySelector('#psa-chat-ticket-bar')) return;

    var bar = document.createElement('div');
    bar.id = 'psa-chat-ticket-bar';
    bar.style.cssText = 'padding:6px 12px;background:#f0fdfa;border-bottom:1px solid #ccfbf1;font-size:11px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;';
    bar.innerHTML = '<span style="color:#132a2e;">Order or artwork query?</span><a href="/helpdesk/tickets/new" style="color:#0f766e;font-weight:700;text-decoration:underline;">Open Ticket &rarr;</a>';

    var header = box.querySelector('.promo-chat-header, .psa-chat-header, [class*="chat-header"]');
    if (header && header.nextSibling) {
      box.insertBefore(bar, header.nextSibling);
    } else if (box.children.length > 1) {
      box.insertBefore(bar, box.children);
    } else {
      box.prepend(bar);
    }
  };

  addTicketBanner();
  var obs = new MutationObserver(addTicketBanner);
  obs.observe(document.body, { childList: true, subtree: true });
});
