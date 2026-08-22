document.addEventListener('DOMContentLoaded', () => {
  // Ensure page reloads start at top unless an explicit hash section was selected
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#events') {
    window.scrollTo(0, 0);
    if (window.location.hash === '#events') {
      history.replaceState(null, null, window.location.pathname);
    }
  }

  // Update Copyright Year
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Logo Click -> Smooth Scroll to Top
  const brandLogo = document.querySelector('.brand');
  if (brandLogo) {
    brandLogo.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Mobile Navigation Toggle
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      navLinks.classList.toggle('open');
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        navLinks.classList.remove('open');
      });
    });
  }

  // Active Link Scroll Highlight
  const sections = document.querySelectorAll('section[id]');
  const links = document.querySelectorAll('.nav-links a');

  if (sections.length > 0 && links.length > 0) {
    window.addEventListener('scroll', () => {
      let currentSectionId = '';

      sections.forEach((section) => {
        const sectionTop = section.offsetTop - 150;
        if (window.scrollY >= sectionTop) {
          currentSectionId = section.getAttribute('id');
        }
      });

      links.forEach((link) => {
        link.classList.remove('active');
        if (currentSectionId && link.getAttribute('href') === `#${currentSectionId}`) {
          link.classList.add('active');
        }
      });
    });
  }

  // Photo Carousel Controls
  const slides = Array.from(document.querySelectorAll('.slide'));
  const nextBtn = document.querySelector('.next');
  const prevBtn = document.querySelector('.prev');

  if (slides.length > 0) {
    let currentIndex = 0;

    function showSlide(index) {
      slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % slides.length;
        showSlide(currentIndex);
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
        showSlide(currentIndex);
      });
    }

    setInterval(() => {
      currentIndex = (currentIndex + 1) % slides.length;
      showSlide(currentIndex);
    }, 5000);

    // Audio Toggle Controller (Pure Audio Track Playback)
    const audioBtn = document.getElementById('carousel-audio-btn');
    const audioEl = document.getElementById('carousel-audio');
    let isPlaying = false;
    let audioCtx = null;
    let currentBufferSource = null;

    async function playAudioBufferFallback(url) {
      try {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }
        stopAudioBufferFallback();

        const res = await fetch(url);
        if (!res.ok) return false;
        const arrayBuf = await res.arrayBuffer();
        const decodedData = await audioCtx.decodeAudioData(arrayBuf);

        const source = audioCtx.createBufferSource();
        source.buffer = decodedData;
        source.loop = true;

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.85, audioCtx.currentTime);

        source.connect(gain);
        gain.connect(audioCtx.destination);
        source.start(0);
        currentBufferSource = source;
        return true;
      } catch (err) {
        console.warn('Web Audio buffer decode error:', err);
        return false;
      }
    }

    function stopAudioBufferFallback() {
      if (currentBufferSource) {
        try { currentBufferSource.stop(); } catch(e){}
        currentBufferSource = null;
      }
    }

    if (audioEl) {
      audioEl.volume = 0.85;
    }

    if (audioBtn) {
      audioBtn.addEventListener('click', async () => {
        if (!audioEl) return;
        const iconSpan = audioBtn.querySelector('.audio-icon');
        const textSpan = audioBtn.querySelector('.audio-text');

        if (!isPlaying) {
          isPlaying = true;
          audioBtn.classList.add('playing');
          if (iconSpan) iconSpan.textContent = '🔊';
          if (textSpan) textSpan.textContent = 'Playing...';

          let played = false;
          if (siteContent.carousel && siteContent.carousel.audioUrl) {
            const rawUrl = siteContent.carousel.audioUrl;
            const formattedUrl = rawUrl.startsWith('/') || rawUrl.startsWith('http') ? rawUrl : '/' + rawUrl;

            if (!audioEl.src.endsWith(formattedUrl)) {
              audioEl.src = formattedUrl;
              audioEl.load();
            }

            try {
              await audioEl.play();
              played = true;
            } catch (err) {
              console.warn('Native audio play error, attempting Web Audio buffer decode:', err);
              played = await playAudioBufferFallback(formattedUrl);
            }
          }

          if (played) {
            if (iconSpan) iconSpan.textContent = '🔊';
            if (textSpan) textSpan.textContent = 'Sound: On';
          } else {
            isPlaying = false;
            audioBtn.classList.remove('playing');
            if (iconSpan) iconSpan.textContent = '🔈';
            if (textSpan) textSpan.textContent = 'Sound: Off';
            alert('Unable to play audio. Please re-upload your audio track in the CMS.');
          }
        } else {
          isPlaying = false;
          audioBtn.classList.remove('playing');
          if (iconSpan) iconSpan.textContent = '🔈';
          if (textSpan) textSpan.textContent = 'Sound: Off';

          if (audioEl) audioEl.pause();
          stopAudioBufferFallback();
        }
      });
    }
  }

  /* ==========================================================================
     JCAL CMS ADMIN GUI MANAGEMENT SYSTEM & AUTHENTICATION
     ========================================================================== */

  let siteContent = {
    events: [],
    services: {},
    giving: {}
  };

  const adminPortalBtn = document.getElementById('admin-portal-btn');
  const loginModal = document.getElementById('admin-login-modal');
  const closeLoginModalBtn = document.getElementById('close-login-modal');
  const loginForm = document.getElementById('admin-login-form');
  const loginErrorAlert = document.getElementById('login-error-alert');

  const dashboardOverlay = document.getElementById('admin-dashboard-overlay');
  const logoutBtn = document.getElementById('admin-logout-btn');
  const viewLiveSiteBtn = document.getElementById('view-live-site-btn');
  const currentAdminUser = document.getElementById('current-admin-user');
  const dashStatusAlert = document.getElementById('dash-status-alert');

  // Tabs & Panels
  const dashTabs = document.querySelectorAll('.dash-tab');
  const dashPanels = document.querySelectorAll('.dash-panel');

  // Forms & Inputs
  const eventEditFormBox = document.getElementById('event-edit-form-box');
  const eventEditTitle = document.getElementById('event-edit-title');
  const eventEditorForm = document.getElementById('event-editor-form');
  const addNewEventBtn = document.getElementById('add-new-event-btn');
  const cancelEventBtn = document.getElementById('cancel-event-btn');
  const adminEventsList = document.getElementById('admin-events-list');

  const servicesForm = document.getElementById('admin-services-form');
  const givingForm = document.getElementById('admin-giving-form');
  const passwordForm = document.getElementById('admin-password-form');

  // Helper: Get Auth Token
  function getToken() {
    return localStorage.getItem('jcal_admin_token');
  }

  const adminDock = document.getElementById('admin-floating-dock');
  const dockOpenBtn = document.getElementById('dock-open-dash-btn');
  const dockLogoutBtn = document.getElementById('dock-logout-btn');

  function setToken(token) {
    if (token) {
      localStorage.setItem('jcal_admin_token', token);
      if (adminPortalBtn) adminPortalBtn.textContent = 'Dashboard';
      if (adminDock && dashboardOverlay && dashboardOverlay.style.display !== 'grid') {
        adminDock.style.display = 'flex';
      }
    } else {
      localStorage.removeItem('jcal_admin_token');
      if (adminPortalBtn) adminPortalBtn.textContent = 'Portal';
      if (adminDock) adminDock.style.display = 'none';
    }
  }

  // Check auth state on boot
  async function checkAuthStatus() {
    const token = getToken();
    if (!token) {
      setToken(null);
      return false;
    }
    try {
      const res = await fetch('/api/check-auth', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.authenticated) {
        setToken(token);
        
        // Auto-open CMS dashboard if hash === '#admin' or sessionStorage 'jcal_cms_active' is true
        if (window.location.hash === '#admin' || sessionStorage.getItem('jcal_cms_active') === 'true') {
          sessionStorage.setItem('jcal_cms_active', 'true');
          if (dashboardOverlay) dashboardOverlay.style.display = 'flex';
          if (adminDock) adminDock.style.display = 'none';
        }
        return true;
      } else {
        setToken(null);
        sessionStorage.removeItem('jcal_cms_active');
        return false;
      }
    } catch (err) {
      console.error('Auth check error:', err);
      setToken(null);
      return false;
    }
  }

  // Listen for hash changes (e.g., navigating back to index.html#admin)
  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#admin') {
      const token = getToken();
      if (token && dashboardOverlay) {
        sessionStorage.setItem('jcal_cms_active', 'true');
        dashboardOverlay.style.display = 'flex';
        if (adminDock) adminDock.style.display = 'none';
      } else if (adminModal) {
        adminModal.style.display = 'flex';
      }
    }
  });

  // Fetch Public Content & Update DOM
  async function fetchSiteContent() {
    try {
      const res = await fetch('/api/content');
      if (res.ok) {
        siteContent = await res.json();
        renderPublicContent();
        renderAdminDashboard();
      }
    } catch (err) {
      console.error('Error fetching site content:', err);
    }
  }

  // Render Dynamic Content on Homepage
  function renderPublicContent() {
    // 1. Render Events in .event-list
    const eventsContainer = document.querySelector('#events .event-list') || document.querySelector('#events .cards');
    if (eventsContainer && siteContent.events && siteContent.events.length > 0) {
      eventsContainer.innerHTML = siteContent.events.map(evt => `
        <article>
          <span>${evt.tag || 'EVENT'}</span>
          <div>
            <h3>${evt.title}</h3>
            <p>${evt.description}${evt.time ? ' • ' + evt.time : ''}</p>
          </div>
        </article>
      `).join('');
    }

    // 2. Render Schedule & Announcement in Gather With Us card
    const heroCard = document.querySelector('.hero-card');
    if (heroCard && siteContent.services) {
      const pElements = heroCard.querySelectorAll('p');
      if (pElements.length >= 2) {
        if (siteContent.services.sunday) {
          pElements[0].innerHTML = `<strong>Sunday Worship:</strong> ${siteContent.services.sunday}`;
        }
        if (siteContent.services.wednesday) {
          pElements[1].innerHTML = `<strong>Bible Study:</strong> ${siteContent.services.wednesday}`;
        }
      }
    }

    // Render Floating Glassmorphic Announcement Modal & Hero Notice
    const noticeModal = document.getElementById('announcement-modal');
    const noticeBodyEl = document.getElementById('notice-modal-body');
    const noticeDismissBtn = document.getElementById('notice-dismiss-btn');
    const announceHeroEl = document.getElementById('hero-announcement');

    if (siteContent.services && siteContent.services.announcement !== undefined) {
      const text = siteContent.services.announcement.trim();
      const isActive = siteContent.services.announcementActive !== false;

      if (text && isActive && !window.noticeDismissed) {
        if (noticeBodyEl) noticeBodyEl.textContent = text;
        if (noticeModal) noticeModal.style.display = 'flex';
      } else {
        if (noticeModal && !window.noticeDismissed) noticeModal.style.display = 'none';
      }

      if (announceHeroEl) {
        if (text) {
          announceHeroEl.textContent = text;
          if (announceHeroEl.closest('.info-item')) announceHeroEl.closest('.info-item').style.display = 'flex';
        } else {
          if (announceHeroEl.closest('.info-item')) announceHeroEl.closest('.info-item').style.display = 'none';
        }
      }
    }

    if (noticeDismissBtn && noticeModal) {
      noticeDismissBtn.onclick = () => {
        window.noticeDismissed = true;
        noticeModal.style.display = 'none';
      };
      noticeModal.onclick = (e) => {
        if (e.target === noticeModal) {
          window.noticeDismissed = true;
          noticeModal.style.display = 'none';
        }
      };
    }

    // 3. Render Giving Info
    if (siteContent.giving) {
      const cashAppEl = document.querySelector('.cashapp-handle');
      const cashAppBtn = document.querySelector('.cashapp-btn');
      if (cashAppEl && siteContent.giving.cashapp) {
        cashAppEl.textContent = siteContent.giving.cashapp;
      }
      if (cashAppBtn && siteContent.giving.cashapp) {
        const cleanTag = siteContent.giving.cashapp.replace('$', '');
        cashAppBtn.href = `https://cash.app/$${cleanTag}`;
      }
    }

    // 4. Render Dynamic Carousel & Audio URL
    const audioEl = document.getElementById('carousel-audio');
    if (audioEl && siteContent.carousel && siteContent.carousel.audioUrl) {
      const formattedUrl = siteContent.carousel.audioUrl.startsWith('/') || siteContent.carousel.audioUrl.startsWith('http')
        ? siteContent.carousel.audioUrl
        : '/' + siteContent.carousel.audioUrl;

      if (!audioEl.src.endsWith(formattedUrl)) {
        audioEl.src = formattedUrl;
        audioEl.load();
      }
    }

    const carouselTrack = document.querySelector('.carousel-track');
    if (carouselTrack && siteContent.carousel && siteContent.carousel.slides && siteContent.carousel.slides.length > 0) {
      carouselTrack.innerHTML = siteContent.carousel.slides.map((s, index) => {
        const badgeText = s.badge || 'MINISTRY';
        const badgeClass = 'tag-' + badgeText.toUpperCase().replace(/ /g, '-');
        return `
          <div class="slide ${index === 0 ? 'active' : ''}">
            <div class="slide-bg" style="background-image: url('${s.image}');"></div>
            <img class="slide-img" src="${s.image}" alt="${s.title}" />
            <div class="slide-caption"><span class="slide-badge ${badgeClass}">${badgeText}</span> ${s.title}</div>
          </div>
        `;
      }).join('');
      // Re-initialize slides reference
      initCarouselControls();
    }
  }

  let carouselAutoTimer = null;

  function initCarouselControls() {
    const slides = Array.from(document.querySelectorAll('.slide'));
    if (slides.length === 0) return;
    let currentIndex = 0;
    const nextBtn = document.querySelector('.next');
    const prevBtn = document.querySelector('.prev');
    const container = document.querySelector('.carousel-container') || document.querySelector('.carousel');

    function showSlide(index) {
      slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
      });
    }

    function startTimer() {
      if (carouselAutoTimer) clearInterval(carouselAutoTimer);
      carouselAutoTimer = setInterval(() => {
        currentIndex = (currentIndex + 1) % slides.length;
        showSlide(currentIndex);
      }, 4500);
    }

    function stopTimer() {
      if (carouselAutoTimer) {
        clearInterval(carouselAutoTimer);
        carouselAutoTimer = null;
      }
    }

    if (nextBtn) {
      nextBtn.onclick = () => {
        currentIndex = (currentIndex + 1) % slides.length;
        showSlide(currentIndex);
        startTimer();
      };
    }
    if (prevBtn) {
      prevBtn.onclick = () => {
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
        showSlide(currentIndex);
        startTimer();
      };
    }

    if (container) {
      container.onmouseenter = () => stopTimer();
      container.onmouseleave = () => startTimer();
    }

    startTimer();
  }

  // Render Admin Dashboard Data
  function renderAdminDashboard() {
    if (!adminEventsList) return;

    // Render Events in Admin Panel
    if (siteContent.events && siteContent.events.length > 0) {
      adminEventsList.innerHTML = siteContent.events.map(evt => `
        <div class="admin-event-card">
          <div class="admin-event-info">
            <strong>[${evt.tag}] ${evt.title} — ${evt.time}</strong>
            <p>${evt.description}</p>
          </div>
          <div class="admin-event-actions">
            <button class="btn secondary sm edit-evt-btn" data-id="${evt.id}">Edit</button>
            <button class="btn danger sm del-evt-btn" data-id="${evt.id}">Delete</button>
          </div>
        </div>
      `).join('');

      // Attach Edit & Delete Listeners
      adminEventsList.querySelectorAll('.edit-evt-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditEventForm(btn.dataset.id));
      });
      adminEventsList.querySelectorAll('.del-evt-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteEvent(btn.dataset.id));
      });
    } else {
      adminEventsList.innerHTML = '<p style="color: var(--muted);">No upcoming events. Click "+ Add New Event" above to create one.</p>';
    }

    // Render Incoming Messages & Prayer Requests in Admin Panel
    const messagesListEl = document.getElementById('admin-messages-list');
    const msgBadgeTab = document.getElementById('msg-badge-tab');
    const msgBadgeHeader = document.getElementById('msg-badge-header');

    if (messagesListEl) {
      const allMessages = siteContent.messages || [];
      const activeMsgs = allMessages.filter(m => !m.archived);
      const prayerMsgs = allMessages.filter(m => m.subject === 'Prayer Request');
      const archivedMsgs = allMessages.filter(m => m.archived);

      // Update counters
      if (document.getElementById('msg-count-active')) document.getElementById('msg-count-active').textContent = activeMsgs.length;
      if (document.getElementById('msg-count-prayer')) document.getElementById('msg-count-prayer').textContent = prayerMsgs.length;
      if (document.getElementById('msg-count-archived')) document.getElementById('msg-count-archived').textContent = archivedMsgs.length;
      if (document.getElementById('msg-count-all')) document.getElementById('msg-count-all').textContent = allMessages.length;

      if (msgBadgeTab) {
        msgBadgeTab.textContent = activeMsgs.length;
        msgBadgeTab.style.display = activeMsgs.length > 0 ? 'inline-block' : 'none';
      }
      if (msgBadgeHeader) {
        msgBadgeHeader.textContent = `${activeMsgs.length} Active`;
      }

      // Determine current filter
      const activeFilterBtn = document.querySelector('.msg-filter-btn.active');
      const currentFilter = activeFilterBtn ? activeFilterBtn.dataset.filter : 'active';

      let displayMsgs = activeMsgs;
      if (currentFilter === 'prayer') displayMsgs = prayerMsgs;
      else if (currentFilter === 'archived') displayMsgs = archivedMsgs;
      else if (currentFilter === 'all') displayMsgs = allMessages;

      if (displayMsgs.length > 0) {
        messagesListEl.innerHTML = displayMsgs.map(msg => {
          const subjectText = msg.subject || 'General Inquiry';
          const tagClass = 'msg-tag-' + subjectText.toLowerCase().replace(/ /g, '-');
          const isArchived = !!msg.archived;
          return `
            <div class="admin-message-card ${isArchived ? 'archived-card' : ''}" data-id="${msg.id}">
              <div style="flex: 1;">
                <div class="admin-message-meta">
                  <span class="msg-subject-tag ${tagClass}">${subjectText}</span>
                  ${isArchived ? '<span class="msg-subject-tag" style="background:#e2e8f0; color:#475569; border:none;">ARCHIVED</span>' : ''}
                  <h4>${msg.name}</h4>
                  <span class="msg-date">• ${msg.date}</span>
                </div>
                <div class="msg-contact-info">
                  ✉️ <a href="mailto:${msg.email}" style="color: var(--gold-dark); text-decoration: underline;">${msg.email}</a> ${msg.phone ? `• 📞 ${msg.phone}` : ''}
                </div>
                <div class="admin-message-body">${msg.message}</div>
              </div>
              <div class="admin-msg-actions" style="display: flex; gap: 8px; flex-direction: column;">
                <button class="btn secondary sm archive-msg-btn" data-id="${msg.id}">${isArchived ? '📥 Unarchive' : '📦 Archive'}</button>
                <button class="btn danger sm delete-msg-btn" data-id="${msg.id}">🗑️ Delete</button>
              </div>
            </div>
          `;
        }).join('');

        messagesListEl.querySelectorAll('.archive-msg-btn').forEach(btn => {
          btn.addEventListener('click', () => toggleArchiveMessage(btn.dataset.id));
        });
        messagesListEl.querySelectorAll('.delete-msg-btn').forEach(btn => {
          btn.addEventListener('click', () => deleteMessage(btn.dataset.id));
        });
      } else {
        messagesListEl.innerHTML = `<p style="color: var(--muted); text-align: center; padding: 28px;">No messages found in "${currentFilter}" filter.</p>`;
      }
    }

    // Helper to safely populate form fields without interrupting active typing
    function setValueIfNotFocused(id, val) {
      const el = document.getElementById(id);
      if (el && document.activeElement !== el) {
        el.value = val;
      }
    }

    function setCheckedIfNotFocused(id, checkedState) {
      const el = document.getElementById(id);
      if (el && document.activeElement !== el) {
        el.checked = checkedState;
      }
    }

    // Populate Schedule Form
    if (siteContent.services) {
      setValueIfNotFocused('cfg-sunday-service', siteContent.services.sunday || '');
      setValueIfNotFocused('cfg-wednesday-service', siteContent.services.wednesday || '');
      setValueIfNotFocused('cfg-announcement', siteContent.services.announcement || '');
      setCheckedIfNotFocused('cfg-announcement-active', siteContent.services.announcementActive !== false);
    }

    // Populate Giving Form
    if (siteContent.giving) {
      setValueIfNotFocused('cfg-givelify', siteContent.giving.givelify || '');
      setValueIfNotFocused('cfg-cashapp', siteContent.giving.cashapp || '');
      setValueIfNotFocused('cfg-zelle', siteContent.giving.zelle || '');
    }

    // Populate Audio Form
    if (siteContent.carousel) {
      setValueIfNotFocused('cfg-audio-url', siteContent.carousel.audioUrl || '');
    }

    // Render Active Carousel Slides in Admin Panel
    const slidesGrid = document.getElementById('admin-slides-grid');
    const slideCountEl = document.getElementById('slide-count');
    const isEditingSlides = slidesGrid && slidesGrid.contains(document.activeElement);

    if (slidesGrid && siteContent.carousel && siteContent.carousel.slides && !isEditingSlides) {
      const slides = siteContent.carousel.slides;
      if (slideCountEl) slideCountEl.textContent = slides.length;
      if (slides.length > 0) {
        slidesGrid.innerHTML = slides.map(s => `
          <div class="admin-slide-card" data-id="${s.id}">
            <img src="${s.image}" class="admin-slide-thumb" alt="${s.title}" />
            <div class="form-group sm">
              <label>Category Tag</label>
              <select class="slide-badge-input" data-id="${s.id}">
                <option value="VACATION BIBLE SCHOOL" ${s.badge === 'VACATION BIBLE SCHOOL' ? 'selected' : ''}>VACATION BIBLE SCHOOL</option>
                <option value="SUNDAY SERVICE" ${s.badge === 'SUNDAY SERVICE' ? 'selected' : ''}>SUNDAY SERVICE</option>
                <option value="OUTREACH" ${s.badge === 'OUTREACH' ? 'selected' : ''}>OUTREACH</option>
                <option value="YOUTH MINISTRY" ${s.badge === 'YOUTH MINISTRY' ? 'selected' : ''}>YOUTH MINISTRY</option>
                <option value="COMMUNITY" ${s.badge === 'COMMUNITY' ? 'selected' : ''}>COMMUNITY</option>
              </select>
            </div>
            <div class="form-group sm">
              <label>Caption / Title</label>
              <input type="text" class="slide-title-input" data-id="${s.id}" value="${s.title.replace(/"/g, '&quot;')}" placeholder="Photo Title" />
            </div>
            <div class="admin-slide-actions">
              <button class="btn primary sm save-slide-btn" data-id="${s.id}">Save Edits</button>
              <button class="btn danger sm del-slide-btn" data-id="${s.id}">Delete</button>
            </div>
          </div>
        `).join('');

        slidesGrid.querySelectorAll('.save-slide-btn').forEach(btn => {
          btn.addEventListener('click', () => saveCarouselSlideEdit(btn.dataset.id));
        });

        slidesGrid.querySelectorAll('.del-slide-btn').forEach(btn => {
          btn.addEventListener('click', () => deleteCarouselSlide(btn.dataset.id));
        });
      } else {
        slidesGrid.innerHTML = '<p style="color: var(--muted);">No photos in carousel. Click "Upload New Photo" above to add one.</p>';
      }
    }
  }

  // Helper Status Alert in Dashboard
  function showDashStatus(msg, type = 'success') {
    if (!dashStatusAlert) return;
    dashStatusAlert.className = `alert-box ${type}`;
    dashStatusAlert.textContent = msg;
    dashStatusAlert.style.display = 'block';
    setTimeout(() => {
      dashStatusAlert.style.display = 'none';
    }, 4000);
  }

  // Portal Button Event Listener
  if (adminPortalBtn) {
    adminPortalBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const isAuth = await checkAuthStatus();
      if (isAuth) {
        dashboardOverlay.style.display = 'grid';
      } else {
        loginModal.style.display = 'grid';
      }
    });
  }

  // Close Login Modal
  if (closeLoginModalBtn) {
    closeLoginModalBtn.addEventListener('click', () => {
      loginModal.style.display = 'none';
      if (loginErrorAlert) loginErrorAlert.style.display = 'none';
    });
  }

  // Login Form Submit
  if (loginForm) {
    loginForm.addEventListener('click', (e) => e.stopPropagation());
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('admin-username').value.trim();
      const password = document.getElementById('admin-password').value.trim();

      if (loginErrorAlert) loginErrorAlert.style.display = 'none';

      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          setToken(data.token);
          if (currentAdminUser) currentAdminUser.textContent = data.username;
          loginModal.style.display = 'none';
          loginForm.reset();
          dashboardOverlay.style.display = 'grid';
          showDashStatus('Welcome to JCAL GUI Management System!');
        } else {
          if (loginErrorAlert) {
            loginErrorAlert.textContent = data.error || 'Invalid username or password.';
            loginErrorAlert.style.display = 'block';
          }
        }
      } catch (err) {
        console.error('Login error:', err);
        if (loginErrorAlert) {
          loginErrorAlert.textContent = 'Server connection error. Please try again.';
          loginErrorAlert.style.display = 'block';
        }
      }
    });
  }

  async function handleLogout() {
    const token = getToken();
    if (token) {
      try {
        await fetch('/api/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    setToken(null);
    sessionStorage.removeItem('jcal_cms_active');
    dashboardOverlay.style.display = 'none';
    if (adminDock) adminDock.style.display = 'none';
  }

  // Logout Button Event Listeners
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (dockLogoutBtn) dockLogoutBtn.addEventListener('click', handleLogout);

  // View Live Site Button
  if (viewLiveSiteBtn) {
    viewLiveSiteBtn.addEventListener('click', async () => {
      sessionStorage.removeItem('jcal_cms_active');
      dashboardOverlay.style.display = 'none';
      if (adminDock) adminDock.style.display = 'flex';
      await fetchSiteContent();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Dock Open Dashboard Button
  if (dockOpenBtn) {
    dockOpenBtn.addEventListener('click', () => {
      sessionStorage.setItem('jcal_cms_active', 'true');
      if (adminDock) adminDock.style.display = 'none';
      dashboardOverlay.style.display = 'flex';
    });
  }

  // Dashboard Tab Switching
  dashTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      dashTabs.forEach(t => t.classList.remove('active'));
      dashPanels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPanel = document.getElementById(tab.dataset.tab);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  // Sub-Tabs Switching inside Gallery & Music Panel
  const subTabs = document.querySelectorAll('.sub-tab');
  const subPanels = document.querySelectorAll('.sub-panel');

  subTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      subTabs.forEach(t => t.classList.remove('active'));
      subPanels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetSubPanel = document.getElementById(tab.dataset.subtab);
      if (targetSubPanel) targetSubPanel.classList.add('active');
    });
  });

  // Save Carousel Slide Title & Badge Edits
  async function saveCarouselSlideEdit(slideId) {
    const card = document.querySelector(`.admin-slide-card[data-id="${slideId}"]`);
    if (!card) return;
    const badgeSelect = card.querySelector('.slide-badge-input');
    const titleInput = card.querySelector('.slide-title-input');
    if (!badgeSelect || !titleInput) return;

    const newBadge = badgeSelect.value;
    const newTitle = titleInput.value.trim();

    const slides = (siteContent.carousel.slides || []).map(s => {
      if (s.id === slideId) {
        return { ...s, badge: newBadge, title: newTitle };
      }
      return s;
    });

    const updatedCarousel = { ...(siteContent.carousel || {}), slides };
    await saveContentToServer({ ...siteContent, carousel: updatedCarousel }, 'Photo caption & category tag updated!');
  }

  // Event Editor Controls
  if (addNewEventBtn) {
    addNewEventBtn.addEventListener('click', () => {
      document.getElementById('evt-id').value = '';
      eventEditorForm.reset();
      eventEditTitle.textContent = 'Add New Event';
      eventEditFormBox.style.display = 'block';
    });
  }

  if (cancelEventBtn) {
    cancelEventBtn.addEventListener('click', () => {
      eventEditFormBox.style.display = 'none';
      eventEditorForm.reset();
    });
  }

  function openEditEventForm(evtId) {
    const evt = siteContent.events.find(e => e.id === evtId);
    if (!evt) return;

    document.getElementById('evt-id').value = evt.id;
    document.getElementById('evt-tag').value = evt.tag || 'SUN';
    document.getElementById('evt-name').value = evt.title || '';
    document.getElementById('evt-time').value = evt.time || '';
    document.getElementById('evt-desc').value = evt.description || '';

    eventEditTitle.textContent = 'Edit Event';
    eventEditFormBox.style.display = 'block';
  }

  async function saveContentToServer(updatedData, successMsg) {
    const token = getToken();
    if (!token) {
      setToken(null);
      dashboardOverlay.style.display = 'none';
      loginModal.style.display = 'grid';
      if (loginErrorAlert) {
        loginErrorAlert.textContent = 'Please log in to make changes.';
        loginErrorAlert.style.display = 'block';
      }
      return false;
    }

    try {
      const res = await fetch('/api/content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedData)
      });
      const data = await res.json();
      if (res.status === 401) {
        setToken(null);
        dashboardOverlay.style.display = 'none';
        loginModal.style.display = 'grid';
        if (loginErrorAlert) {
          loginErrorAlert.textContent = 'Session expired. Please log in again.';
          loginErrorAlert.style.display = 'block';
        }
        return false;
      }
      if (res.ok && data.success) {
        siteContent = data.content;
        renderPublicContent();
        renderAdminDashboard();
        showDashStatus(successMsg);
        return true;
      } else {
        showDashStatus(data.error || 'Failed to save changes.', 'error');
        return false;
      }
    } catch (err) {
      console.error('Save error:', err);
      showDashStatus('Server error saving content.', 'error');
      return false;
    }
  }

  // Save / Update Event Form Submit
  if (eventEditorForm) {
    eventEditorForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('evt-id').value || 'evt-' + Date.now();
      const tag = document.getElementById('evt-tag').value.trim().toUpperCase();
      const title = document.getElementById('evt-name').value.trim();
      const time = document.getElementById('evt-time').value.trim();
      const description = document.getElementById('evt-desc').value.trim();

      let events = [...(siteContent.events || [])];
      const index = events.findIndex(e => e.id === id);

      const eventPayload = { id, tag, title, time, description };
      if (index >= 0) {
        events[index] = eventPayload;
      } else {
        events.push(eventPayload);
      }

      const ok = await saveContentToServer({ ...siteContent, events }, 'Event saved successfully!');
      if (ok) {
        eventEditFormBox.style.display = 'none';
        eventEditorForm.reset();
      }
    });
  }

  // Delete Event
  async function deleteEvent(evtId) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    const events = siteContent.events.filter(e => e.id !== evtId);
    await saveContentToServer({ ...siteContent, events }, 'Event deleted successfully.');
  }

  // Archive / Unarchive Message
  async function toggleArchiveMessage(msgId) {
    const messages = (siteContent.messages || []).map(m => {
      if (m.id === msgId) {
        return { ...m, archived: !m.archived };
      }
      return m;
    });
    const ok = await saveContentToServer({ ...siteContent, messages }, 'Message archive status updated.');
    if (ok) {
      siteContent.messages = messages;
      renderAdminDashboard();
    }
  }

  // Filter Sub-Tabs Click Handler
  document.querySelectorAll('.msg-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.msg-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderAdminDashboard();
    });
  });

  // Delete Message / Prayer Request
  async function deleteMessage(msgId) {
    if (!confirm('Are you sure you want to delete this message?')) return;
    const messages = (siteContent.messages || []).filter(m => m.id !== msgId);
    const ok = await saveContentToServer({ ...siteContent, messages }, 'Message deleted.');
    if (ok) {
      siteContent.messages = messages;
      renderAdminDashboard();
    }
  }

  const clearMsgsBtn = document.getElementById('clear-all-messages-btn');
  if (clearMsgsBtn) {
    clearMsgsBtn.onclick = async () => {
      if (!confirm('Are you sure you want to clear all messages from your inbox?')) return;
      const ok = await saveContentToServer({ ...siteContent, messages: [] }, 'Inbox cleared.');
      if (ok) {
        siteContent.messages = [];
        renderAdminDashboard();
      }
    };
  }

  // Services / Schedule Form Submit
  if (servicesForm) {
    servicesForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const activeCb = document.getElementById('cfg-announcement-active');
      const services = {
        sunday: document.getElementById('cfg-sunday-service').value.trim(),
        wednesday: document.getElementById('cfg-wednesday-service').value.trim(),
        announcement: document.getElementById('cfg-announcement').value.trim(),
        announcementActive: activeCb ? activeCb.checked : true
      };
      await saveContentToServer({ ...siteContent, services }, 'Schedule & Notice saved successfully!');
    });
  }

  // Giving Form Submit
  if (givingForm) {
    givingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const giving = {
        givelify: document.getElementById('cfg-givelify').value.trim(),
        cashapp: document.getElementById('cfg-cashapp').value.trim(),
        zelle: document.getElementById('cfg-zelle').value.trim()
      };
      await saveContentToServer({ ...siteContent, giving }, 'Giving options updated successfully!');
    });
  }

  // Delete Carousel Slide
  async function deleteCarouselSlide(slideId) {
    if (!confirm('Are you sure you want to remove this photo from the carousel?')) return;
    const slides = (siteContent.carousel.slides || []).filter(s => s.id !== slideId);
    const updatedCarousel = { ...(siteContent.carousel || {}), slides };
    await saveContentToServer({ ...siteContent, carousel: updatedCarousel }, 'Photo removed from carousel.');
  }

  // Audio Form Submit (Audio URL or File Upload)
  const audioForm = document.getElementById('admin-audio-form');
  if (audioForm) {
    audioForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('upload-audio-file');
      let audioUrl = document.getElementById('cfg-audio-url').value.trim();

      if (fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = async () => {
          const fileData = reader.result;
          const token = getToken();
          try {
            const res = await fetch('/api/upload/audio', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ filename: file.name, fileData })
            });
            const data = await res.json();
            if (res.ok && data.success) {
              audioUrl = data.url;
              const updatedCarousel = { ...(siteContent.carousel || {}), audioUrl };
              await saveContentToServer({ ...siteContent, carousel: updatedCarousel }, 'Music file uploaded & settings updated successfully!');
              fileInput.value = '';
            } else {
              showDashStatus(data.error || 'Failed to upload audio file.', 'error');
            }
          } catch (err) {
            console.error('Audio upload error:', err);
            showDashStatus('Error uploading audio file.', 'error');
          }
        };
        reader.readAsDataURL(file);
      } else {
        const updatedCarousel = { ...(siteContent.carousel || {}), audioUrl };
        await saveContentToServer({ ...siteContent, carousel: updatedCarousel }, 'Music settings saved successfully!');
      }
    });
  }

  // Photo Form Submit (Photo File Upload & Add Slide)
  const photoForm = document.getElementById('admin-photo-form');
  if (photoForm) {
    photoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('upload-photo-file');
      const badge = document.getElementById('photo-badge').value;
      const title = document.getElementById('photo-title').value.trim();

      if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        showDashStatus('Please select an image file to upload.', 'error');
        return;
      }

      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = async () => {
        const fileData = reader.result;
        const token = getToken();
        try {
          const res = await fetch('/api/upload/photo', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ filename: file.name, fileData })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            const newSlide = {
              id: 'slide-' + Date.now(),
              badge,
              title,
              image: data.url
            };
            const currentSlides = (siteContent.carousel && siteContent.carousel.slides) ? siteContent.carousel.slides : [];
            const slides = [newSlide, ...currentSlides];
            const updatedCarousel = { ...(siteContent.carousel || {}), slides };
            const ok = await saveContentToServer({ ...siteContent, carousel: updatedCarousel }, 'Photo uploaded & added to carousel!');
            if (ok) {
              photoForm.reset();
              const manageTabBtn = document.querySelector('[data-subtab="subtab-manage-photos"]');
              if (manageTabBtn) manageTabBtn.click();
            }
          } else {
            showDashStatus(data.error || 'Failed to upload image.', 'error');
          }
        } catch (err) {
          console.error('Photo upload error:', err);
          showDashStatus('Error uploading photo.', 'error');
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // Account Password Form Submit
  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('pwd-current').value;
      const newPassword = document.getElementById('pwd-new').value;
      const token = getToken();

      if (!token) return;

      try {
        const res = await fetch('/api/admin/password', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showDashStatus('Admin password updated successfully!');
          passwordForm.reset();
        } else {
          showDashStatus(data.error || 'Failed to update password.', 'error');
        }
      } catch (err) {
        console.error('Password update error:', err);
        showDashStatus('Server error updating password.', 'error');
      }
    });
  }

  // Public Contact & Prayer Request Form Submit
  const publicContactForm = document.getElementById('public-contact-form');
  if (publicContactForm) {
    publicContactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('contact-name').value;
      const email = document.getElementById('contact-email').value;
      const phone = document.getElementById('contact-phone').value;
      const subject = document.getElementById('contact-subject').value;
      const message = document.getElementById('contact-message').value;
      const alertBox = document.getElementById('contact-alert');

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone, subject, message })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (alertBox) {
            alertBox.style.display = 'block';
            alertBox.textContent = `Thank you, ${name}! Your ${subject.toLowerCase()} has been sent to JCAL Ministries. God bless you!`;
          }
          publicContactForm.reset();
          // Immediately re-fetch content from server to update CMS Inbox & notification counters!
          await fetchSiteContent();
        } else {
          if (alertBox) {
            alertBox.style.display = 'block';
            alertBox.textContent = data.error || 'Error sending request. Please try again.';
          }
        }
      } catch (err) {
        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.textContent = 'Server connection error. Please try again later.';
        }
      }
      setTimeout(() => {
        if (alertBox) alertBox.style.display = 'none';
      }, 7000);
    });
  }

  // Refresh inbox when clicking Inbox tab
  const inboxTabBtn = document.querySelector('[data-tab="tab-messages"]');
  if (inboxTabBtn) {
    inboxTabBtn.addEventListener('click', () => {
      fetchSiteContent();
    });
  }

  // Fetch Stream State for Homepage Live Preview Box
  async function checkHomepageStreamPreview() {
    const previewBox = document.getElementById('homepage-live-preview');
    const defaultMediaCard = document.getElementById('media-default-card');
    const mediaLiveBadge = document.getElementById('media-live-badge');
    const previewCameraImg = document.getElementById('preview-camera-img');

    try {
      const res = await fetch('/api/stream/state');
      if (res.ok) {
        const state = await res.json();
        if (state.isLive) {
          if (previewBox) previewBox.style.display = 'block';
          if (defaultMediaCard) defaultMediaCard.style.display = 'none';
          if (mediaLiveBadge) {
            mediaLiveBadge.style.display = 'inline-block';
            mediaLiveBadge.textContent = '🔴 LIVE SERVICE IN PROGRESS';
          }

          if (document.getElementById('preview-sermon-title')) {
            document.getElementById('preview-sermon-title').textContent = state.title || 'Sunday Worship Service';
          }
          if (document.getElementById('preview-sermon-speaker')) {
            document.getElementById('preview-sermon-speaker').textContent = `Ministering: ${state.speaker || 'JCAL Ministries'}`;
          }
          if (document.getElementById('preview-viewer-count')) {
            document.getElementById('preview-viewer-count').textContent = `👥 ${state.viewerCount || 0} Watching`;
          }

          // Fetch Live Camera Frame for Preview Box
          if (previewCameraImg) {
            try {
              const frameRes = await fetch('/api/stream/frame');
              if (frameRes.status === 200) {
                const frameData = await frameRes.json();
                if (frameData.frame) {
                  previewCameraImg.src = frameData.frame;
                  previewCameraImg.style.display = 'block';
                }
              }
            } catch (err) {
              console.error('Preview frame fetch error:', err);
            }
          }
        } else {
          if (previewBox) previewBox.style.display = 'none';
          if (defaultMediaCard) defaultMediaCard.style.display = 'flex';
          if (mediaLiveBadge) mediaLiveBadge.style.display = 'none';
          if (previewCameraImg) previewCameraImg.style.display = 'none';
        }
      }
    } catch (err) {
      console.error('Error fetching stream preview state:', err);
    }
  }

  // CMS ADMIN BROADCAST STUDIO MANAGEMENT HANDLERS
  const cmsLiveVideo = document.getElementById('cms-live-video');
  const cmsStandbyPreview = document.getElementById('cms-standby-preview');
  const cmsBtnCam = document.getElementById('cms-btn-cam');
  const cmsBtnLive = document.getElementById('cms-btn-live');
  const cmsBtnSaveBroadcast = document.getElementById('cms-btn-save-broadcast');
  const cmsStreamType = document.getElementById('cms-stream-type');
  const cmsSermonTitle = document.getElementById('cms-sermon-title');
  const cmsSermonSpeaker = document.getElementById('cms-sermon-speaker');
  const cmsLiveStatusPill = document.getElementById('cms-live-status-pill');
  const cmsLiveStatusText = document.getElementById('cms-live-status-text');

  let cmsLocalStream = null;
  let isCmsCamActive = false;
  let cmsStreamState = null;

  async function fetchCmsStreamState() {
    try {
      const res = await fetch('/api/stream/state');
      if (res.ok) {
        cmsStreamState = await res.json();
        renderCmsStreamState(cmsStreamState);
      }
    } catch (err) {
      console.error('CMS fetch stream state error:', err);
    }
  }

  function renderCmsStreamState(state) {
    if (!state) return;
    if (cmsSermonTitle && document.activeElement !== cmsSermonTitle) cmsSermonTitle.value = state.title || '';
    if (cmsSermonSpeaker && document.activeElement !== cmsSermonSpeaker) cmsSermonSpeaker.value = state.speaker || '';
    if (cmsStreamType) cmsStreamType.value = state.streamType || 'webrtc';

    if (state.isLive) {
      if (cmsLiveStatusPill) {
        cmsLiveStatusPill.className = 'stream-status-pill live-mode';
        cmsLiveStatusText.innerHTML = '<span class="live-pulse-dot"></span><span>🔴 BROADCASTING LIVE</span>';
      }
      if (cmsBtnLive) {
        cmsBtnLive.textContent = '⏹ END BROADCAST';
        cmsBtnLive.className = 'btn danger sm';
      }
    } else {
      if (cmsLiveStatusPill) {
        cmsLiveStatusPill.className = 'stream-status-pill standby-mode';
        cmsLiveStatusText.textContent = '⏳ STANDBY / OFFLINE';
      }
      if (cmsBtnLive) {
        cmsBtnLive.textContent = '🔴 GO LIVE BROADCAST';
        cmsBtnLive.className = 'btn primary sm';
      }
    }
  }

  // Camera & Mic Capture inside CMS
  if (cmsBtnCam) {
    cmsBtnCam.addEventListener('click', async () => {
      if (isCmsCamActive) {
        if (cmsLocalStream) {
          cmsLocalStream.getTracks().forEach(track => track.stop());
          cmsLocalStream = null;
        }
        if (cmsLiveVideo) {
          cmsLiveVideo.srcObject = null;
          cmsLiveVideo.style.display = 'none';
        }
        if (cmsStandbyPreview) cmsStandbyPreview.style.display = 'block';
        isCmsCamActive = false;
        cmsBtnCam.textContent = '📷 Start Camera & Mic';
      } else {
        try {
          cmsLocalStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          if (cmsLiveVideo) {
            cmsLiveVideo.srcObject = cmsLocalStream;
            cmsLiveVideo.style.display = 'block';
          }
          if (cmsStandbyPreview) cmsStandbyPreview.style.display = 'none';
          isCmsCamActive = true;
          cmsBtnCam.textContent = '⏹ Stop Camera & Mic';
        } catch (err) {
          console.error('CMS camera access error:', err);
          alert('Unable to access camera or microphone. Please check browser permissions.');
        }
      }
    });
  }

  // Toggle Live Broadcast inside CMS
  if (cmsBtnLive) {
    cmsBtnLive.addEventListener('click', async () => {
      const token = getToken();
      if (!token) return alert('Admin authentication token missing. Please re-login.');

      const newLiveState = !(cmsStreamState && cmsStreamState.isLive);
      try {
        const res = await fetch('/api/stream/state', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ isLive: newLiveState })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showDashStatus(newLiveState ? '🔴 Broadcast is NOW LIVE on website!' : '⏹ Broadcast has ended. Site switched to standby.');
          fetchCmsStreamState();
          checkHomepageStreamPreview();
        }
      } catch (err) {
        console.error('CMS toggle live error:', err);
      }
    });
  }

  // Save Stream Info inside CMS
  if (cmsBtnSaveBroadcast) {
    cmsBtnSaveBroadcast.addEventListener('click', async () => {
      const token = getToken();
      if (!token) return alert('Admin authentication token missing.');

      const title = cmsSermonTitle.value.trim();
      const speaker = cmsSermonSpeaker.value.trim();
      const streamType = cmsStreamType.value;

      try {
        const res = await fetch('/api/stream/state', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title, speaker, streamType })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showDashStatus('Broadcast stream settings updated successfully!');
          fetchCmsStreamState();
          checkHomepageStreamPreview();
        }
      } catch (err) {
        console.error('CMS save stream error:', err);
      }
    });
  }

  // Initial Data Load, Stream Preview & Auth Check
  fetchSiteContent();
  checkAuthStatus();
  checkHomepageStreamPreview();
  fetchCmsStreamState();

  // Automatic Background Polling for Live Message & Stream Updates (Every 5 Seconds)
  setInterval(() => {
    fetchSiteContent();
    checkHomepageStreamPreview();
    fetchCmsStreamState();
  }, 5000);
});
