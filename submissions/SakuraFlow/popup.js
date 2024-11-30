// Function to list all open tabs
function listTabs() {
  chrome.tabs.query({}, (tabs) => {
    const tabsList = document.getElementById('tabs-list');
    tabsList.innerHTML = '';  // Clear the list

    tabs.forEach(tab => {
      const li = document.createElement('li');
      li.innerHTML = `<input type="checkbox" data-tab-id="${tab.id}" /> ${tab.title}`;
      tabsList.appendChild(li);
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

// List tabs when the popup opens
listTabs();
