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
        breakInterval: 0.1
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
    this.breakShownTime = null;
    this.lastUserAction = Date.now();
    this.activeTime = 0;
    this.afkTimeout = null;
    this.maxBreakDuration = 5 * 60 * 1000;
    this.afkThreshold = 2 * 60 * 1000;
    this.gracePeriod = 300;
    
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
    console.log('[Readcess] Settings initialized:', this.settings);
  }

  setupActivityTracking() {
    this.cleanup();
    this.boundUpdateActivity = this.updateActivity.bind(this);
    this.boundCheckBreakTime = this.checkBreakTime.bind(this);
    
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'userActivity') {
        this.lastUserAction = Date.now();
        if (!this.graceEndTime || Date.now() > this.graceEndTime) {
          this.activeTime += 1;
          console.log('[Readcess] Active time:', this.activeTime);
        }
      }
    });
    
    this.checkInterval = setInterval(this.boundCheckBreakTime, 1000);
  }

  cleanup() {
    if (this.afkTimeout) {
      clearTimeout(this.afkTimeout);
      this.afkTimeout = null;
    }
    
    if (this.boundUpdateActivity) {
      chrome.tabs.onActivated.removeListener(this.boundUpdateActivity);
      chrome.tabs.onUpdated.removeListener(this.boundUpdateActivity);
    }
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  updateActivity() {
    this.lastActivity = Date.now();
  }

  async checkBreakTime() {
    if (!this.settings?.enabled) return;
    
    if (this.graceEndTime && Date.now() < this.graceEndTime) {
      console.log('[Readcess] In grace period, seconds remaining:', 
        Math.round((this.graceEndTime - Date.now()) / 1000));
      return;
    }
    this.graceEndTime = null;

    const breakIntervalSeconds = this.settings.breakInterval * 60;
    console.log('[Readcess] Current active time:', this.activeTime, 'Target:', breakIntervalSeconds);

    if (this.activeTime >= breakIntervalSeconds && !this.isBreakActive) {
      console.log('[Readcess] Break triggered after', this.activeTime, 'seconds');
      this.showBreakReminder();
      this.activeTime = 0;
    }
  }

  async showBreakReminder() {
    console.log('[Readcess] Showing break reminder');
    this.isBreakActive = true;
    this.breakShownTime = Date.now();
    this.lastUserAction = Date.now();
    
    if (this.afkTimeout) {
      clearTimeout(this.afkTimeout);
    }
    
    this.afkTimeout = setTimeout(() => {
      if (this.isBreakActive) {
        console.log('[Readcess] Auto-dismissing break due to no response');
        this.dismissBreak();
      }
    }, this.maxBreakDuration);
    
    const tabs = await chrome.tabs.query({
      active: true,
      url: ['http://*/*', 'https://*/*']
    });
    
    for (const tab of tabs) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' })
          .catch(() => null);
        
        if (response) {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'showBreak',
            breakInterval: this.settings.breakInterval
          }).catch(e => {
            console.log('[Readcess] Tab not ready for messages:', tab.id);
          });
        }
      } catch (e) {
        console.log('[Readcess] Tab not available:', tab.id);
      }
    }
  }

  async dismissBreak() {
    if (this.afkTimeout) {
      clearTimeout(this.afkTimeout);
      this.afkTimeout = null;
    }
    
    this.isBreakActive = false;
    this.lastActivity = Date.now();
    this.breakShownTime = null;
    this.activeTime = 0;
    this.graceEndTime = Date.now() + (this.gracePeriod * 1000);
    console.log('[Readcess] Break dismissed, grace period started for', this.gracePeriod, 'seconds');
    
    const tabs = await chrome.tabs.query({
      active: true,
      url: ['http://*/*', 'https://*/*']
    });
    
    for (const tab of tabs) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' })
          .catch(() => null);
        
        if (response) {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'dismissBreak'
          }).catch(() => {});
        }
      } catch (e) {}
    }
  }

  handleBreakDismissed() {
    this.dismissBreak();
  }

  async handleBreakSnoozed() {
    this.dismissBreak();
    this.activeTime = Math.max(0, (this.settings.breakInterval * 60) - 10);
    console.log('[Readcess] Break snoozed, next break in 10 seconds');
  }

  validateSettings(readingSpeed, breakInterval) {
    if (isNaN(readingSpeed) || readingSpeed < 100 || readingSpeed > 1000) {
      this.showStatus('Reading speed must be between 100 and 1000 WPM', 'error');
      return false;
    }

    if (isNaN(breakInterval) || breakInterval < 0.1 || breakInterval > 480) {
      this.showStatus('Break interval must be between 6 seconds and 8 hours', 'error');
      return false;
    }

    return true;
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