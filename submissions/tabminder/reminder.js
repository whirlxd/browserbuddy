function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      page: params.get('page'),
      title: params.get('title')
    };
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    const { page, title } = getQueryParams();
    if (page) {
      document.getElementById('pageTitle').textContent = title || page;
    }
    
    chrome.storage.sync.get({ reminders: [] }, (data) => {
      const reminders = Array.isArray(data.reminders) ? data.reminders : [];
      const matchingReminders = reminders.filter(r => 
        r.pageUrl && page.includes(r.pageUrl) &&
        (!r.snoozeUntil || Date.now() > r.snoozeUntil)
      );
      const reminderContentDiv = document.getElementById('reminderContent');
      if (matchingReminders.length > 0) {
        matchingReminders.forEach(reminder => {
          const reminderDiv = document.createElement('div');
          reminderDiv.textContent = reminder.text;
          reminderContentDiv.appendChild(reminderDiv);
        });
      } else {
        reminderContentDiv.textContent = "No reminders for this page.";
      }
    });
    
    document.getElementById('closeBtn').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'closeReminderIframe' });
    });
  });
  
