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

  const liveCameraImg = document.getElementById('live-camera-img');
  let frameFetchInterval = null;
  let isFetchingFrame = false;

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

  function startFetchingLiveFrames() {
    hideStandbyScreen();
    if (frameFetchInterval) return;
    frameFetchInterval = setInterval(async () => {
      if (isFetchingFrame) return; // Skip tick if previous GET request is still in flight
      if (currentStreamState && currentStreamState.isLive) {
        isFetchingFrame = true;
        try {
          const res = await fetch('/api/stream/frame');
          if (res.status === 200) {
            const data = await res.json();
            if (data.frame && liveCameraImg) {
              liveCameraImg.src = data.frame;
              liveCameraImg.style.display = 'block';
              hideStandbyScreen();
            }
          }
        } catch (err) {
          console.error('Frame fetch error:', err);
        } finally {
          isFetchingFrame = false;
        }
      }
    }, 75);
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
    if (streamSermonSpeaker) streamSermonSpeaker.textContent = `Ministering: ${state.speaker || 'JCAL Ministries'}`;
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
      if (streamContainer && window.innerWidth > 1024) {
        streamContainer.style.gridTemplateColumns = '1fr 390px';
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

      if (state.streamType === 'webrtc') {
        liveIframe.style.display = 'none';
        hideStandbyScreen();
        startFetchingLiveFrames();
      } else if (state.streamType === 'embed' || state.streamType === 'youtube') {
        stopFetchingLiveFrames();
        hideStandbyScreen();
        if (liveVideo) liveVideo.style.display = 'none';
        if (liveIframe) liveIframe.style.display = 'block';
        if (state.embedUrl && liveIframe.src !== state.embedUrl) {
          liveIframe.src = state.embedUrl;
        }
      }
    } else {
      // STANDBY MODE: Hide Chat Section Completely & Show Standby Banner
      if (globalStatusPill) {
        globalStatusPill.className = 'stream-status-pill standby-mode';
        globalStatusPill.innerHTML = '<span>SERVICE STANDBY</span>';
      }

      stopFetchingLiveFrames();

      // Hide Chat Panel & Public Video Controls when Stream is Offline
      if (streamChatSection) streamChatSection.style.display = 'none';
      if (streamContainer) streamContainer.style.gridTemplateColumns = '1fr';
      if (publicVideoControls) publicVideoControls.style.display = 'none';

      // Show Standby Overlay & Hide Video Elements
      showStandbyScreen();
      if (liveVideo) liveVideo.style.display = 'none';
      if (liveIframe) liveIframe.style.display = 'none';

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

      if (!author || !message) return;
      localStorage.setItem('jcal_chat_author', author);

      try {
        const res = await fetch('/api/stream/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ author, message })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          chatMessageInput.value = '';
          fetchLiveChat();
        }
      } catch (err) {
        console.error('Send chat message error:', err);
      }
    });
  }

  // Praise Reaction Buttons & Floating Animations
  praiseBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const reaction = btn.dataset.reaction;
      const author = chatAuthorInput.value.trim() || 'Believer';

      spawnFloatingEmoji(reaction);

      try {
        await fetch('/api/stream/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ author, reaction })
        });
        fetchLiveChat();
      } catch (err) {
        console.error('Reaction send error:', err);
      }
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
