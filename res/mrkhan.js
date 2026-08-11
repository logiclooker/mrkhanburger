/* =========================================================================
   MR. KHAN BURGER HOUSE — res/mrkhan.js
   Modular vanilla JS: menu loader, cart, checkout, WhatsApp integration,
   gallery lightbox, mobile menu, testimonials slider, scroll animations.
   ========================================================================= */

(function () {
  'use strict';

  /* ----------------------------------------------------------------------
     Restaurant configuration — single source of truth for contact details
     ---------------------------------------------------------------------- */
  const RESTAURANT = {
    name: 'Mr. Khan Burger House',
    whatsappNumber: '923169264990',
    whatsappLink: 'https://wa.me/923169264990'
  };

  /* ----------------------------------------------------------------------
     Cart state — persisted to LocalStorage so it survives page refreshes
     and carries across Home / Menu / About pages.
     ---------------------------------------------------------------------- */
  const CART_KEY = 'mrkhan_cart_v1';

  const Cart = {
    items: [],

    load() {
      try {
        const raw = localStorage.getItem(CART_KEY);
        this.items = raw ? JSON.parse(raw) : [];
      } catch (e) {
        this.items = [];
      }
    },

    save() {
      try {
        localStorage.setItem(CART_KEY, JSON.stringify(this.items));
      } catch (e) {
        /* Storage unavailable — cart will still work for this session */
      }
    },

    add(item) {
      const existing = this.items.find((i) => i.id === item.id);
      if (existing) {
        existing.qty += 1;
      } else {
        this.items.push({ id: item.id, name: item.name, price: item.price, img: item.img, qty: 1 });
      }
      this.save();
    },

    changeQty(id, delta) {
      const idx = this.items.findIndex((i) => i.id === id);
      if (idx === -1) return;
      this.items[idx].qty += delta;
      if (this.items[idx].qty <= 0) this.items.splice(idx, 1);
      this.save();
    },

    remove(id) {
      this.items = this.items.filter((i) => i.id !== id);
      this.save();
    },

    clear() {
      this.items = [];
      this.save();
    },

    count() {
      return this.items.reduce((sum, i) => sum + i.qty, 0);
    },

    subtotal() {
      return this.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    }
  };

  Cart.load();

  /* ----------------------------------------------------------------------
     Toast notifications
     ---------------------------------------------------------------------- */
  function showToast(title, message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.innerHTML =
      '<div>' +
      '<p style="font-weight:600;font-size:0.95rem;margin-bottom:0.2rem;color:var(--text)">' + title + '</p>' +
      '<p style="font-size:0.85rem;color:var(--text-muted)">' + message + '</p>' +
      '</div>';
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  /* ----------------------------------------------------------------------
     Cart badge (present in the nav on every page)
     ---------------------------------------------------------------------- */
  function updateCartBadge() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;
    badge.textContent = Cart.count();
    badge.style.transform = 'scale(1.4)';
    setTimeout(() => { badge.style.transform = 'scale(1)'; }, 200);
  }

  /* ----------------------------------------------------------------------
     Cart sidebar rendering (present on every page)
     ---------------------------------------------------------------------- */
  function renderCartSidebar() {
    const itemsEl = document.getElementById('cart-items-list');
    const subtotalEl = document.getElementById('cart-total');
    const footerEl = document.getElementById('cart-footer');
    if (!itemsEl || !subtotalEl || !footerEl) return;

    if (Cart.items.length === 0) {
      itemsEl.innerHTML =
        '<div class="cart-empty">' +
        '<i class="fa-solid fa-bag-shopping" aria-hidden="true"></i>' +
        '<p>Your cart is empty</p>' +
        '<p style="font-size:0.85rem;">Add items from the menu to get started.</p>' +
        '<a href="menu.html" class="btn btn-primary btn-sm" style="margin-top:0.5rem;">Browse Menu</a>' +
        '</div>';
      footerEl.style.display = 'none';
      return;
    }

    footerEl.style.display = 'block';
    itemsEl.innerHTML = Cart.items.map((item) => (
      '<div class="cart-item">' +
        '<img class="cart-item-img" src="' + item.img + '" alt="" loading="lazy">' +
        '<div class="cart-item-info">' +
          '<div class="cart-item-name">' + item.name + '</div>' +
          '<div class="cart-item-price">Rs ' + (item.price * item.qty).toLocaleString() + '</div>' +
          '<button class="cart-remove" data-remove-id="' + item.id + '">Remove</button>' +
        '</div>' +
        '<div class="cart-qty">' +
          '<button class="qty-btn" data-qty-id="' + item.id + '" data-delta="-1" aria-label="Decrease quantity">−</button>' +
          '<span class="qty-num">' + item.qty + '</span>' +
          '<button class="qty-btn" data-qty-id="' + item.id + '" data-delta="1" aria-label="Increase quantity">+</button>' +
        '</div>' +
      '</div>'
    )).join('');

    subtotalEl.textContent = 'Rs ' + Cart.subtotal().toLocaleString();

    // Bind qty / remove buttons (re-bound each render since markup is rebuilt)
    itemsEl.querySelectorAll('[data-qty-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        Cart.changeQty(Number(btn.getAttribute('data-qty-id')), Number(btn.getAttribute('data-delta')));
        updateCartBadge();
        renderCartSidebar();
      });
    });
    itemsEl.querySelectorAll('[data-remove-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        Cart.remove(Number(btn.getAttribute('data-remove-id')));
        updateCartBadge();
        renderCartSidebar();
      });
    });
  }

  function openCart() {
    const overlay = document.getElementById('cart-overlay');
    const sidebar = document.getElementById('cart-sidebar');
    if (!overlay || !sidebar) return;
    overlay.classList.add('open');
    sidebar.classList.add('open');
    renderCartSidebar();
  }

  function closeCart() {
    const overlay = document.getElementById('cart-overlay');
    const sidebar = document.getElementById('cart-sidebar');
    if (!overlay || !sidebar) return;
    overlay.classList.remove('open');
    sidebar.classList.remove('open');
  }

  window.addToCartById = function (id, menuData) {
    const item = menuData.find((m) => m.id === id);
    if (!item) return;
    Cart.add(item);
    updateCartBadge();
    showToast('Cart Updated', item.name + ' added to cart!');
  };

  /* ----------------------------------------------------------------------
     Checkout modal + WhatsApp order message generation
     ---------------------------------------------------------------------- */
  function openCheckout() {
    if (Cart.items.length === 0) {
      showToast('Cart Empty', 'Add something delicious before checking out!');
      return;
    }
    const summaryEl = document.getElementById('checkout-summary-items');
    if (!summaryEl) return;
    const subtotal = Cart.subtotal();
    summaryEl.innerHTML = Cart.items.map((item) => (
      '<div class="summary-item">' +
        '<span class="item-name">' + item.name + ' <span style="color:var(--text-muted);font-weight:400;">x' + item.qty + '</span></span>' +
        '<span>Rs ' + (item.price * item.qty).toLocaleString() + '</span>' +
      '</div>'
    )).join('') +
      '<div class="summary-total"><span class="total-label">Total</span><span class="total-amount">Rs ' + subtotal.toLocaleString() + '</span></div>';

    ['co-name', 'co-phone', 'co-address'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('input-error');
    });

    document.getElementById('checkout-form-view').style.display = 'block';
    document.getElementById('checkout-confirm-view').classList.remove('show');
    document.getElementById('checkout-overlay').classList.add('open');
  }

  function closeCheckout() {
    const overlay = document.getElementById('checkout-overlay');
    if (overlay) overlay.classList.remove('open');
  }

  function buildWhatsAppMessage({ name, phone, address, notes }) {
    const lines = [];
    lines.push(RESTAURANT.name + ' Order');
    lines.push('');
    lines.push('Customer:');
    lines.push(name);
    lines.push('');
    lines.push('Phone:');
    lines.push(phone);
    lines.push('');
    lines.push('Address:');
    lines.push(address + ', Karachi');
    lines.push('');
    lines.push('Items');
    lines.push('');
    Cart.items.forEach((item) => {
      lines.push(item.qty + ' x ' + item.name + ' = Rs.' + (item.price * item.qty));
    });
    lines.push('');
    lines.push('----------------------------');
    lines.push('');
    lines.push('Total = Rs.' + Cart.subtotal());
    if (notes) {
      lines.push('');
      lines.push('Notes:');
      lines.push(notes);
    }
    lines.push('');
    lines.push('Payment');
    lines.push('Cash on Delivery');
    return lines.join('\n');
  }

  function placeOrder() {
    const nameEl = document.getElementById('co-name');
    const phoneEl = document.getElementById('co-phone');
    const addressEl = document.getElementById('co-address');
    const notesEl = document.getElementById('co-notes');
    if (!nameEl || !phoneEl || !addressEl) return;

    const name = nameEl.value.trim();
    const phone = phoneEl.value.trim();
    const address = addressEl.value.trim();
    const notes = notesEl ? notesEl.value.trim() : '';

    let valid = true;
    [[nameEl, name], [phoneEl, phone], [addressEl, address]].forEach(([el, val]) => {
      if (!val) { el.classList.add('input-error'); valid = false; }
      else el.classList.remove('input-error');
    });
    if (!valid) { showToast('Missing Details', 'Please fill in all required fields.'); return; }

    const message = buildWhatsAppMessage({ name, phone, address, notes });
    const encoded = encodeURIComponent(message);
    const waUrl = RESTAURANT.whatsappLink + '?text=' + encoded;

    // Show confirmation view inside the modal
    const subtotal = Cart.subtotal();
    document.getElementById('confirm-details-box').innerHTML =
      '<div class="confirm-detail-row"><i class="fa-solid fa-user" aria-hidden="true"></i><div><span>Name: </span><strong>' + name + '</strong></div></div>' +
      '<div class="confirm-detail-row"><i class="fa-solid fa-phone" aria-hidden="true"></i><div><span>Phone: </span><strong>' + phone + '</strong></div></div>' +
      '<div class="confirm-detail-row"><i class="fa-solid fa-location-dot" aria-hidden="true"></i><div><span>Address: </span><strong>' + address + ', Karachi</strong></div></div>' +
      '<div class="confirm-detail-row"><i class="fa-solid fa-wallet" aria-hidden="true"></i><div><span>Payment: </span><strong>Cash on Delivery</strong></div></div>' +
      '<div class="confirm-detail-row"><i class="fa-solid fa-receipt" aria-hidden="true"></i><div><span>Total: </span><strong style="color:var(--primary)">Rs ' + subtotal.toLocaleString() + '</strong></div></div>' +
      (notes ? '<div class="confirm-detail-row"><i class="fa-solid fa-note-sticky" aria-hidden="true"></i><div><span>Notes: </span><strong>' + notes + '</strong></div></div>' : '');

    document.getElementById('checkout-form-view').style.display = 'none';
    document.getElementById('checkout-confirm-view').classList.add('show');
    document.getElementById('checkout-modal').scrollTop = 0;

    // Open WhatsApp with the pre-filled order message
    window.open(waUrl, '_blank');
  }

  /* ----------------------------------------------------------------------
     Menu loader (menu.html) — fetches data/menu.json and renders cards
     ---------------------------------------------------------------------- */
  function initMenuPage() {
    const menuGrid = document.getElementById('menu-grid');
    if (!menuGrid) return; // Not on the menu page

    const categoryTabsWrap = document.getElementById('category-tabs');
    const searchInput = document.getElementById('search-input');

    let menuData = [];
    let categories = [];
    let currentCategory = 'all';
    let searchQuery = '';

    function renderCategoryTabs() {
      if (!categoryTabsWrap) return;
      let html = '<button class="category-btn active" data-category="all">All Items</button>';
      html += categories.map((c) => '<button class="category-btn" data-category="' + c.id + '">' + c.label + '</button>').join('');
      categoryTabsWrap.innerHTML = html;
      categoryTabsWrap.querySelectorAll('.category-btn').forEach((tab) => {
        tab.addEventListener('click', () => {
          categoryTabsWrap.querySelectorAll('.category-btn').forEach((t) => t.classList.remove('active'));
          tab.classList.add('active');
          currentCategory = tab.getAttribute('data-category');
          renderMenu();
        });
      });
    }

    function categoryLabel(id) {
      const c = categories.find((x) => x.id === id);
      return c ? c.label : id;
    }

    function renderMenu() {
      menuGrid.innerHTML = '';
      const filtered = menuData.filter((item) => {
        const matchesCategory = currentCategory === 'all' || item.category === currentCategory;
        const q = searchQuery.toLowerCase();
        const matchesSearch = item.name.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q);
        return matchesCategory && matchesSearch;
      });

      if (filtered.length === 0) {
        menuGrid.innerHTML =
          '<div class="no-results">' +
          '<h3>No items found</h3>' +
          '<p>Try adjusting your search or category filter.</p>' +
          '</div>';
        return;
      }

      filtered.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'food-card fade-up visible';
        card.style.transitionDelay = (index % 8) * 0.04 + 's';
        card.innerHTML =
          '<div class="food-image-container">' +
            '<span class="food-category-tag">' + categoryLabel(item.category) + '</span>' +
            '<img src="' + item.img + '" alt="' + item.name + '" loading="lazy" onerror="this.src=\'https://placehold.co/600x400/171717/f0a52c?text=Mr+Khan\'">' +
          '</div>' +
          '<div class="food-info">' +
            '<h3>' + item.name + '</h3>' +
            '<p>' + item.desc + '</p>' +
            '<div class="card-footer">' +
              '<span class="price">Rs ' + item.price.toLocaleString() + '</span>' +
              '<button class="add-to-cart" data-add-id="' + item.id + '" aria-label="Add ' + item.name + ' to cart"><i class="fa-solid fa-plus" aria-hidden="true"></i> Add</button>' +
            '</div>' +
          '</div>';
        menuGrid.appendChild(card);
      });

      menuGrid.querySelectorAll('[data-add-id]').forEach((btn) => {
        btn.addEventListener('click', () => window.addToCartById(Number(btn.getAttribute('data-add-id')), menuData));
      });
    }

    fetch('data/menu.json')
      .then((res) => res.json())
      .then((data) => {
        menuData = data.items;
        categories = data.categories;
        renderCategoryTabs();
        renderMenu();
      })
      .catch(() => {
        menuGrid.innerHTML = '<div class="no-results"><h3>Unable to load the menu</h3><p>Please refresh the page or contact us on WhatsApp to order.</p></div>';
      });

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderMenu();
      });
    }
  }

  /* ----------------------------------------------------------------------
     Mobile menu
     ---------------------------------------------------------------------- */
  function initMobileMenu() {
    const toggle = document.querySelector('.mobile-toggle');
    const menu = document.querySelector('.mobile-menu');
    const overlay = document.querySelector('.mobile-overlay');
    const closeBtn = document.querySelector('.mobile-menu-close');
    if (!toggle || !menu || !overlay) return;

    function open() { menu.classList.add('open'); overlay.classList.add('open'); }
    function close() { menu.classList.remove('open'); overlay.classList.remove('open'); }

    toggle.addEventListener('click', open);
    overlay.addEventListener('click', close);
    if (closeBtn) closeBtn.addEventListener('click', close);
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
  }

  /* ----------------------------------------------------------------------
     Navbar scroll effect
     ---------------------------------------------------------------------- */
  function initNavbarScroll() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        navbar.style.background = 'rgba(10,10,10,0.97)';
        navbar.style.boxShadow = '0 4px 30px rgba(0,0,0,0.5)';
      } else {
        navbar.style.background = 'rgba(10,10,10,0.92)';
        navbar.style.boxShadow = 'none';
      }
    });
  }

  /* ----------------------------------------------------------------------
     Scroll reveal animations
     ---------------------------------------------------------------------- */
  function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.fade-up').forEach((el) => observer.observe(el));

    // Reveal hero elements immediately on load
    setTimeout(() => {
      document.querySelectorAll('.hero .fade-up, .page-hero .fade-up, .menu-hero .fade-up').forEach((el) => {
        el.classList.add('visible');
      });
    }, 50);
  }

  /* ----------------------------------------------------------------------
     Testimonials slider (index.html)
     ---------------------------------------------------------------------- */
  function initTestimonialSlider() {
    const track = document.getElementById('testimonial-track');
    if (!track) return;
    const slides = track.querySelectorAll('.testimonial-slide');
    const dotsWrap = document.getElementById('testimonial-dots');
    const prevBtn = document.getElementById('testimonial-prev');
    const nextBtn = document.getElementById('testimonial-next');
    let index = 0;
    let autoplayId = null;

    function renderDots() {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'testimonial-dot' + (i === index ? ' active' : '');
        dot.setAttribute('aria-label', 'Go to testimonial ' + (i + 1));
        dot.addEventListener('click', () => goTo(i));
        dotsWrap.appendChild(dot);
      });
    }

    function goTo(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = 'translateX(-' + (index * 100) + '%)';
      renderDots();
    }

    function next() { goTo(index + 1); }
    function prev() { goTo(index - 1); }

    if (nextBtn) nextBtn.addEventListener('click', () => { next(); restartAutoplay(); });
    if (prevBtn) prevBtn.addEventListener('click', () => { prev(); restartAutoplay(); });

    function restartAutoplay() {
      if (autoplayId) clearInterval(autoplayId);
      autoplayId = setInterval(next, 6000);
    }

    renderDots();
    restartAutoplay();
  }

  /* ----------------------------------------------------------------------
     Gallery lightbox (about.html)
     ---------------------------------------------------------------------- */
  function initGalleryLightbox() {
    const items = document.querySelectorAll('.gallery-item');
    const lightbox = document.getElementById('lightbox');
    if (!items.length || !lightbox) return;

    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const closeBtn = document.getElementById('lightbox-close');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    let current = 0;

    function open(i) {
      current = i;
      const img = items[current].querySelector('img');
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightboxCaption.textContent = img.alt;
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
    }

    function nav(delta) {
      current = (current + delta + items.length) % items.length;
      open(current);
    }

    items.forEach((item, i) => item.addEventListener('click', () => open(i)));
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (prevBtn) prevBtn.addEventListener('click', () => nav(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => nav(1));
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') nav(-1);
      if (e.key === 'ArrowRight') nav(1);
    });
  }

  /* ----------------------------------------------------------------------
     Wire up cart / checkout controls that exist on every page
     ---------------------------------------------------------------------- */
  function initCartControls() {
    document.querySelectorAll('[data-open-cart]').forEach((el) => el.addEventListener('click', openCart));
    document.querySelectorAll('[data-close-cart]').forEach((el) => el.addEventListener('click', closeCart));
    document.querySelectorAll('[data-cart-overlay]').forEach((el) => el.addEventListener('click', closeCart));
    document.querySelectorAll('[data-open-checkout]').forEach((el) => el.addEventListener('click', openCheckout));
    document.querySelectorAll('[data-close-checkout]').forEach((el) => el.addEventListener('click', closeCheckout));
    document.querySelectorAll('[data-clear-cart]').forEach((el) => el.addEventListener('click', () => {
      Cart.clear();
      updateCartBadge();
      renderCartSidebar();
    }));
    document.querySelectorAll('[data-place-order]').forEach((el) => el.addEventListener('click', placeOrder));

    const checkoutOverlay = document.getElementById('checkout-overlay');
    if (checkoutOverlay) {
      checkoutOverlay.addEventListener('click', (e) => { if (e.target === checkoutOverlay) closeCheckout(); });
    }
    const doneBtn = document.getElementById('checkout-done-btn');
    if (doneBtn) {
      doneBtn.addEventListener('click', () => {
        closeCheckout();
        Cart.clear();
        updateCartBadge();
        renderCartSidebar();
      });
    }

    updateCartBadge();
  }

  /* ----------------------------------------------------------------------
     About Page Slideshow
     ---------------------------------------------------------------------- */
  function initAboutSlideshow() {
    const slides = document.querySelectorAll('.slide');
    const dots   = document.querySelectorAll('.slide-dot');
    const prev   = document.getElementById('slide-prev');
    const next   = document.getElementById('slide-next');
    if (!slides.length) return;

    let current = 0;
    let timer;

    function goTo(index) {
      slides[current].classList.remove('active');
      dots[current] && dots[current].classList.remove('active');
      current = (index + slides.length) % slides.length;
      slides[current].classList.add('active');
      dots[current] && dots[current].classList.add('active');
    }

    function startAuto() {
      timer = setInterval(() => goTo(current + 1), 2000);
    }

    function stopAuto() {
      clearInterval(timer);
    }

    prev && prev.addEventListener('click', () => { stopAuto(); goTo(current - 1); startAuto(); });
    next && next.addEventListener('click', () => { stopAuto(); goTo(current + 1); startAuto(); });

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        stopAuto();
        goTo(parseInt(dot.dataset.index, 10));
        startAuto();
      });
    });

    const wrap = document.getElementById('about-slideshow');
    wrap && wrap.addEventListener('mouseenter', stopAuto);
    wrap && wrap.addEventListener('mouseleave', startAuto);

    startAuto();
  }

  /* ----------------------------------------------------------------------
     Initialization
     ---------------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initCartControls();
    initMobileMenu();
    initNavbarScroll();
    initMenuPage();
    initTestimonialSlider();
    initGalleryLightbox();
    initScrollAnimations();
    initAboutSlideshow();
  });
})();
