const StorageManager = {
  async saveSettings(settings) {
    try {
      await chrome.storage.sync.set(settings);
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  },
  async getSettings() {
    try {
      const settings = await chrome.storage.sync.get();
      return settings;
    } catch (error) {
      console.error('Error getting settings:', error);
      throw error;
    }
  }
};

class BackgroundManager {
  constructor() {
    this.initialize();
  }

  initialize() {
    chrome.runtime.onInstalled.addListener(this.handleInstall.bind(this));
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
  }

  async handleInstall(details) {
    if (details.reason === 'install') {
      await StorageManager.saveSettings({
        readingSpeed: 200,
        breakInterval: 20
      });

    }
  }

  handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
      chrome.tabs.sendMessage(tabId, { action: 'pageLoaded' }).catch(() => {});
    }
  }
}

class BreakManager {
  constructor() {
    this.settings = null;
    this.lastActivity = Date.now();
    this.isBreakActive = false;
    this.checkInterval = null;
    this.isWindowActive = true;
    this.breakShownTime = null;
    this.lastUserAction = Date.now();
    this.activeTime = 0;
    
    this.initialize();
    this.setupActivityTracking();
  }

  async initialize() {
    const settings = await StorageManager.getSettings();
    this.settings = {
      readingSpeed: settings.readingSpeed || 200,
      breakInterval: settings.breakInterval || 5,
      enabled: settings.enabled !== undefined ? settings.enabled : true
    };
  }

  setupActivityTracking() {
    this.cleanup();
    this.boundUpdateActivity = this.updateActivity.bind(this);
    this.boundCheckBreakTime = this.checkBreakTime.bind(this);
    
    chrome.tabs.onActivated.addListener(this.boundUpdateActivity);
    chrome.tabs.onUpdated.addListener(this.boundUpdateActivity);
    
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'userActivity') {
        this.lastUserAction = Date.now();
        if (this.isWindowActive) {
          this.activeTime += 1;
        }
      }
    });
    
    chrome.tabs.onActivated.addListener(() => {
      if (this.isBreakActive && this.breakShownTime) {
        const timeShown = (Date.now() - this.breakShownTime) / 1000;
        if (timeShown > 0.5) {
          this.dismissBreak();
          this.activeTime = 0;
        }
      }
    });
    
    chrome.windows.onFocusChanged.addListener((windowId) => {
      this.isWindowActive = windowId !== chrome.windows.WINDOW_ID_NONE;
      if (!this.isWindowActive) {
        this.lastUserAction = Date.now();
      }
      this.boundUpdateActivity();
    });

    this.checkInterval = setInterval(this.boundCheckBreakTime, 1000);
  }

  cleanup() {
    if (this.boundUpdateActivity) {
      chrome.tabs.onActivated.removeListener(this.boundUpdateActivity);
      chrome.tabs.onUpdated.removeListener(this.boundUpdateActivity);
    }
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  updateActivity() {
    if (this.isWindowActive) {
      this.lastActivity = Date.now();
    }
  }

  async checkBreakTime() {
    if (!this.settings?.enabled || !this.isWindowActive) return;
    
    const idleTime = (Date.now() - this.lastUserAction) / 1000;
    if (idleTime > 30) {
      this.activeTime = 0;
      return;
    }
    
    const activeTimeMinutes = this.activeTime / 60;
    
    if (activeTimeMinutes >= this.settings.breakInterval && !this.isBreakActive) {
      this.showBreakReminder();
      this.activeTime = 0;
    }
  }

  async showBreakReminder() {
    this.isBreakActive = true;
    this.breakShownTime = Date.now();
    this.lastUserAction = Date.now();
    
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'showBreak',
          breakInterval: this.settings.breakInterval
        });
      } catch (e) {}
    }
  }

  async dismissBreak() {
    this.isBreakActive = false;
    this.lastActivity = Date.now();
    this.breakShownTime = null;
    this.activeTime = 0;
    
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'dismissBreak'
        });
      } catch (e) {}
    }
  }

  handleBreakDismissed() {
    this.dismissBreak();
  }

  async handleBreakSnoozed() {
    this.dismissBreak();
    this.activeTime = Math.max(0, (this.settings.breakInterval - 5) * 60);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'settingsUpdated') {
    breakManager.settings = message.settings;
  } else if (message.action === 'breakSnoozed') {
    breakManager.handleBreakSnoozed();
  } else if (message.action === 'breakDismissed') {
    breakManager.handleBreakDismissed();
  }
});

new BackgroundManager();
const breakManager = new BreakManager(); 