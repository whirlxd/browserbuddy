chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    chrome.storage.sync.get({ reminders: [] }, (data) => {
      let reminders = Array.isArray(data.reminders) ? data.reminders : [];
      reminders.forEach(reminder => {
        if (reminder.pageUrl && tab.url.includes(reminder.pageUrl)) {
          if (!reminder.snoozeUntil || Date.now() > reminder.snoozeUntil) {
            chrome.notifications.create('reminder_' + reminder.id, {
              type: 'basic',
              iconUrl: 'icon.png',
              title: 'Reminder for ' + (reminder.pageTitle || reminder.pageUrl),
              message: reminder.text,
              buttons: [{ title: "Snooze 15 mins" }],
              priority: 2
            });
          }
        }
      });
    });
  }
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0 && notificationId.startsWith('reminder_')) {
    let reminderId = parseInt(notificationId.split('_')[1]);
    chrome.storage.sync.get({ reminders: [] }, (data) => {
      let reminders = Array.isArray(data.reminders) ? data.reminders : [];
      let reminder = reminders.find(r => r.id === reminderId);
      if (reminder) {
         reminder.snoozeUntil = Date.now() + 15 * 60 * 1000;
         chrome.storage.sync.set({ reminders: reminders }, () => {
           chrome.notifications.clear(notificationId);
         });
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'closeIframe' && sender.tab && sender.tab.id) {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      function: () => {
        const iframe = document.getElementById("tabminder-iframe");
        if (iframe) iframe.remove();
      }
    });
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (!tab.url.startsWith("http://") && !tab.url.startsWith("https://")) {
    chrome.notifications.create('error', {
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'TabMinder Error',
      message: 'TabMinder cannot be used on this page.'
    });
    return;
  }
  
  const pageUrl = tab.url;
  const pageTitle = tab.title;
  const iframeUrl = chrome.runtime.getURL("iframe.html") +
    `?page=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent(pageTitle)}`;
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: toggleIframe,
    args: [iframeUrl]
  });
});

function toggleIframe(iframeUrl) {
  let existingIframe = document.getElementById("tabminder-iframe");
  if (existingIframe) {
    existingIframe.remove();
  } else {
    let iframe = document.createElement("iframe");
    iframe.id = "tabminder-iframe";
    iframe.src = iframeUrl;
    iframe.style.position = "fixed";
    iframe.style.bottom = "20px";
    iframe.style.right = "20px";
    iframe.style.width = "300px";
    iframe.style.height = "400px";
    iframe.style.border = "none";
    iframe.style.borderRadius = "15px";
    iframe.style.zIndex = "10000";
    iframe.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.3)";
    document.body.appendChild(iframe);
  }
}
