// Function to list all open tabs
function listTabs() {
  chrome.tabs.query({}, (tabs) => {
    const tabsList = document.getElementById('tabs-list');
    tabsList.innerHTML = '';  // Clear the list

    tabs.forEach(tab => {
      const li = document.createElement('li');
      li.innerHTML = `
        <input type="checkbox" data-tab-id="${tab.id}" /> ${tab.title}
        <button class="go-to-tab" data-tab-id="${tab.id}">Go</button>
      `;
      tabsList.appendChild(li);
    });

    // Add event listeners for "Go to tab" buttons
    document.querySelectorAll('.go-to-tab').forEach(button => {
      button.addEventListener('click', (e) => {
        const tabId = e.target.getAttribute('data-tab-id');
        chrome.tabs.update(parseInt(tabId), { active: true });
      });
    });
  });
}

// Function to close selected tabs
document.getElementById('close-selected').addEventListener('click', () => {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
  checkboxes.forEach(checkbox => {
    const tabId = checkbox.getAttribute('data-tab-id');
    chrome.tabs.remove(parseInt(tabId));
  });
});

// Function to close all tabs from the same domain
document.getElementById('close-all-same-domain').addEventListener('click', () => {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
  checkboxes.forEach(checkbox => {
    const tabId = checkbox.getAttribute('data-tab-id');
    chrome.tabs.get(parseInt(tabId), (tab) => {
      const domain = new URL(tab.url).hostname;
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (new URL(tab.url).hostname === domain) {
            chrome.tabs.remove(tab.id);
          }
        });
      });
    });
  });
});

// Function to mute selected tabs
document.getElementById('mute-selected').addEventListener('click', () => {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
  checkboxes.forEach(checkbox => {
    const tabId = checkbox.getAttribute('data-tab-id');
    chrome.tabs.update(parseInt(tabId), { muted: true });
  });
});

// Function to restore saved session
document.getElementById('restore-session').addEventListener('click', () => {
  chrome.storage.local.get(['savedTabs'], (result) => {
    if (result.savedTabs) {
      result.savedTabs.forEach(tab => {
        chrome.tabs.create({ url: tab.url });
      });
    }
  });
});

// Listen for search input to filter tabs
document.getElementById('search').addEventListener('input', (event) => {
  const query = event.target.value.toLowerCase();
  const tabsList = document.getElementById('tabs-list');
  const tabs = tabsList.getElementsByTagName('li');
  
  Array.from(tabs).forEach(li => {
    const title = li.textContent.toLowerCase();
    li.style.display = title.includes(query) ? '' : 'none';
  });
});

// Save current tabs as a session
chrome.tabs.query({}, (tabs) => {
  const savedTabs = tabs.map(tab => ({ title: tab.title, url: tab.url }));
  chrome.storage.local.set({ savedTabs });
});

// List tabs when the popup opens
listTabs();
