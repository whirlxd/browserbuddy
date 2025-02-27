class ReadingTracker {
  constructor() {
    this.settings = null;
    this.banner = null;
    this.breakOverlay = null;
    this.dragListeners = null;
    this.boundHandleMessage = this.handleMessage.bind(this);
    this.lastActivityTime = Date.now();
    this.activityListeners = [];
    
    this.initialize();
    this.setupMessageListener();
    this.setupActivityTracking();
  }

  async initialize() {
    this.settings = await StorageManager.getSettings();
    if (this.settings.enabled) {
      this.createBanner();
    }
    this.calculateAndDisplayReadingTime();
  }

  createBanner() {
    if (window.location.hostname === 'github.com') {
      return;
    }

    this.banner = document.createElement('div');
    this.banner.className = 'reading-banner';
    
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    const isDarkPage = this.isColorDark(bodyBg);
    this.banner.classList.add(isDarkPage ? 'light-theme' : 'dark-theme');
    
    const textContent = document.createElement('span');
    this.banner.appendChild(textContent);
    
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    
    const handleDragStart = (e) => {
      isDragging = true;
      startX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
      currentX = startX;
      this.banner.style.transition = 'none';
    };
    
    const handleDrag = (e) => {
      if (!isDragging) return;
      
      const x = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
      const diff = x - startX;
      
      if (diff < 0) return;
      
      currentX = x;
      this.banner.style.transform = `translateX(${diff}px)`;
    };
    
    const handleDragEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      
      this.banner.style.transition = 'transform 0.3s ease';
      
      const diff = currentX - startX;
      if (diff > this.banner.offsetWidth * 0.5) {
        this.banner.style.transform = 'translateX(100%)';
        setTimeout(() => {
          this.cleanupBanner();
        }, 300);
      } else {
        this.banner.style.transform = 'translateX(0)';
      }
    };
    
    this.dragListeners = {
      mousedown: handleDragStart,
      touchstart: handleDragStart,
      mousemove: handleDrag,
      touchmove: handleDrag,
      mouseup: handleDragEnd,
      touchend: handleDragEnd
    };
    
    this.banner.addEventListener('mousedown', this.dragListeners.mousedown);
    this.banner.addEventListener('touchstart', this.dragListeners.touchstart);
    
    document.addEventListener('mousemove', this.dragListeners.mousemove);
    document.addEventListener('touchmove', this.dragListeners.touchmove);
    
    document.addEventListener('mouseup', this.dragListeners.mouseup);
    document.addEventListener('touchend', this.dragListeners.touchend);
    
    document.body.appendChild(this.banner);
    
    setTimeout(() => {
      this.banner.classList.add('visible');
    }, 500);
    
    this.bannerText = textContent;
  }

  cleanupBanner() {
    if (!this.banner) return;
    
    if (this.dragListeners) {
      this.banner.removeEventListener('mousedown', this.dragListeners.mousedown);
      this.banner.removeEventListener('touchstart', this.dragListeners.touchstart);
      document.removeEventListener('mousemove', this.dragListeners.mousemove);
      document.removeEventListener('touchmove', this.dragListeners.touchmove);
      document.removeEventListener('mouseup', this.dragListeners.mouseup);
      document.removeEventListener('touchend', this.dragListeners.touchend);
    }
    
    this.banner.remove();
    this.banner = null;
    this.bannerText = null;
    this.dragListeners = null;
  }

  calculateAndDisplayReadingTime() {
    const text = ReadingUtils.getVisibleText(document.body);
    const wordCount = ReadingUtils.countWords(text);
    const readingTime = Math.ceil(wordCount / this.settings.readingSpeed);
    
    if (this.bannerText) {
      this.bannerText.textContent = `~ ${ReadingUtils.formatTime(readingTime)} · ${wordCount.toLocaleString()} words`;
      this.bannerText.style.animation = 'none';
      this.bannerText.offsetHeight;
      this.bannerText.style.animation = 'highlight 0.5s ease';
    }
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener(this.boundHandleMessage);
  }

  handleMessage(message, sender, sendResponse) {
    if (message.action === 'settingsUpdated') {
      this.settings = message.settings;
      if (this.settings.enabled) {
        this.cleanupBanner();
        this.createBanner();
        this.calculateAndDisplayReadingTime();
      } else {
        this.cleanupBanner();
      }
    } else if (message.action === 'showBreak') {
      this.showBreakReminder(message.breakInterval);
    } else if (message.action === 'dismissBreak') {
      this.dismissBreak();
    }
  }

  showBreakReminder() {
    const audio = new Audio(chrome.runtime.getURL('sounds/break-alert.mp3'));
    audio.volume = 0.5;
    audio.play().catch(e => console.log('Audio play failed:', e));
    
    this.breakOverlay = document.createElement('div');
    this.breakOverlay.className = 'break-overlay';
    
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    const isDarkPage = this.isColorDark(bodyBg);
    
    this.breakOverlay.innerHTML = `
      <div class="break-content ${isDarkPage ? 'light-theme' : 'dark-theme'}">
        <h2>Time for a Break</h2>
        <div class="break-actions">
          <button id="dismissBreak">Done</button>
          <button id="snoozeBreak">Snooze</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.breakOverlay);
    
    document.getElementById('dismissBreak').addEventListener('click', () => this.dismissBreak());
    document.getElementById('snoozeBreak').addEventListener('click', () => this.snoozeBreak());
  }

  dismissBreak() {
    if (this.breakOverlay) {
      this.breakOverlay.remove();
      this.breakOverlay = null;
    }
    chrome.runtime.sendMessage({ action: 'breakDismissed' });
  }

  snoozeBreak() {
    this.dismissBreak();
    chrome.runtime.sendMessage({ action: 'breakSnoozed' });
  }

  isColorDark(color) {
    const rgb = color.match(/\d+/g);
    if (rgb) {
      const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
      return luminance < 0.5;
    }
    return false;
  }

  setupActivityTracking() {
    this.cleanupActivityListeners();
    
    const reportActivity = () => {
      const now = Date.now();
      if (now - this.lastActivityTime > 500) {
        if (chrome.runtime?.id && !chrome.runtime.lastError) {
          chrome.runtime.sendMessage({ action: 'userActivity' })
            .catch(() => {});
        }
        this.lastActivityTime = now;
      }
    };
    
    const debouncedReportActivity = ReadingUtils.debounce(reportActivity, 500);
    
    const events = ['scroll', 'mousemove', 'keypress', 'click'];
    events.forEach(event => {
      window.addEventListener(event, debouncedReportActivity, { passive: true });
      this.activityListeners.push({ event, handler: debouncedReportActivity });
    });
  }

  cleanupActivityListeners() {
    if (this.activityListeners && this.activityListeners.length > 0) {
      this.activityListeners.forEach(({ event, handler }) => {
        try {
          window.removeEventListener(event, handler);
        } catch (e) {}
      });
      this.activityListeners = [];
    }
  }

  cleanup() {
    this.cleanupBanner();
    
    if (this.boundHandleMessage) {
      chrome.runtime.onMessage.removeListener(this.boundHandleMessage);
    }
    
    if (this.breakOverlay) {
      this.breakOverlay.remove();
      this.breakOverlay = null;
    }

    this.cleanupActivityListeners();
  }
}

let tracker;
window.addEventListener('load', () => {
  tracker = new ReadingTracker();
});

window.addEventListener('unload', () => {
  if (tracker) {
    tracker.cleanup();
  }
}); 