/* ==========================================================================
   SHAWARMA STOP — SHOPPING CART, CHECKOUT MODAL & WHATSAPP ORDERING
   --------------------------------------------------------------------------
   This file contains ONLY the new ordering feature. All existing site
   behavior (menu rendering, gallery, filters, reveal animations, etc.)
   remains untouched in the inline <script> block in index.html.

   This script runs AFTER that inline script (it's included via
   <script src="script.js"> right before </body>), so it can freely use
   the `MENU` array and `grid` element that script already defines —
   classic (non-module) scripts on the same page share one global scope.

   Everything here is wrapped in an IIFE to avoid polluting globals,
   except a small public API exposed on `window.ShawarmaCart` so the
   existing "Add to Cart" click handler (in the inline script) can call
   into it.
   ========================================================================== */

(function () {
  'use strict';

  // ------------------------------------------------------------------------
  // CONFIG
  // ------------------------------------------------------------------------
  // TODO: replace with your real WhatsApp Business number.
  // Format: country code + number, digits only, no "+", no spaces.
  const WHATSAPP_NUMBER = '94712345678';
  const CURRENCY = 'Rs.';

  // ------------------------------------------------------------------------
  // CART STATE
  // Stored as a Map<itemId, {id, name, price, qty}> so lookups/updates are O(1)
  // while still preserving insertion order when we iterate it.
  // ------------------------------------------------------------------------
  const cart = new Map();

  function findMenuItem(id) {
    return MENU.find((m) => m.id === id);
  }

  function addItem(id) {
    const item = findMenuItem(id);
    if (!item) return;
    if (cart.has(id)) {
      cart.get(id).qty += 1;
    } else {
      cart.set(id, { id: item.id, name: item.name, price: item.price, qty: 1 });
    }
    renderAll();
  }

  function increaseQty(id) {
    if (!cart.has(id)) return;
    cart.get(id).qty += 1;
    renderAll();
  }

  function decreaseQty(id) {
    if (!cart.has(id)) return;
    const entry = cart.get(id);
    entry.qty -= 1;
    if (entry.qty <= 0) cart.delete(id);
    renderAll();
  }

  function removeItem(id) {
    cart.delete(id);
    renderAll();
  }

  function clearCart() {
    cart.clear();
    renderAll();
  }

  function getItems() {
    return Array.from(cart.values());
  }

  function getCount() {
    return getItems().reduce((sum, i) => sum + i.qty, 0);
  }

  function getGrandTotal() {
    return getItems().reduce((sum, i) => sum + i.qty * i.price, 0);
  }

  // Formats a number as e.g. "Rs.1,250.75" — keeps decimals, adds thousands separator.
  function money(amount) {
    return `${CURRENCY}${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // ------------------------------------------------------------------------
  // DOM REFERENCES
  // ------------------------------------------------------------------------
  const cartBtn = document.getElementById('cart-btn');
  const cartCountEl = document.getElementById('cart-count');

  const cartDrawer = document.getElementById('cart-drawer');
  const cartBackdrop = document.getElementById('cart-drawer-backdrop');
  const cartItemsEl = document.getElementById('cart-items');
  const cartEmptyEl = document.getElementById('cart-empty');
  const cartEmptyBrowseBtn = document.getElementById('cart-empty-browse');
  const cartFooterEl = document.getElementById('cart-footer');
  const cartSubtotalEl = document.getElementById('cart-subtotal');
  const cartGrandTotalEl = document.getElementById('cart-grand-total');
  const cartDrawerCloseBtn = document.getElementById('cart-drawer-close');
  const cartClearBtn = document.getElementById('cart-clear');
  const cartCheckoutBtn = document.getElementById('cart-checkout');

  const checkoutModal = document.getElementById('checkout-modal');
  const checkoutPanel = checkoutModal.querySelector('.co-panel');
  const checkoutCloseBtn = document.getElementById('checkout-close');
  const checkoutForm = document.getElementById('checkout-form');
  const checkoutSummaryEl = document.getElementById('checkout-summary');
  const checkoutTotalEl = document.getElementById('checkout-total');
  const checkoutView = document.getElementById('checkout-view');
  const checkoutSuccess = document.getElementById('checkout-success');
  const placeOrderBtn = document.getElementById('checkout-place-order');
  const btnIdle = document.getElementById('checkout-btn-idle');
  const btnLoading = document.getElementById('checkout-btn-loading');

  const nameInput = document.getElementById('co-name');
  const phoneInput = document.getElementById('co-phone');
  const addressInput = document.getElementById('co-address');
  const notesInput = document.getElementById('co-notes');

  // ------------------------------------------------------------------------
  // RENDERING
  // ------------------------------------------------------------------------

  function renderCartBadge() {
    const count = getCount();
    cartCountEl.textContent = count;
    cartCountEl.classList.toggle('hidden', count === 0);
    cartCountEl.classList.toggle('inline-flex', count > 0);
    // restart the CSS bump animation on every change
    cartCountEl.classList.remove('bump');
    void cartCountEl.offsetWidth;
    cartCountEl.classList.add('bump');
  }

  // Shared row markup used in BOTH the cart drawer and the checkout modal's
  // order summary, so quantity controls behave identically in both places.
  function cartRowTemplate(item) {
    return `
    <div class="cart-row flex items-center gap-3 bg-white border border-green-100 rounded-2xl p-3" data-id="${item.id}">
      <div class="flex-1 min-w-0">
        <p class="font-display font-bold text-green-700 text-sm truncate">${item.name}</p>
        <p class="text-xs text-ink/50">${money(item.price)} each</p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button type="button" class="qty-decrease w-7 h-7 rounded-full bg-green-50 hover:bg-green-100 text-green-700 font-bold flex items-center justify-center transition" aria-label="Decrease quantity of ${item.name}">−</button>
        <span class="w-5 text-center text-sm font-semibold">${item.qty}</span>
        <button type="button" class="qty-increase w-7 h-7 rounded-full bg-green-50 hover:bg-green-100 text-green-700 font-bold flex items-center justify-center transition" aria-label="Increase quantity of ${item.name}">+</button>
      </div>
      <div class="text-right w-20 shrink-0">
        <p class="text-sm font-bold text-brick">${money(item.price * item.qty)}</p>
        <button type="button" class="cart-remove text-[11px] text-ink/40 hover:text-brick transition" aria-label="Remove ${item.name} from cart">Remove</button>
      </div>
    </div>`;
  }

  function renderCartDrawer() {
    const items = getItems();
    const isEmpty = items.length === 0;

    cartItemsEl.innerHTML = items.map(cartRowTemplate).join('');
    cartItemsEl.classList.toggle('hidden', isEmpty);
    cartEmptyEl.classList.toggle('hidden', !isEmpty);
    cartEmptyEl.classList.toggle('flex', isEmpty);
    cartFooterEl.classList.toggle('hidden', isEmpty);

    const total = getGrandTotal();
    cartSubtotalEl.textContent = money(total);
    cartGrandTotalEl.textContent = money(total);
    cartCheckoutBtn.disabled = isEmpty;
  }

  function isCheckoutModalOpen() {
    return !checkoutModal.classList.contains('pointer-events-none');
  }

  function renderCheckoutSummary() {
    const items = getItems();
    checkoutSummaryEl.innerHTML = items.map(cartRowTemplate).join('');
    checkoutTotalEl.textContent = money(getGrandTotal());
  }

  function renderAll() {
    renderCartBadge();
    renderCartDrawer();
    if (isCheckoutModalOpen()) renderCheckoutSummary();
  }

  // ------------------------------------------------------------------------
  // CART DRAWER OPEN / CLOSE
  // ------------------------------------------------------------------------
  function openCartDrawer() {
    renderCartDrawer();
    cartBackdrop.classList.remove('opacity-0', 'pointer-events-none');
    cartDrawer.classList.remove('translate-x-full');
    document.body.style.overflow = 'hidden';
  }

  function closeCartDrawer() {
    cartBackdrop.classList.add('opacity-0', 'pointer-events-none');
    cartDrawer.classList.add('translate-x-full');
    if (!isCheckoutModalOpen()) document.body.style.overflow = '';
  }

  cartBtn.addEventListener('click', openCartDrawer);
  cartDrawerCloseBtn.addEventListener('click', closeCartDrawer);
  cartBackdrop.addEventListener('click', closeCartDrawer);

  cartEmptyBrowseBtn.addEventListener('click', () => {
    closeCartDrawer();
    document.getElementById('menu').scrollIntoView({ behavior: 'smooth' });
  });

  cartClearBtn.addEventListener('click', () => {
    if (getItems().length && confirm('Clear all items from your cart?')) {
      clearCart();
    }
  });

  // Delegated click handler shared by the cart drawer AND the checkout
  // modal's order summary — both render the same `.cart-row` markup.
  function onCartRowClick(e) {
    const row = e.target.closest('.cart-row');
    if (!row) return;
    const id = parseInt(row.dataset.id, 10);

    if (e.target.closest('.qty-increase')) increaseQty(id);
    else if (e.target.closest('.qty-decrease')) decreaseQty(id);
    else if (e.target.closest('.cart-remove')) removeItem(id);

    // If the cart just became empty while the checkout modal is open,
    // there's nothing left to check out — close it.
    if (isCheckoutModalOpen() && getItems().length === 0) {
      closeCheckoutModal();
    }
  }
  cartItemsEl.addEventListener('click', onCartRowClick);
  checkoutSummaryEl.addEventListener('click', onCartRowClick);

  // ------------------------------------------------------------------------
  // CHECKOUT MODAL OPEN / CLOSE
  // ------------------------------------------------------------------------
  function openCheckoutModal() {
    if (getItems().length === 0) return;
    closeCartDrawer();
    renderCheckoutSummary();
    checkoutModal.classList.remove('opacity-0', 'pointer-events-none');
    checkoutPanel.classList.remove('scale-95', 'opacity-0', 'translate-y-4');
    document.body.style.overflow = 'hidden';
  }

  function closeCheckoutModal() {
    checkoutModal.classList.add('opacity-0', 'pointer-events-none');
    checkoutPanel.classList.add('scale-95', 'opacity-0', 'translate-y-4');
    document.body.style.overflow = '';
    resetCheckoutView();
  }

  function resetCheckoutView() {
    checkoutView.classList.remove('hidden');
    checkoutSuccess.classList.add('hidden');
    checkoutSuccess.classList.remove('flex');
    setLoading(false);
    clearFieldErrors();
  }

  cartCheckoutBtn.addEventListener('click', openCheckoutModal);
  checkoutCloseBtn.addEventListener('click', closeCheckoutModal);
  checkoutModal.addEventListener('click', (e) => {
    if (e.target === checkoutModal) closeCheckoutModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (isCheckoutModalOpen()) closeCheckoutModal();
    else if (!cartDrawer.classList.contains('translate-x-full')) closeCartDrawer();
  });

  // ------------------------------------------------------------------------
  // VALIDATION
  // Sri Lankan mobile numbers: 07XXXXXXXX, +947XXXXXXXX, or 947XXXXXXXX
  // (spaces/dashes are stripped before testing).
  // ------------------------------------------------------------------------
  const LK_PHONE_REGEX = /^(?:\+94|94|0)?7\d{8}$/;

  function normalizePhone(raw) {
    return raw.replace(/[\s-]/g, '');
  }

  function showFieldError(input, message) {
    input.classList.remove('border-green-100');
    input.classList.add('border-brick');
    const msg = document.querySelector(`[data-error-for="${input.id}"]`);
    if (msg) {
      msg.textContent = message;
      msg.classList.remove('hidden');
    }
  }

  function clearFieldError(input) {
    input.classList.add('border-green-100');
    input.classList.remove('border-brick');
    const msg = document.querySelector(`[data-error-for="${input.id}"]`);
    if (msg) msg.classList.add('hidden');
  }

  function clearFieldErrors() {
    [nameInput, phoneInput, addressInput].forEach(clearFieldError);
  }

  // Clear a field's error as soon as the user starts fixing it.
  [nameInput, phoneInput, addressInput].forEach((input) => {
    input.addEventListener('input', () => clearFieldError(input));
  });

  function validateForm() {
    clearFieldErrors();
    let valid = true;
    let firstInvalid = null;

    if (!nameInput.value.trim()) {
      showFieldError(nameInput, 'Please enter your name.');
      valid = false;
      firstInvalid = firstInvalid || nameInput;
    }

    const phone = normalizePhone(phoneInput.value.trim());
    if (!phone) {
      showFieldError(phoneInput, 'Please enter your phone number.');
      valid = false;
      firstInvalid = firstInvalid || phoneInput;
    } else if (!LK_PHONE_REGEX.test(phone)) {
      showFieldError(phoneInput, 'Enter a valid Sri Lankan number, e.g. 0771234567.');
      valid = false;
      firstInvalid = firstInvalid || phoneInput;
    }

    if (!addressInput.value.trim()) {
      showFieldError(addressInput, 'Please enter your delivery address.');
      valid = false;
      firstInvalid = firstInvalid || addressInput;
    }

    if (firstInvalid) firstInvalid.focus();
    return valid;
  }

  // ------------------------------------------------------------------------
  // WHATSAPP MESSAGE
  // ------------------------------------------------------------------------
  function buildWhatsAppMessage() {
    const items = getItems();
    const orderLines = items
      .map((i) => `• ${i.name} x${i.qty}\n${money(i.price * i.qty)}`)
      .join('\n');
    const note = notesInput.value.trim();

    return [
      '🍽️ New Shawarma Stop Order',
      'Customer Name:',
      nameInput.value.trim(),
      'Phone:',
      normalizePhone(phoneInput.value.trim()),
      'Delivery Address:',
      addressInput.value.trim(),
      '--------------------------------',
      'Order Details',
      orderLines,
      '--------------------------------',
      'Total:',
      money(getGrandTotal()),
      'Note:',
      note || '—',
      'Thank you!',
    ].join('\n');
  }

  // ------------------------------------------------------------------------
  // PLACE ORDER FLOW
  // ------------------------------------------------------------------------
  function setLoading(isLoading) {
    placeOrderBtn.disabled = isLoading;
    btnIdle.classList.toggle('hidden', isLoading);
    btnLoading.classList.toggle('hidden', !isLoading);
    btnLoading.classList.toggle('inline-flex', isLoading);
  }

  function showSuccess() {
    checkoutView.classList.add('hidden');
    checkoutSuccess.classList.remove('hidden');
    checkoutSuccess.classList.add('flex');
  }

  checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    // Small delay so the loading state is actually visible — this also
    // gives the message-building "work" a perceptible moment, even though
    // it's fast, so the UX doesn't feel like a jump-cut.
    setTimeout(() => {
      const message = buildWhatsAppMessage();
      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

      setLoading(false);
      showSuccess();

      setTimeout(() => {
        window.open(url, '_blank');

        // Order handed off to WhatsApp — reset everything for next time.
        clearCart();
        closeCheckoutModal();
        checkoutForm.reset();
      }, 900);
    }, 700);
  });

  // ------------------------------------------------------------------------
  // PUBLIC API
  // Exposed so the existing "Add to Cart" click handler (in the inline
  // script in index.html) can add items without needing to know anything
  // about how the cart is implemented.
  // ------------------------------------------------------------------------
  window.ShawarmaCart = {
    addItem,
    increaseQty,
    decreaseQty,
    removeItem,
    clearCart,
    getItems,
    getCount,
    getGrandTotal,
  };

  // ------------------------------------------------------------------------
  // INIT
  // ------------------------------------------------------------------------
  renderAll();
})();
