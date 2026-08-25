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

  // Tribute Video Mute / Unmute Toggle Button
  const tributeVideo = document.getElementById('tribute-video-player');
  const tributeMuteBtn = document.getElementById('tribute-mute-btn');
  const tributeMuteIcon = document.getElementById('tribute-mute-icon');
  const tributeMuteText = document.getElementById('tribute-mute-text');

  if (tributeVideo) {
    tributeVideo.muted = true;
    tributeVideo.loop = true;
    tributeVideo.play().catch(() => {});

    // Restart video when finished
    tributeVideo.addEventListener('ended', () => {
      tributeVideo.currentTime = 0;
      tributeVideo.play().catch(() => {});
    });

    // Fallback trigger if browser blocked autoplay before user click
    const startPlayOnUserTouch = () => {
      if (tributeVideo.paused) {
        tributeVideo.play().catch(() => {});
      }
      document.removeEventListener('click', startPlayOnUserTouch);
      document.removeEventListener('touchstart', startPlayOnUserTouch);
    };
    document.addEventListener('click', startPlayOnUserTouch);
    document.addEventListener('touchstart', startPlayOnUserTouch);
  }

  if (tributeMuteBtn && tributeVideo) {
    tributeMuteBtn.onclick = () => {
      tributeVideo.muted = !tributeVideo.muted;
      if (tributeVideo.muted) {
        if (tributeMuteIcon) tributeMuteIcon.textContent = '🔇';
        if (tributeMuteText) tributeMuteText.textContent = 'Unmute Audio';
        tributeMuteBtn.style.background = 'rgba(15, 23, 42, 0.85)';
        tributeMuteBtn.style.color = '#fef08a';
      } else {
        if (tributeMuteIcon) tributeMuteIcon.textContent = '🔊';
        if (tributeMuteText) tributeMuteText.textContent = 'Mute Audio';
        tributeMuteBtn.style.background = 'rgba(234, 179, 8, 0.95)';
        tributeMuteBtn.style.color = '#0f172a';
      }
    };
  }

  // Mobile Navigation Toggle (3-Bar Hamburger Morph & Touch Dropdown)
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = menuToggle.classList.toggle('active');
      navLinks.classList.toggle('active', isActive);
      navLinks.classList.toggle('open', isActive);
    });

    navLinks.querySelectorAll('a, button').forEach((item) => {
      item.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        navLinks.classList.remove('active');
        navLinks.classList.remove('open');
      });
    });

    document.addEventListener('click', (e) => {
      if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
        menuToggle.classList.remove('active');
        navLinks.classList.remove('active');
        navLinks.classList.remove('open');
      }
    });
  }

  // Admin CMS Mobile Hamburger Toggle
  const cmsMenuToggle = document.getElementById('cms-menu-toggle');
  const dashSidebar = document.querySelector('.dashboard-sidebar');
  const cmsActiveTabTitle = document.getElementById('cms-active-tab-title');

  if (cmsMenuToggle && dashSidebar) {
    cmsMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = cmsMenuToggle.classList.toggle('active');
      dashSidebar.classList.toggle('open', isActive);
    });

    dashSidebar.querySelectorAll('.dash-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        cmsMenuToggle.classList.remove('active');
        dashSidebar.classList.remove('open');
        if (cmsActiveTabTitle) {
          // Extract tab title text cleanly
          const tabText = tab.textContent.replace(/0+$/, '').trim();
          cmsActiveTabTitle.textContent = tabText;
        }
      });
    });

    document.addEventListener('click', (e) => {
      if (dashSidebar && cmsMenuToggle && !dashSidebar.contains(e.target) && !cmsMenuToggle.contains(e.target)) {
        cmsMenuToggle.classList.remove('active');
        dashSidebar.classList.remove('open');
      }
    });
  // Interactive Scripture Proof Modal with Blurred Background
  const SCRIPTURE_TEXTS = {
    'Deuteronomy 6:4': 'Hear, O Israel: The LORD our God is one LORD.',
    'Isaiah 9:6': 'For unto us a child is born, unto us a son is given: and the government shall be upon his shoulder: and his name shall be called Wonderful, Counseller, The mighty God, The everlasting Father, The Prince of Peace.',
    'John 1:1, 14': 'In the beginning was the Word, and the Word was with God, and the Word was God... And the Word was made flesh, and dwelt among us, (and we beheld his glory, the glory as of the only begotten of the Father,) full of grace and truth.',
    'John 10:30': 'I and my Father are one.',
    'Colossians 2:9': 'For in him dwelleth all the fulness of the Godhead bodily.',
    '1 Timothy 3:16': 'And without controversy great is the mystery of godliness: God was manifest in the flesh, justified in the Spirit, seen of angels, preached unto the Gentiles, believed on in the world, received up into glory.',
    'Acts 4:12': 'Neither is there salvation in any other: for there is none other name under heaven given among men, whereby we must be saved.',
    'John 3:3–5': 'Jesus answered and said unto him, Verily, verily, I say unto thee, Except a man be born again, he cannot see the kingdom of God. Nicodemus saith unto him, How can a man be born when he is old? can he enter the second time into his mother\'s womb, and be born? Jesus answered, Verily, verily, I say unto thee, Except a man be born of water and of the Spirit, he cannot enter into the kingdom of God.',
    'Luke 24:47': 'And that repentance and remission of sins should be preached in his name among all nations, beginning at Jerusalem.',
    'Acts 2:38–39': 'Then Peter said unto them, Repent, and be baptized every one of you in the name of Jesus Christ for the remission of sins, and ye shall receive the gift of the Holy Ghost. For the promise is unto you, and to your children, and to all that are afar off, even as many as the Lord our God shall call.',
    'Acts 8:12–17': 'But when they believed Philip preaching the things concerning the kingdom of God, and the name of Jesus Christ, they were baptized, both men and women... Then laid they their hands on them, and they received the Holy Ghost.',
    'Acts 10:44–48': 'While Peter yet spake these words, the Holy Ghost fell on all them which heard the word... And he commanded them to be baptized in the name of the Lord.',
    'Acts 19:1–6': 'And when Paul had laid his hands upon them, the Holy Ghost came on them; and they spake with tongues, and prophesied.',
    'Joel 2:28–29': 'And it shall come to pass afterward, that I will pour out my spirit upon all flesh; and your sons and your daughters shall prophesy, your old men shall dream dreams, your young men shall see visions.',
    'Acts 1:8': 'But ye shall receive power, after that the Holy Ghost is come upon you: and ye shall be witnesses unto me both in Jerusalem, and in all Judaea, and in Samaria, and unto the uttermost part of the earth.',
    'Acts 2:1–4': 'And when the day of Pentecost was fully come, they were all with one accord in one place... And they were all filled with the Holy Ghost, and began to speak with other tongues, as the Spirit gave them utterance.',
    'Acts 10:44–46': 'While Peter yet spake these words, the Holy Ghost fell on all them which heard the word. And they of the circumcision which believed were astonished... For they heard them speak with tongues, and magnify God.',
    'Acts 19:6': 'And when Paul had laid his hands upon them, the Holy Ghost came on them; and they spake with tongues, and prophesied.',
    '1 Cor 12:4–11': 'Now there are diversities of gifts, but the same Spirit... But all these worketh that one and the selfsame Spirit, dividing to every man severally as he will.',
    'Galatians 5:22–23': 'But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, meekness, temperance: against such there is no law.',
    'Romans 12:1–2': 'I beseech you therefore, brethren, by the mercies of God, that ye present your bodies a living sacrifice, holy, acceptable unto God, which is your reasonable service. And be not conformed to this world: but be ye transformed by the renewing of your mind.',
    '1 Cor 6:19–20': 'What? know ye not that your body is the temple of the Holy Ghost which is in you, which ye have of God, and ye are not your own? For ye are bought with a price: therefore glorify God in your body, and in your spirit, which are God\'s.',
    '2 Cor 7:1': 'Having therefore these promises, dearly beloved, let us cleanse ourselves from all filthiness of the flesh and spirit, perfecting holiness in the fear of God.',
    'Galatians 5:16–25': 'This I say then, Walk in the Spirit, and ye shall not fulfil the lust of the flesh... If we live in the Spirit, let us also walk in the Spirit.',
    'Hebrews 12:14': 'Follow peace with all men, and holiness, without which no man shall see the Lord.',
    '1 Peter 1:15–16': 'But as he which hath called you is holy, so be ye holy in all manner of conversation; Because it is written, Be ye holy; for I am holy.',
    'Matthew 28:19–20': 'Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost: Teaching them to observe all things whatsoever I have commanded you: and, lo, I am with you alway, even unto the end of the world. Amen.',
    'Mark 16:15–18': 'And he said unto them, Go ye into all the world, and preach the gospel to every creature. He that believeth and is baptized shall be saved... And these signs shall follow them that believe; In my name shall they cast out devils; they shall speak with new tongues.',
    'Acts 2:42': 'And they continued stedfastly in the apostles\' doctrine and fellowship, and in breaking of bread, and in prayers.',
    '1 Cor 12:27–28': 'Now ye are the body of Christ, and members in particular. And God hath set some in the church, first apostles, secondarily prophets, thirdly teachers, after that miracles, then gifts of healings, helps, governments, diversities of tongues.',
    'Ephesians 4:11–13': 'And he gave some, apostles; and some, prophets; and some, evangelists; and some, pastors and teachers; For the perfecting of the saints, for the work of the ministry, for the edifying of the body of Christ.',
    '1 Peter 2:9': 'But ye are a chosen generation, a royal priesthood, an holy nation, a peculiar people; that ye should shew forth the praises of him who hath called you out of darkness into his marvellous light.',
    'Hebrews 10:25': 'Not forsaking the assembling of ourselves together, as the manner of some is; but exhorting one another: and so much the more, as ye see the day approaching.',
    '1 Thess 4:16–17': 'For the Lord himself shall descend from heaven with a shout, with the voice of the archangel, and with the trump of God: and the dead in Christ shall rise first: Then we which are alive and remain shall be caught up together with them in the clouds, to meet the Lord in the air.',
    'Titus 2:13': 'Looking for that blessed hope, and the glorious appearing of the great God and our Saviour Jesus Christ.',
    'Revelation 20:11–15': 'And I saw a great white throne, and him that sat on it, from whose face the earth and the heaven fled away... And whosoever was not found written in the book of life was cast into the lake of fire.',
    'John 14:1–3': 'Let not your heart be troubled: ye believe in God, believe also in me. In my Father\'s house are many mansions: if it were not so, I would have told you. I go to prepare a place for you. And if I go and prepare a place for you, I will come again, and receive you unto myself; that where I am, there ye may be also.',
    'Acts 1:9–11': 'And when he had spoken these things, while they beheld, he was taken up; and a cloud received him out of their sight... This same Jesus, which is taken up from you into heaven, shall so come in like manner as ye have seen him go into heaven.',
    '1 Cor 15:51–52': 'Behold, I shew you a mystery; We shall not all sleep, but we shall all be changed, In a moment, in the twinkling of an eye, at the last trump: for the trumpet shall sound, and the dead shall be raised incorruptible, and we shall be changed.',
    'Revelation 21:1–4': 'And I saw a new heaven and a new earth: for the first heaven and the first earth were passed away; and there was no more sea... And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain.'
  };

  const scriptureModal = document.getElementById('scripture-modal');
  const scriptureRefEl = document.getElementById('scripture-modal-ref');
  const scriptureTextEl = document.getElementById('scripture-modal-text');
  const scriptureCloseBtn = document.getElementById('scripture-modal-close');
  const scriptureOkBtn = document.getElementById('scripture-modal-ok-btn');

  function getScriptureVerse(ref) {
    const raw = (ref || '').trim();
    if (SCRIPTURE_TEXTS[raw]) return SCRIPTURE_TEXTS[raw];
    const norm = raw.replace(/[\u2013\u2014-]/g, '-').toLowerCase();
    for (const [k, v] of Object.entries(SCRIPTURE_TEXTS)) {
      if (k.replace(/[\u2013\u2014-]/g, '-').toLowerCase() === norm) {
        return v;
      }
    }
    return `Holy Scripture Proof for ${raw}: "All scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness." (2 Timothy 3:16)`;
  }

  window.openScriptureModal = function(refText) {
    const modal = document.getElementById('scripture-modal');
    const refEl = document.getElementById('scripture-modal-ref');
    const textEl = document.getElementById('scripture-modal-text');
    if (!modal) return;

    const rawRef = (refText || '').trim();
    const verseText = getScriptureVerse(rawRef);

    if (refEl) refEl.textContent = rawRef;
    if (textEl) textEl.textContent = verseText;

    // Reset zoom animation for instant spring pop effect
    const cardEl = modal.querySelector('.scripture-modal-card');
    if (cardEl) {
      cardEl.style.animation = 'none';
      void cardEl.offsetWidth;
      cardEl.style.animation = 'scriptureZoomIn 0.38s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
    }

    modal.style.cssText = 'display: flex !important; opacity: 1 !important; visibility: visible !important; z-index: 999999 !important;';
  };

  window.closeScriptureModal = function() {
    const modal = document.getElementById('scripture-modal');
    if (modal) modal.style.cssText = 'display: none !important;';
  };

  // Keyboard Accessibility: Escape key closes modal, Enter/Space opens focused scripture tag
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.closeScriptureModal();
    }
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement && document.activeElement.classList.contains('scripture-tag')) {
      e.preventDefault();
      const text = document.activeElement.getAttribute('data-scripture') || document.activeElement.textContent;
      window.openScriptureModal(text);
    }
  });

  // Global Event Delegation for Scripture Tag Clicks (Desktop & Mobile)
  document.addEventListener('click', (e) => {
    const tag = e.target.closest('.scripture-tag');
    if (tag) {
      e.preventDefault();
      e.stopPropagation();
      const text = tag.getAttribute('data-scripture') || tag.textContent;
      window.openScriptureModal(text);
    }
  });

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
    // 1. Render Events in .event-list or display empty events message
    const eventsContainer = document.querySelector('#events .event-list') || document.querySelector('#events .cards');
    if (eventsContainer) {
      if (siteContent.events && siteContent.events.length > 0) {
        eventsContainer.innerHTML = siteContent.events.map(evt => `
          <article class="event-card-item">
            <span>${evt.tag || 'EVENT'}</span>
            <div>
              <h3>${evt.title}</h3>
              <p>${evt.description}${evt.time ? ' • ' + evt.time : ''}</p>
            </div>
          </article>
        `).join('');
      } else {
        eventsContainer.innerHTML = `
          <div class="no-events-card glass-panel" style="grid-column: 1 / -1; width: 100%; text-align: center; padding: 36px 24px; border-radius: 20px; background: rgba(255, 255, 255, 0.92); border: 1.5px dashed rgba(184, 137, 22, 0.4); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);">
            <div style="font-size: 2.2rem; margin-bottom: 10px;">📅</div>
            <h3 style="font-family: 'Poppins', sans-serif; font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0 0 8px 0;">No Upcoming Events Scheduled</h3>
            <p style="color: #64748b; font-size: 0.94rem; margin: 0;">Check back soon for upcoming fellowship, Bible studies, and special worship services.</p>
          </div>
        `;
      }
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

    // Render Floating Glassmorphic Announcement Modal
    const noticeModal = document.getElementById('announcement-modal');
    const noticeBodyEl = document.getElementById('notice-modal-body');
    const noticeDismissBtn = document.getElementById('notice-dismiss-btn');

    if (siteContent.services && siteContent.services.announcement !== undefined) {
      const text = siteContent.services.announcement.trim();
      const isActive = siteContent.services.announcementActive !== false;

      if (text && isActive && !window.noticeDismissed) {
        if (noticeBodyEl) noticeBodyEl.textContent = text;
        if (noticeModal) noticeModal.style.display = 'flex';
      } else {
        if (noticeModal && !window.noticeDismissed) noticeModal.style.display = 'none';
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
                  <a href="mailto:${msg.email}" style="color: var(--gold-dark); text-decoration: underline;">${msg.email}</a> ${msg.phone ? `• Phone: ${msg.phone}` : ''}
                </div>
                <div class="admin-message-body">${msg.message}</div>
              </div>
              <div class="admin-msg-actions" style="display: flex; gap: 8px; flex-direction: column;">
                <button class="btn secondary sm archive-msg-btn" data-id="${msg.id}">${isArchived ? 'Unarchive' : 'Archive'}</button>
                <button class="btn danger sm delete-msg-btn" data-id="${msg.id}">Delete</button>
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
        slidesGrid.innerHTML = slides.map((s, index) => `
          <div class="admin-slide-card refined-slide-card" data-id="${s.id}" data-index="${index}" draggable="true">
            <div class="admin-slide-order-bar">
              <span class="order-badge">#${index + 1} Position</span>
              <span class="drag-handle-hint" title="Drag to re-order photo position">⋮⋮ Drag</span>
              <div class="position-btn-group">
                <button class="btn secondary sm move-up-btn" data-id="${s.id}" title="Move Photo Left/Earlier" ${index === 0 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''}>⬅</button>
                <button class="btn secondary sm move-down-btn" data-id="${s.id}" title="Move Photo Right/Later" ${index === slides.length - 1 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''}>➡</button>
              </div>
            </div>
            <div class="slide-thumb-wrapper">
              <img src="${s.image}" class="admin-slide-thumb" alt="${s.title}" />
            </div>
            <div class="slide-card-body">
              <div class="form-group sm" style="margin-bottom: 8px;">
                <label style="font-weight: 700; color: #475569; font-size: 0.74rem;">Category Tag</label>
                <select class="slide-badge-input refined-select" data-id="${s.id}">
                  <option value="VACATION BIBLE SCHOOL" ${s.badge === 'VACATION BIBLE SCHOOL' ? 'selected' : ''}>VACATION BIBLE SCHOOL</option>
                  <option value="SUNDAY SERVICE" ${s.badge === 'SUNDAY SERVICE' ? 'selected' : ''}>SUNDAY SERVICE</option>
                  <option value="OUTREACH" ${s.badge === 'OUTREACH' ? 'selected' : ''}>OUTREACH</option>
                  <option value="YOUTH MINISTRY" ${s.badge === 'YOUTH MINISTRY' ? 'selected' : ''}>YOUTH MINISTRY</option>
                  <option value="COMMUNITY" ${s.badge === 'COMMUNITY' ? 'selected' : ''}>COMMUNITY</option>
                </select>
              </div>
              <div class="form-group sm" style="margin-bottom: 12px;">
                <label style="font-weight: 700; color: #475569; font-size: 0.74rem;">Caption / Description</label>
                <input type="text" class="slide-title-input refined-input" data-id="${s.id}" value="${s.title.replace(/"/g, '&quot;')}" placeholder="Photo Title" />
              </div>
              <div class="admin-slide-actions" style="display: flex; gap: 8px;">
                <button class="btn primary sm save-slide-btn" data-id="${s.id}" style="flex: 1;">Save</button>
                <button class="btn danger sm del-slide-btn" data-id="${s.id}" style="padding: 6px 12px;">Delete</button>
              </div>
            </div>
          </div>
        `).join('');

        slidesGrid.querySelectorAll('.move-up-btn').forEach(btn => {
          btn.addEventListener('click', () => moveCarouselSlide(btn.dataset.id, 'up'));
        });

        slidesGrid.querySelectorAll('.move-down-btn').forEach(btn => {
          btn.addEventListener('click', () => moveCarouselSlide(btn.dataset.id, 'down'));
        });

        slidesGrid.querySelectorAll('.save-slide-btn').forEach(btn => {
          btn.addEventListener('click', () => saveCarouselSlideEdit(btn.dataset.id));
        });

        slidesGrid.querySelectorAll('.del-slide-btn').forEach(btn => {
          btn.addEventListener('click', () => deleteCarouselSlide(btn.dataset.id));
        });

        // HTML5 Drag and Drop Reordering Handlers
        let draggedCard = null;
        slidesGrid.querySelectorAll('.admin-slide-card').forEach(card => {
          card.addEventListener('dragstart', (e) => {
            draggedCard = card;
            e.dataTransfer.effectAllowed = 'move';
            card.classList.add('dragging');
          });

          card.addEventListener('dragend', () => {
            draggedCard = null;
            card.classList.remove('dragging');
          });

          card.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          });

          card.addEventListener('drop', async (e) => {
            e.preventDefault();
            if (!draggedCard || draggedCard === card) return;
            const fromIndex = parseInt(draggedCard.dataset.index, 10);
            const toIndex = parseInt(card.dataset.index, 10);

            const newSlides = [...siteContent.carousel.slides];
            const [movedItem] = newSlides.splice(fromIndex, 1);
            newSlides.splice(toIndex, 0, movedItem);

            const updatedCarousel = { ...(siteContent.carousel || {}), slides: newSlides };
            await saveContentToServer({ ...siteContent, carousel: updatedCarousel }, 'Photo order updated via drag & drop!');
          });
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

  // Move Carousel Slide Up / Down (Reordering)
  async function moveCarouselSlide(slideId, direction) {
    const slides = [...(siteContent.carousel.slides || [])];
    const index = slides.findIndex(s => s.id === slideId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    const temp = slides[index];
    slides[index] = slides[targetIndex];
    slides[targetIndex] = temp;

    const updatedCarousel = { ...(siteContent.carousel || {}), slides };
    await saveContentToServer({ ...siteContent, carousel: updatedCarousel }, 'Photo order updated!');
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
      const nameInput = document.getElementById('contact-name');
      const emailInput = document.getElementById('contact-email');
      const phoneInput = document.getElementById('contact-phone');
      const subjectInput = document.getElementById('contact-subject');
      const messageInput = document.getElementById('contact-message');
      const submitBtn = publicContactForm.querySelector('button[type="submit"]');
      const alertBox = document.getElementById('contact-alert');

      const name = nameInput.value;
      const email = emailInput.value;
      const phone = phoneInput.value;
      const subject = subjectInput.value;
      const message = messageInput.value;

      // Disable inputs and button until response is answered
      if (nameInput) nameInput.disabled = true;
      if (emailInput) emailInput.disabled = true;
      if (phoneInput) phoneInput.disabled = true;
      if (subjectInput) subjectInput.disabled = true;
      if (messageInput) messageInput.disabled = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.origText = submitBtn.textContent;
        submitBtn.textContent = 'Sending Request...';
      }

      function reEnableContactForm() {
        if (nameInput) nameInput.disabled = false;
        if (emailInput) emailInput.disabled = false;
        if (phoneInput) phoneInput.disabled = false;
        if (subjectInput) subjectInput.disabled = false;
        if (messageInput) messageInput.disabled = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.dataset.origText || 'Send Message ✉';
        }
      }

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
      } finally {
        reEnableContactForm();
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
  async function fetchStreamPreviewState() {
    const previewBox = document.getElementById('homepage-live-preview');
    const defaultMediaCard = document.getElementById('media-default-card');
    const mediaLiveBadge = document.getElementById('media-live-badge');
    const previewCameraImg = document.getElementById('preview-camera-img');
    try {
      const res = await fetch('/api/stream/playback');
      if (res.ok) {
        const state = await res.json();
        if (state && state.isLive) {
          if (previewBox) previewBox.style.display = 'flex';
          if (defaultMediaCard) defaultMediaCard.style.display = 'none';
          if (mediaLiveBadge) {
            mediaLiveBadge.style.display = 'inline-block';
            mediaLiveBadge.textContent = 'LIVE SERVICE IN PROGRESS';
          }

          if (document.getElementById('preview-sermon-title')) {
            document.getElementById('preview-sermon-title').textContent = state.title || 'Sunday Worship Service';
          }
          if (document.getElementById('preview-sermon-speaker')) {
            document.getElementById('preview-sermon-speaker').textContent = `Ministering: ${state.speaker || 'Apostle Joyce B. Stewart'}`;
          }
          if (document.getElementById('preview-viewer-count')) {
            document.getElementById('preview-viewer-count').textContent = `${state.viewerCount || 0} Watching`;
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
          cmsLocalStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1920, max: 1920 }, height: { ideal: 1080, max: 1080 }, frameRate: { ideal: 30 } },
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          });
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

  // Homepage Stream State Fetcher
  async function fetchCmsStreamState() {
    try {
      const res = await fetch('/api/stream/state');
      if (res.ok) {
        cmsStreamState = await res.json();
        renderCmsStreamState(cmsStreamState);
      }
    } catch (err) {
      console.error('Error fetching CMS stream state:', err);
    }
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
          if (newLiveState) {
            startCmsFrameBroadcasting();
          } else {
            stopCmsFrameBroadcasting();
          }
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

  // Tribute Video Continuous Replay & Auto-Play Handler
  const tributeVideo = document.getElementById('tribute-video-player');
  if (tributeVideo) {
    tributeVideo.muted = true;
    tributeVideo.loop = true;
    tributeVideo.playsInline = true;
    
    // Attempt auto-play immediately on page load
    tributeVideo.play().catch(() => {});
    
    // Auto-replay continuously when finished
    tributeVideo.addEventListener('ended', () => {
      tributeVideo.currentTime = 0;
      tributeVideo.play().catch(() => {});
    });

    // Auto-resume playback whenever scrolled into view
    if ('IntersectionObserver' in window) {
      const tributeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            tributeVideo.play().catch(() => {});
          }
        });
      }, { threshold: 0.1 });
      tributeObserver.observe(tributeVideo);
    }
  }

  // Smooth Scroll-Driven Reveal Animations for Homepage Cards & Sections
  if ('IntersectionObserver' in window) {
    const revealTargets = document.querySelectorAll('.belief-card, .event-card-item, .legacy-card, .notice-card, .giving-card, section h2');
    revealTargets.forEach(target => {
      target.classList.add('scroll-reveal-target');
    });

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('scroll-revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    revealTargets.forEach(el => revealObserver.observe(el));
  }

  // Initial Data Load, Stream Preview & Auth Check
  fetchSiteContent();
  checkAuthStatus();
  checkHomepageStreamPreview();
  fetchCmsStreamState();

  // Automatic Background Polling for Live Message & Stream Updates
  setInterval(() => {
    checkHomepageStreamPreview();
  }, 2500);

  setInterval(() => {
    fetchSiteContent();
    fetchCmsStreamState();
  }, 5000);
});
