document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const cmsModal = document.getElementById('cms-modal');
  const openCmsBtn = document.getElementById('open-cms-btn');
  const closeCmsBtn = document.getElementById('close-cms-btn');
  
  const toggleBroadcastCms = document.getElementById('toggle-broadcast-cms');
  const broadcastSection = document.getElementById('broadcasting-system-section');
  const broadcastStatusText = document.getElementById('broadcast-status-text');

  const toggleLiveStateBtn = document.getElementById('toggle-live-state-btn');
  const broadcastPill = document.getElementById('broadcast-pill');
  const videoStateDisplay = document.getElementById('video-state-display');

  // 1. CMS Modal Open / Close Handlers
  if (openCmsBtn && cmsModal) {
    openCmsBtn.addEventListener('click', () => {
      cmsModal.style.display = 'flex';
    });
  }

  if (closeCmsBtn && cmsModal) {
    closeCmsBtn.addEventListener('click', () => {
      cmsModal.style.display = 'none';
    });
  }

  // Close modal when clicking backdrop
  if (cmsModal) {
    cmsModal.addEventListener('click', (e) => {
      if (e.target === cmsModal) {
        cmsModal.style.display = 'none';
      }
    });
  }

  // 2. Dynamic Broadcasting System Toggle (CMS Switch)
  if (toggleBroadcastCms && broadcastSection) {
    toggleBroadcastCms.addEventListener('change', (e) => {
      const isEnabled = e.target.checked;
      if (isEnabled) {
        broadcastSection.style.display = 'block';
        if (broadcastStatusText) broadcastStatusText.textContent = 'Broadcasting System Enabled';
      } else {
        broadcastSection.style.display = 'none';
        if (broadcastStatusText) broadcastStatusText.textContent = 'Broadcasting System Disabled';
      }
    });
  }

  // 3. Toggle Live vs Standby State
  let isLive = false;
  if (toggleLiveStateBtn) {
    toggleLiveStateBtn.addEventListener('click', () => {
      isLive = !isLive;
      if (isLive) {
        if (broadcastPill) {
          broadcastPill.className = 'broadcast-pill live';
          broadcastPill.innerHTML = '🔴 LIVE BROADCAST ACTIVE';
        }
        if (videoStateDisplay) {
          videoStateDisplay.innerHTML = `
            <div style="text-align:center;">
              <span style="font-size: 2.5rem; display:block; margin-bottom:8px;">📡</span>
              <strong style="font-size: 1.2rem; color: #ffffff;">LIVE STREAM IN PROGRESS</strong>
              <p style="color: #cbd5e1; font-size: 0.9rem; margin-top:4px;">Broadcasting HD Stream • 1080p 60FPS</p>
            </div>
          `;
        }
        toggleLiveStateBtn.textContent = '⏹ Stop Live Broadcast';
        toggleLiveStateBtn.className = 'btn btn-secondary';
      } else {
        if (broadcastPill) {
          broadcastPill.className = 'broadcast-pill standby';
          broadcastPill.innerHTML = 'SERVICE STANDBY';
        }
        if (videoStateDisplay) {
          videoStateDisplay.innerHTML = `
            <div style="text-align:center;">
              <span style="font-size: 2.5rem; display:block; margin-bottom:8px;">🎥</span>
              <strong style="font-size: 1.2rem; color: #ffffff;">BROADCAST STANDBY MODE</strong>
              <p style="color: #cbd5e1; font-size: 0.9rem; margin-top:4px;">Stream studio ready for next live service</p>
            </div>
          `;
        }
        toggleLiveStateBtn.textContent = '🔴 Start Live Stream';
        toggleLiveStateBtn.className = 'btn btn-accent';
      }
    });
  }
});
