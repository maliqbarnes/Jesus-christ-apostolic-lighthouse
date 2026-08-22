document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const studioVideo = document.getElementById('studio-video-element');
  const studioStandbyScreen = document.getElementById('studio-standby-screen');
  const studioBtnCam = document.getElementById('studio-btn-cam');
  const studioBtnMic = document.getElementById('studio-btn-mic');
  const studioBtnFilter = document.getElementById('studio-btn-filter');
  const studioBtnMasterLive = document.getElementById('studio-btn-master-live');
  const studioBtnSaveMeta = document.getElementById('studio-btn-save-meta');
  
  const studioStreamType = document.getElementById('studio-stream-type');
  const studioSermonTitle = document.getElementById('studio-sermon-title');
  const studioSermonSpeaker = document.getElementById('studio-sermon-speaker');

  const studioLivePill = document.getElementById('studio-live-pill');
  const studioLivePillText = document.getElementById('studio-live-pill-text');

  const statViewers = document.getElementById('stat-viewers');
  const statTimer = document.getElementById('stat-timer');
  const statReactions = document.getElementById('stat-reactions');
  const studioChatFeed = document.getElementById('studio-chat-feed');
  const studioChatCount = document.getElementById('studio-chat-count');

  const selectCamera = document.getElementById('select-camera');
  const selectMic = document.getElementById('select-mic');

  // State Variables
  let localStream = null;
  let isCamActive = false;
  let isMicMuted = false;
  let currentFilterIndex = 0;
  const filterClasses = ['', 'filter-warm', 'filter-anointed'];
  const filterNames = ['Normal', 'Warm Glow', 'Anointed Glow'];
  let currentStreamState = null;
  let timerInterval = null;
  let broadcastSeconds = 0;

  // Check Admin Token
  function getToken() {
    return localStorage.getItem('jcal_admin_token');
  }

  function checkAdminAccess() {
    const token = getToken();
    if (!token) {
      alert('Admin access required. Please log into the Admin Portal first.');
      window.location.href = 'index.html#admin';
    }
  }
  checkAdminAccess();

  // Populate Input Media Devices
  async function populateMediaDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      selectCamera.innerHTML = '';
      selectMic.innerHTML = '';

      devices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        if (device.kind === 'videoinput') {
          option.text = device.label || `Camera ${selectCamera.length + 1}`;
          selectCamera.appendChild(option);
        } else if (device.kind === 'audioinput') {
          option.text = device.label || `Microphone ${selectMic.length + 1}`;
          selectMic.appendChild(option);
        }
      });
    } catch (err) {
      console.error('Error enumerating devices:', err);
    }
  }
  populateMediaDevices();

  // Start Camera Stream
  async function startCamera() {
    try {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      const constraints = {
        video: selectCamera.value ? { deviceId: { exact: selectCamera.value } } : true,
        audio: selectMic.value ? { deviceId: { exact: selectMic.value } } : true
      };
      localStream = await navigator.mediaDevices.getUserMedia(constraints);
      studioVideo.srcObject = localStream;
      studioVideo.style.display = 'block';
      studioStandbyScreen.style.display = 'none';
      isCamActive = true;
      studioBtnCam.textContent = '⏹ Stop Camera & Mic';
    } catch (err) {
      console.error('Camera start error:', err);
      alert('Unable to access selected camera/mic. Please verify browser permissions.');
    }
  }

  function stopCamera() {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }
    studioVideo.srcObject = null;
    studioVideo.style.display = 'none';
    studioStandbyScreen.style.display = 'block';
    isCamActive = false;
    studioBtnCam.textContent = '📷 Start Camera & Mic';
  }

  if (studioBtnCam) {
    studioBtnCam.addEventListener('click', () => {
      if (isCamActive) stopCamera();
      else startCamera();
    });
  }

  if (studioBtnMic) {
    studioBtnMic.addEventListener('click', () => {
      if (localStream) {
        const audioTracks = localStream.getAudioTracks();
        if (audioTracks.length > 0) {
          isMicMuted = !isMicMuted;
          audioTracks[0].enabled = !isMicMuted;
          studioBtnMic.textContent = isMicMuted ? '🎙 Unmute Mic' : '🎙 Mute Mic';
        }
      }
    });
  }

  if (studioBtnFilter) {
    studioBtnFilter.addEventListener('click', () => {
      currentFilterIndex = (currentFilterIndex + 1) % filterClasses.length;
      studioVideo.className = 'video-element ' + filterClasses[currentFilterIndex];
      studioBtnFilter.textContent = `✨ Filter: ${filterNames[currentFilterIndex]}`;
    });
  }

  // Stream State Handlers & Polling
  async function fetchStreamState() {
    try {
      const res = await fetch('/api/stream/state');
      if (res.ok) {
        currentStreamState = await res.json();
        renderStreamState(currentStreamState);
      }
    } catch (err) {
      console.error('Fetch stream state error:', err);
    }
  }

  // Canvas Frame Broadcasting Loop
  const hiddenCanvas = document.createElement('canvas');
  const hiddenCtx = hiddenCanvas.getContext('2d');
  let frameBroadcastInterval = null;

  function startFrameBroadcasting() {
    if (frameBroadcastInterval) return;
    frameBroadcastInterval = setInterval(() => {
      if (isCamActive && studioVideo && studioVideo.videoWidth > 0 && currentStreamState && currentStreamState.isLive) {
        hiddenCanvas.width = 640;
        hiddenCanvas.height = 360;
        hiddenCtx.drawImage(studioVideo, 0, 0, 640, 360);
        const frameData = hiddenCanvas.toDataURL('image/jpeg', 0.65);
        const token = getToken();

        if (token && frameData) {
          fetch('/api/stream/frame', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ frame: frameData })
          }).catch(() => {});
        }
      }
    }, 120);
  }

  function stopFrameBroadcasting() {
    if (frameBroadcastInterval) {
      clearInterval(frameBroadcastInterval);
      frameBroadcastInterval = null;
    }
  }

  function renderStreamState(state) {
    if (!state) return;
    if (studioSermonTitle && document.activeElement !== studioSermonTitle) studioSermonTitle.value = state.title || '';
    if (studioSermonSpeaker && document.activeElement !== studioSermonSpeaker) studioSermonSpeaker.value = state.speaker || '';
    if (studioStreamType) studioStreamType.value = state.streamType || 'webrtc';
    
    // 1. Real Viewer Count
    if (statViewers) statViewers.textContent = `${state.viewerCount || 0} Watching`;

    // 2. Real Praise Reaction Count
    if (statReactions) statReactions.textContent = `${state.reactionCount || 0} Received`;

    // 3. Hardware Video Resolution Detection
    const statResolution = document.getElementById('stat-resolution');
    if (statResolution) {
      if (localStream && localStream.getVideoTracks().length > 0) {
        const settings = localStream.getVideoTracks()[0].getSettings();
        const w = settings.width || 1280;
        const h = settings.height || 720;
        const fps = Math.round(settings.frameRate || 30);
        const label = h >= 1080 ? '1080p Full HD' : h >= 720 ? '720p HD' : `${w}x${h}`;
        statResolution.textContent = `${label} • ${fps} FPS`;
      } else {
        statResolution.textContent = 'Standby / Offline';
      }
    }

    // 4. Exact Broadcast Duration Timer
    if (state.isLive) {
      if (studioLivePill) {
        studioLivePill.className = 'stream-status-pill live-mode';
        studioLivePillText.innerHTML = '<span class="live-pulse-dot"></span><span>🔴 BROADCASTING LIVE</span>';
      }
      if (studioBtnMasterLive) {
        studioBtnMasterLive.textContent = '⏹ END BROADCAST';
        studioBtnMasterLive.className = 'btn danger';
      }

      startFrameBroadcasting();

      if (state.startTime) {
        const elapsedSecs = Math.max(0, Math.floor((Date.now() - state.startTime) / 1000));
        const hrs = String(Math.floor(elapsedSecs / 3600)).padStart(2, '0');
        const mins = String(Math.floor((elapsedSecs % 3600) / 60)).padStart(2, '0');
        const secs = String(elapsedSecs % 60).padStart(2, '0');
        if (statTimer) statTimer.textContent = `${hrs}:${mins}:${secs}`;
      }
    } else {
      if (studioLivePill) {
        studioLivePill.className = 'stream-status-pill standby-mode';
        studioLivePillText.textContent = '⏳ STANDBY / OFFLINE';
      }
      if (studioBtnMasterLive) {
        studioBtnMasterLive.textContent = '🔴 GO LIVE BROADCAST';
        studioBtnMasterLive.className = 'btn primary';
      }
      stopFrameBroadcasting();
      if (statTimer) statTimer.textContent = '00:00:00';
    }
  }

  // Master Live Trigger
  if (studioBtnMasterLive) {
    studioBtnMasterLive.addEventListener('click', async () => {
      const token = getToken();
      if (!token) return alert('Admin authentication required.');

      const newLiveState = !(currentStreamState && currentStreamState.isLive);
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
          if (newLiveState && !isCamActive) {
            await startCamera();
          }
          fetchStreamState();
        }
      } catch (err) {
        console.error('Master live toggle error:', err);
      }
    });
  }

  // Save Stream Info
  if (studioBtnSaveMeta) {
    studioBtnSaveMeta.addEventListener('click', async () => {
      const token = getToken();
      if (!token) return alert('Admin authentication required.');

      const title = studioSermonTitle.value.trim();
      const speaker = studioSermonSpeaker.value.trim();
      const streamType = studioStreamType.value;

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
          alert('Broadcast metadata updated successfully!');
          fetchStreamState();
        }
      } catch (err) {
        console.error('Save meta error:', err);
      }
    });
  }

  // Fetch & Moderate Live Chat
  async function fetchStudioChat() {
    try {
      const res = await fetch('/api/stream/chat');
      if (res.ok) {
        const data = await res.json();
        renderStudioChat(data.messages || []);
      }
    } catch (err) {
      console.error('Fetch studio chat error:', err);
    }
  }

  function renderStudioChat(messages) {
    if (studioChatCount) studioChatCount.textContent = `${messages.length} Messages`;
    if (statReactions) {
      const reactionCount = messages.filter(m => m.type === 'reaction').length;
      statReactions.textContent = `${reactionCount} Received`;
    }
    if (!studioChatFeed) return;

    studioChatFeed.innerHTML = messages.map(msg => `
      <div class="chat-msg-item" data-id="${msg.id}">
        <div class="chat-msg-header">
          <span class="chat-author">${msg.author}</span>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="chat-time">${msg.timestamp}</span>
            <button class="del-chat-btn" data-id="${msg.id}" title="Remove message">🗑 Delete</button>
          </div>
        </div>
        <div class="chat-msg-body">
          ${msg.type === 'reaction' ? `<span class="chat-msg-reaction">${msg.reaction}</span>` : msg.message}
        </div>
      </div>
    `).join('');

    studioChatFeed.querySelectorAll('.del-chat-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteChatMessage(btn.dataset.id));
    });
  }

  async function deleteChatMessage(id) {
    const token = getToken();
    try {
      await fetch(`/api/stream/chat/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchStudioChat();
    } catch (err) {
      console.error('Delete chat error:', err);
    }
  }

  // Initial Data Fetch & Polling
  fetchStreamState();
  fetchStudioChat();

  setInterval(() => {
    fetchStreamState();
    fetchStudioChat();
  }, 3000);
});
