class ReadingUtils {
  static getVisibleText(element) {
    if (element.nodeType === Node.TEXT_NODE) {
      return element.textContent.trim();
    }
    
    if (element.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    if (element.isContentEditable ||
        element.contentEditable === 'true' ||
        element.tagName === 'TEXTAREA' ||
        element.tagName === 'INPUT' ||
        element.tagName === 'SELECT' ||
        element.closest('form') ||
        element.getAttribute('role') === 'textbox' ||
        element.hasAttribute('contenteditable')) {
      return '';
    }

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return '';
    }

    const skipTags = [
      'script', 'style', 'noscript', 'nav', 'header', 'footer',
      'code', 'pre', 'iframe', 'aside', 'button',
      'input', 'textarea', 'select', 'option'
    ];
    
    const tagName = element.tagName.toLowerCase();
    const classAndId = (element.className + ' ' + element.id).toLowerCase();
    
    if (skipTags.includes(tagName) ||
        classAndId.includes('comments') ||
        classAndId.includes('sidebar') ||
        classAndId.includes('related') ||
        classAndId.includes('share') ||
        classAndId.includes('newsletter') ||
        classAndId.includes('advertisement') ||
        classAndId.includes('editor') ||
        classAndId.includes('textbox') ||
        classAndId.includes('input') ||
        classAndId.includes('meta')) {
      return '';
    }

    let text = '';
    for (const child of element.childNodes) {
      text += ' ' + this.getVisibleText(child);
    }
    return text.trim();
  }

  static countWords(text) {
    const cleanText = text
      .replace(/[""'']/g, '')
      .replace(/[.,\/#!$%\^&\*;:{}=_`~()\[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const words = cleanText
      .split(' ')
      .filter(word => {
        const w = word.toLowerCase();
        return word.length > 0 && !/^\d+$/.test(word);
      });
    
    return words.length;
  }

  static formatTime(minutes) {
    if (minutes < 1) {
      return '1 minute';
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (hours === 0) {
      return `${mins} minute${mins !== 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
  }

  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

class StorageManager {
  static async getSettings() {
    const defaults = {
      readingSpeed: 200,
      breakInterval: 20,
      enabled: true
    };
    
    try {
      const result = await chrome.storage.sync.get(defaults);
      return {
        readingSpeed: parseFloat(result.readingSpeed),
        breakInterval: parseFloat(result.breakInterval),
        enabled: result.enabled
      };
    } catch (error) {
      console.error('Error getting settings:', error);
      return defaults;
    }
  }

  static async saveSettings(settings) {
    try {
      await chrome.storage.sync.set({
        readingSpeed: settings.readingSpeed,
        breakInterval: settings.breakInterval,
        enabled: settings.enabled
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }
} 