document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const liveVideo = document.getElementById('live-video');
  const liveIframe = document.getElementById('live-iframe');
  const standbyScreen = document.getElementById('standby-screen');
  const globalStatusPill = document.getElementById('global-status-text');
  const viewerCountPill = document.getElementById('viewer-count-pill');
  
  const streamSermonTitle = document.getElementById('stream-sermon-title');
  const streamSermonSpeaker = document.getElementById('stream-sermon-speaker');

  // Controls
  const ctrlMuteBtn = document.getElementById('ctrl-mute-btn');
  const ctrlCamSwitch = document.getElementById('ctrl-cam-switch');
  const ctrlFilterBtn = document.getElementById('ctrl-filter-btn');
  const ctrlFullscreenBtn = document.getElementById('ctrl-fullscreen-btn');
  const previewCamBtn = document.getElementById('preview-camera-btn');

  // Admin Broadcaster Studio Deck
  const adminStudioBar = document.getElementById('admin-studio-bar');
  const streamAdminBtn = document.getElementById('stream-admin-btn');
  const btnToggleCam = document.getElementById('btn-toggle-cam');
  const btnToggleLive = document.getElementById('btn-toggle-live');
  const btnSaveStudio = document.getElementById('btn-save-studio');
  const studioStreamType = document.getElementById('studio-stream-type');
  const studioSermonTitle = document.getElementById('studio-sermon-title');
  const studioSermonSpeaker = document.getElementById('studio-sermon-speaker');

  // Live Chat
  const chatMessagesFeed = document.getElementById('chat-messages-feed');
  const liveChatForm = document.getElementById('live-chat-form');
  const chatAuthorInput = document.getElementById('chat-author-input');
  const chatMessageInput = document.getElementById('chat-message-input');
  const chatCountBadge = document.getElementById('chat-count-badge');
  const praiseBtns = document.querySelectorAll('.praise-btn');
  const floatingEmojisContainer = document.getElementById('floating-emojis');

  // State Variables
  let localStream = null;
  let isCameraActive = false;
  let isMuted = false;
  let currentFilterIndex = 0;
  const filterClasses = ['', 'filter-warm', 'filter-anointed'];
  const filterNames = ['Normal', 'Warm Glow', 'Anointed Glow'];
  let currentStreamState = null;
  let facingMode = 'user';

  // Check Local Storage for Saved Name
  if (localStorage.getItem('jcal_chat_author')) {
    chatAuthorInput.value = localStorage.getItem('jcal_chat_author');
  }

  // Check Auth Token for Admin Access
  function getToken() {
    return localStorage.getItem('jcal_admin_token');
  }

  function checkAdminStudioAccess() {
    const token = getToken();
    if (token) {
      if (adminStudioBar) adminStudioBar.style.display = 'block';
    } else {
      if (adminStudioBar) adminStudioBar.style.display = 'none';
    }
  }
  checkAdminStudioAccess();

  if (streamAdminBtn) {
    streamAdminBtn.addEventListener('click', () => {
      const token = getToken();
      if (!token) {
        window.location.href = 'index.html#admin';
      } else {
        if (adminStudioBar) {
          adminStudioBar.style.display = adminStudioBar.style.display === 'none' ? 'block' : 'none';
        }
      }
    });
  }

  // 1. WEBRTC LOCAL CAMERA & MICROPHONE STREAM CAPTURE
  async function startCameraStream() {
    try {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      const constraints = {
        video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      };
      localStream = await navigator.mediaDevices.getUserMedia(constraints);
      liveVideo.srcObject = localStream;
      liveVideo.style.display = 'block';
      standbyScreen.style.display = 'none';
      liveIframe.style.display = 'none';
      isCameraActive = true;
      if (btnToggleCam) btnToggleCam.textContent = 'Stop Camera & Mic';
      return true;
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Unable to access camera or microphone. Please check browser permissions.');
      isCameraActive = false;
      return false;
    }
  }

  function stopCameraStream() {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }
    liveVideo.srcObject = null;
    liveVideo.style.display = 'none';
    isCameraActive = false;
    if (btnToggleCam) btnToggleCam.textContent = 'Start Camera & Mic';
  }

  if (btnToggleCam) {
    btnToggleCam.addEventListener('click', () => {
      if (isCameraActive) {
        stopCameraStream();
        if (!currentStreamState || !currentStreamState.isLive) {
          standbyScreen.style.display = 'flex';
        }
      } else {
        startCameraStream();
      }
    });
  }

  if (previewCamBtn) {
    previewCamBtn.addEventListener('click', () => startCameraStream());
  }

  // Controls Handlers
  if (ctrlMuteBtn) {
    ctrlMuteBtn.addEventListener('click', () => {
      isMuted = !isMuted;
      liveVideo.muted = isMuted;
      ctrlMuteBtn.textContent = isMuted ? 'Sound Off' : 'Sound On';
    });
  }

  if (ctrlCamSwitch) {
    ctrlCamSwitch.addEventListener('click', async () => {
      facingMode = facingMode === 'user' ? 'environment' : 'user';
      if (isCameraActive) {
        await startCameraStream();
      }
    });
  }

  if (ctrlFilterBtn) {
    ctrlFilterBtn.addEventListener('click', () => {
      currentFilterIndex = (currentFilterIndex + 1) % filterClasses.length;
      liveVideo.className = 'video-element ' + filterClasses[currentFilterIndex];
      ctrlFilterBtn.textContent = `Filter: ${filterNames[currentFilterIndex]}`;
    });
  }

  if (ctrlFullscreenBtn) {
    ctrlFullscreenBtn.addEventListener('click', () => {
      const container = document.querySelector('.video-viewport-wrapper');
      if (container) {
        if (!document.fullscreenElement) {
          container.requestFullscreen().catch(err => console.error('Fullscreen error:', err));
        } else {
          document.exitFullscreen();
        }
      }
    });
  }

  // 2. LIVE BROADCAST STATE RE-SYNC & ADMIN BROADCAST CONTROL
  async function fetchStreamState() {
    try {
      const res = await fetch('/api/stream/state');
      if (res.ok) {
        currentStreamState = await res.json();
        renderStreamState(currentStreamState);
      }
    } catch (err) {
      console.error('Error fetching stream state:', err);
    }
  }

  // Production HLS Video Player & Socket.io Integration
  const hlsVideoPlayer = document.getElementById('live-hls-player');
  let hlsEngine = null;
  let socket = null;

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function hideStandbyScreen() {
    if (standbyScreen) {
      standbyScreen.classList.add('hidden');
      standbyScreen.style.setProperty('display', 'none', 'important');
    }
  }

  function showStandbyScreen() {
    if (standbyScreen) {
      standbyScreen.classList.remove('hidden');
      standbyScreen.style.display = 'flex';
    }
  }

  function startHlsPlayback(hlsUrl) {
    if (!hlsUrl || !hlsVideoPlayer) return;
    hideStandbyScreen();
    hlsVideoPlayer.style.display = 'block';

    if (Hls && Hls.isSupported()) {
      if (hlsEngine) hlsEngine.destroy();
      hlsEngine = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });
      hlsEngine.loadSource(hlsUrl);
      hlsEngine.attachMedia(hlsVideoPlayer);
      hlsEngine.on(Hls.Events.MANIFEST_PARSED, () => {
        hlsVideoPlayer.play().catch(() => {});
        setupQualitySelector();
      });
      hlsEngine.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hlsEngine.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hlsEngine.recoverMediaError();
              break;
            default:
              hlsEngine.destroy();
              break;
          }
        }
      });
    } else if (hlsVideoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
      hlsVideoPlayer.src = hlsUrl;
      hlsVideoPlayer.play().catch(() => {});
    }
  }

  // Quality Selector & Public Control Bar Event Handlers
  const qualitySelector = document.getElementById('quality-selector');
  const vctrlPlayBtn = document.getElementById('vctrl-play-btn');
  const vctrlMuteBtn = document.getElementById('vctrl-mute-btn');
  const vctrlVolumeSlider = document.getElementById('vctrl-volume-slider');
  const vctrlPipBtn = document.getElementById('vctrl-pip-btn');
  const vctrlFullscreenBtn = document.getElementById('vctrl-fullscreen-btn');

  function setupQualitySelector() {
    if (!hlsEngine || !qualitySelector) return;
    const levels = hlsEngine.levels;
    if (levels && levels.length > 0) {
      qualitySelector.innerHTML = '<option value="-1">Auto (Adaptive)</option>';
      levels.forEach((level, index) => {
        const height = level.height || 'SD';
        const opt = document.createElement('option');
        opt.value = index;
        opt.textContent = `${height}p HD`;
        qualitySelector.appendChild(opt);
      });
    }
  }

  if (qualitySelector) {
    qualitySelector.addEventListener('change', (e) => {
      if (hlsEngine) {
        hlsEngine.currentLevel = parseInt(e.target.value, 10);
      }
    });
  }

  if (vctrlPlayBtn && hlsVideoPlayer) {
    vctrlPlayBtn.addEventListener('click', () => {
      if (hlsVideoPlayer.paused) {
        hlsVideoPlayer.play();
        vctrlPlayBtn.textContent = '⏸';
      } else {
        hlsVideoPlayer.pause();
        vctrlPlayBtn.textContent = '▶';
      }
    });
  }

  if (vctrlMuteBtn && hlsVideoPlayer) {
    vctrlMuteBtn.addEventListener('click', () => {
      hlsVideoPlayer.muted = !hlsVideoPlayer.muted;
      vctrlMuteBtn.textContent = hlsVideoPlayer.muted ? '🔇' : '🔊';
    });
  }

  if (vctrlVolumeSlider && hlsVideoPlayer) {
    vctrlVolumeSlider.addEventListener('input', (e) => {
      hlsVideoPlayer.volume = parseFloat(e.target.value);
      hlsVideoPlayer.muted = (hlsVideoPlayer.volume === 0);
      if (vctrlMuteBtn) vctrlMuteBtn.textContent = hlsVideoPlayer.muted ? '🔇' : '🔊';
    });
  }

  if (vctrlPipBtn && hlsVideoPlayer) {
    vctrlPipBtn.addEventListener('click', async () => {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled) {
          await hlsVideoPlayer.requestPictureInPicture();
        }
      } catch (err) {
        console.error('PiP error:', err);
      }
    });
  }

  if (vctrlFullscreenBtn) {
    vctrlFullscreenBtn.addEventListener('click', () => {
      const container = document.querySelector('.video-viewport-wrapper');
      if (container) {
        if (!document.fullscreenElement) {
          container.requestFullscreen().catch(err => console.error('Fullscreen error:', err));
        } else {
          document.exitFullscreen();
        }
      }
    });
  }

  function stopHlsPlayback() {
    if (hlsEngine) {
      hlsEngine.destroy();
      hlsEngine = null;
    }
    if (hlsVideoPlayer) {
      hlsVideoPlayer.pause();
      hlsVideoPlayer.style.display = 'none';
    }
    showStandbyScreen();
  }

  // Socket.io Client Setup
  if (typeof io !== 'undefined') {
    socket = io();

    socket.on('viewerCount', (data) => {
      if (viewerCountPill && data && data.count !== undefined) {
        viewerCountPill.textContent = `${data.count} Watching`;
      }
    });

    socket.on('streamStateChanged', (state) => {
      if (state) {
        currentStreamState = state;
        renderStreamState(state);
      }
    });

    socket.on('chatHistory', (data) => {
      if (data && data.messages && chatMessagesFeed) {
        chatMessagesFeed.innerHTML = '';
        data.messages.forEach(msg => appendChatMessage(msg));
      }
    });

    socket.on('newChatMessage', (msg) => {
      appendChatMessage(msg);
    });

    socket.on('newReaction', (data) => {
      if (data && data.reaction) {
        spawnFloatingEmoji(data.reaction);
      }
    });

    socket.on('messageDeleted', (data) => {
      if (data && data.id) {
        const msgElem = document.getElementById(data.id);
        if (msgElem) msgElem.remove();
      }
    });
  }

  function appendChatMessage(msg) {
    if (!chatMessagesFeed || !msg) return;
    const msgDiv = document.createElement('div');
    msgDiv.id = msg.id || ('chat-' + Date.now());
    msgDiv.className = 'chat-message-item';

    const safeAuthor = escapeHTML(msg.author || 'Anonymous Believer');
    const safeMessage = escapeHTML(msg.message || '');
    const safeTime = escapeHTML(msg.timestamp || '');

    msgDiv.innerHTML = `
      <div class="chat-meta">
        <strong class="chat-author">${safeAuthor}</strong>
        <span class="chat-time">${safeTime}</span>
      </div>
      <p class="chat-text">${safeMessage}</p>
    `;

    chatMessagesFeed.appendChild(msgDiv);
    chatMessagesFeed.scrollTop = chatMessagesFeed.scrollHeight;

    if (chatCountBadge) {
      const count = chatMessagesFeed.querySelectorAll('.chat-message-item').length;
      chatCountBadge.textContent = String(count);
    }
  }

  function spawnFloatingEmoji(emoji) {
    if (!floatingEmojisContainer) return;
    const el = document.createElement('span');
    el.className = 'floating-emoji';
    el.textContent = emoji || '🙌';
    el.style.left = `${Math.floor(Math.random() * 80) + 10}%`;
    floatingEmojisContainer.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }

  function stopFetchingLiveFrames() {
    if (frameFetchInterval) {
      clearInterval(frameFetchInterval);
      frameFetchInterval = null;
    }
    if (liveCameraImg) liveCameraImg.style.display = 'none';
  }

  function renderStreamState(state) {
    const streamChatSection = document.getElementById('stream-chat-section');
    const streamContainer = document.querySelector('.stream-container');
    const publicVideoControls = document.getElementById('public-video-controls');

    if (streamSermonTitle) streamSermonTitle.textContent = state.title || 'Sunday Worship Service';
    if (streamSermonSpeaker) streamSermonSpeaker.textContent = `Ministering: ${state.speaker || 'Apostle Joyce B. Stewart'}`;
    if (viewerCountPill) viewerCountPill.textContent = `${state.viewerCount || 0} Viewers`;

    if (state.isLive) {
      // LIVE MODE: Show Live Stream, Chat Section & Controls
      if (globalStatusPill) {
        globalStatusPill.className = 'stream-status-pill live-mode';
        globalStatusPill.innerHTML = '<span class="live-pulse-dot"></span><span>LIVE SERVICE IN PROGRESS</span>';
      }

      hideStandbyScreen();

      // Show Chat Section & adjust grid layout
      if (streamChatSection) streamChatSection.style.display = 'flex';
      if (streamContainer) {
        streamContainer.classList.remove('standby-container-centered');
        if (window.innerWidth > 1024) {
          streamContainer.style.gridTemplateColumns = '1fr 390px';
        }
      }
      if (publicVideoControls) publicVideoControls.style.display = 'flex';

      // Unlock Chat & Praise Reaction Buttons when Live
      if (chatMessageInput) {
        chatMessageInput.disabled = false;
        chatMessageInput.placeholder = 'Share a prayer or message...';
      }
      if (chatAuthorInput) chatAuthorInput.disabled = false;
      praiseBtns.forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      });

      if (state.streamType === 'embed' || state.streamType === 'youtube') {
        stopHlsPlayback();
        hideStandbyScreen();
        if (liveIframe) liveIframe.style.display = 'block';
        if (state.embedUrl && liveIframe.src !== state.embedUrl) {
          liveIframe.src = state.embedUrl;
        }
      } else {
        if (liveIframe) liveIframe.style.display = 'none';
        startHlsPlayback(state.playbackUrl || state.hlsUrl);
      }
    } else {
      // STANDBY MODE: Hide Chat Section Completely & Show Standby Banner
      if (globalStatusPill) {
        globalStatusPill.className = 'stream-status-pill standby-mode';
        globalStatusPill.innerHTML = '<span>SERVICE STANDBY</span>';
      }

      stopHlsPlayback();

      // Hide Chat Panel & Public Video Controls when Stream is Offline
      if (streamChatSection) streamChatSection.style.display = 'none';
      if (streamContainer) {
        streamContainer.style.gridTemplateColumns = '1fr';
        streamContainer.classList.add('standby-container-centered');
      }
      if (publicVideoControls) publicVideoControls.style.display = 'none';

      // Show Standby Overlay & Hide Video Elements
      showStandbyScreen();
      if (liveIframe) liveIframe.style.display = 'none';
      if (liveCameraImg) liveCameraImg.style.display = 'none';
    }
  }

      // Lock Chat & Praise Reaction Buttons when Offline / Standby
      if (chatMessageInput) {
        chatMessageInput.disabled = true;
        chatMessageInput.placeholder = 'Live chat opens when broadcast begins...';
      }
      praiseBtns.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
      });
    }
  }

  if (btnSaveStudio) {
    btnSaveStudio.addEventListener('click', async () => {
      const token = getToken();
      const streamType = studioStreamType.value;
      const title = studioSermonTitle.value.trim();
      const speaker = studioSermonSpeaker.value.trim();

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
          alert('Broadcast stream info updated!');
          fetchStreamState();
        }
      } catch (err) {
        console.error('Save studio error:', err);
      }
    });
  }

  if (btnToggleLive) {
    btnToggleLive.addEventListener('click', async () => {
      const token = getToken();
      if (!token) return alert('Admin authentication required.');

      const newLiveState = !currentStreamState.isLive;

      if (newLiveState) {
        if (!isCameraActive || !localStream) {
          const started = await startCameraStream();
          if (!started || !localStream) {
            alert('⚠️ Camera and Microphone must be enabled and active before you can go live!');
            return;
          }
        }

        const hasVideo = localStream.getVideoTracks().some(t => t.enabled && t.readyState === 'live');
        const hasAudio = localStream.getAudioTracks().some(t => t.enabled && t.readyState === 'live');

        if (!hasVideo || !hasAudio) {
          alert('⚠️ Both an active Camera (video) and Microphone (audio) track are required to go live!');
          return;
        }
      }

      try {
        const res = await fetch('/api/stream/state', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ isLive: newLiveState, streamType: 'webrtc' })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          fetchStreamState();
        }
      } catch (err) {
        console.error('Toggle live error:', err);
      }
    });
  }

  // 3. EPHEMERAL LIVE CHAT & PRAISE EMOJI ANIMATIONS
  async function fetchLiveChat() {
    try {
      const res = await fetch('/api/stream/chat');
      if (res.ok) {
        const data = await res.json();
        renderLiveChat(data.messages || []);
      }
    } catch (err) {
      console.error('Fetch live chat error:', err);
    }
  }

  function renderLiveChat(messages) {
    if (chatCountBadge) chatCountBadge.textContent = `${messages.length} Messages`;
    if (!chatMessagesFeed) return;

    const token = getToken();
    chatMessagesFeed.innerHTML = messages.map(msg => `
      <div class="chat-msg-item" data-id="${msg.id}">
        <div class="chat-msg-header">
          <span class="chat-author">${msg.author}</span>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="chat-time">${msg.timestamp}</span>
            ${token ? `<button class="del-chat-btn" data-id="${msg.id}" title="Remove message">🗑 Delete</button>` : ''}
          </div>
        </div>
        <div class="chat-msg-body">
          ${msg.type === 'reaction' ? `<span class="chat-msg-reaction">${msg.reaction}</span>` : msg.message}
        </div>
      </div>
    `).join('');

    // Attach Admin Delete Handlers
    if (token) {
      chatMessagesFeed.querySelectorAll('.del-chat-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteChatMessage(btn.dataset.id));
      });
    }

    // Auto-scroll to bottom of chat
    chatMessagesFeed.scrollTop = chatMessagesFeed.scrollHeight;
  }

  async function deleteChatMessage(id) {
    const token = getToken();
    try {
      await fetch(`/api/stream/chat/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchLiveChat();
    } catch (err) {
      console.error('Delete chat error:', err);
    }
  }

  if (liveChatForm) {
    liveChatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const author = chatAuthorInput.value.trim();
      const message = chatMessageInput.value.trim();
      const submitBtn = liveChatForm.querySelector('button[type="submit"]');

      if (!author || !message) return;
      localStorage.setItem('jcal_chat_author', author);

      // Disable inputs and button while request is in-flight until response is answered
      if (chatAuthorInput) chatAuthorInput.disabled = true;
      if (chatMessageInput) chatMessageInput.disabled = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.origText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
      }

      function enableFormControls() {
        if (currentStreamState && currentStreamState.isLive) {
          if (chatAuthorInput) chatAuthorInput.disabled = false;
          if (chatMessageInput) {
            chatMessageInput.disabled = false;
            chatMessageInput.focus();
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.dataset.origText || 'Send';
          }
        }
      }

      if (socket) {
        socket.emit('sendChatMessage', { author, message });
        chatMessageInput.value = '';
        setTimeout(enableFormControls, 400);
      } else {
        try {
          await fetch('/api/stream/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ author, message })
          });
          chatMessageInput.value = '';
          await fetchLiveChat();
        } catch (err) {
          console.error('Chat error:', err);
        } finally {
          enableFormControls();
        }
      }
    });
  }

  // Praise Reaction Buttons & Floating Animations
  praiseBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const emoji = btn.dataset.emoji || btn.textContent.trim();
      const author = chatAuthorInput.value.trim() || 'Anonymous Believer';

      if (socket) {
        socket.emit('sendReaction', { reaction: emoji });
      }

      spawnFloatingEmoji(emoji);
    });
  });

  function spawnFloatingEmoji(emoji) {
    if (!floatingEmojisContainer) return;
    const item = document.createElement('div');
    item.className = 'floating-emoji-item';
    item.textContent = emoji;
    const randomLeft = Math.floor(Math.random() * 70) + 15;
    item.style.left = randomLeft + '%';
    floatingEmojisContainer.appendChild(item);

    setTimeout(() => {
      if (item.parentNode) item.parentNode.removeChild(item);
    }, 2800);
  }

  // Initial Fetch & Polling (Every 3 Seconds for Chat & Stream State)
  fetchStreamState();
  fetchLiveChat();

  setInterval(() => {
    fetchStreamState();
    fetchLiveChat();
  }, 3000);
});
