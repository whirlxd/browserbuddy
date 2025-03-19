overview = document.getElementById("overview");
alarms = document.getElementById("alarms");
calendar = document.getElementById("calendar");
let content;

function getFromStorage(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    // Set up headings for all sections
    overview.innerHTML = '<h2>Overview</h2><p>Add items to slate to see your overview</p>';
    alarms.innerHTML = '<h2>Alarms</h2><p>No upcoming alarms</p>';
    calendar.innerHTML = '<h2>Calendar</h2><p>No upcoming marked calendar events for now</p>';
    
    getFromStorage('content').then(result => {
      content = result.content;
      
      // If content is found, update all sections
      if (content) {
        updateOverview(content);
        updateCalendar(content);
        updateAlarms(content);
      }
    }).catch(error => {
      console.error('Error retrieving content:', error);
    });

    // Set up Clear All button functionality
    const clearAllButton = document.getElementById('clear-all-button');
    clearAllButton.addEventListener('click', function() {
      if (confirm('Are you sure you want to clear all content, alarms, and dates?')) {
        clearAllData();
      }
    });

    // Function to clear all data
    function clearAllData() {
      // Clear storage
      chrome.storage.sync.clear(function() {
        if (chrome.runtime.lastError) {
          console.error('Error clearing storage:', chrome.runtime.lastError);
          alert('Error clearing data: ' + chrome.runtime.lastError.message);
        } else {
          console.log('Storage cleared successfully');
          
          // Clear alarms if available
          if (typeof chrome.alarms !== 'undefined') {
            chrome.alarms.clearAll(function(wasCleared) {
              console.log('Alarms cleared:', wasCleared);
            });
          }
          
          // Reset UI
          overview.innerHTML = '<h2>Overview</h2><p>Add items to slate to see your overview</p>';
          alarms.innerHTML = '<h2>Alarms</h2><p>No upcoming alarms</p>';
          calendar.innerHTML = '<h2>Calendar</h2><p>No upcoming marked calendar events for now</p>';
          
          // Reset content variable
          content = null;
          
          alert('All data has been cleared successfully!');
        }
      });
    }
    
    // Function to update overview section
    function updateOverview(content) {
      let overviewContent = '';
      const contentParts = content.split('|||');
      
      if (contentParts.length >= 2) {
        overviewContent = contentParts[1];
        
        const urlMatch = content.match(/URL\|\|(.*?)\|\|\|/);
        if (urlMatch && urlMatch[1]) {
          // Clear existing content but preserve the heading
          overview.innerHTML = '<h2>Overview</h2>';
          
          // Use a pre element to preserve newlines and formatting
          const contentPre = document.createElement('pre');
          contentPre.style.whiteSpace = 'pre-wrap';  
          contentPre.style.wordBreak = 'break-word';
          contentPre.style.fontFamily = 'inherit';  
          contentPre.style.margin = '0';          
          contentPre.textContent = overviewContent;
          
          const urlLink = document.createElement('a');
          urlLink.href = urlMatch[1];
          urlLink.textContent = "View Source";
          urlLink.target = "_blank";
          urlLink.style.display = 'block';
          urlLink.style.marginTop = '10px';
          
          overview.appendChild(contentPre);
          overview.appendChild(urlLink);
        } else {
          // Clear existing content but preserve the heading
          overview.innerHTML = '<h2>Overview</h2>';
          
          // Use pre element even without URL
          const contentPre = document.createElement('pre');
          contentPre.style.whiteSpace = 'pre-wrap';
          contentPre.style.wordBreak = 'break-word';
          contentPre.style.fontFamily = 'inherit';
          contentPre.style.margin = '0';
          contentPre.textContent = overviewContent;
          
          overview.appendChild(contentPre);
        }
      } else {
        overview.innerHTML = '<h2>Overview</h2><p>No properly formatted content available</p>';
      }
    }
    
    // Function to update calendar section
    function updateCalendar(content) {
      // Start with just the heading
      calendar.innerHTML = '<h2>Calendar</h2>';
      let datesContent = '';
      
      // Find all date matches in the content using split
      const parts = content.split('DATE||');
      
      // Skip the first part (before any DATE|| tag)
      for (let i = 1; i < parts.length; i++) {
        // More robust parsing with error handling
        try {
          const splitParts = parts[i].split('||');
          if (splitParts && splitParts.length > 0) {
            const datePart = splitParts[0];
            if (datePart && datePart.trim() !== '') {
              datesContent += datePart + '\n\n';
            }
          }
        } catch (err) {
          console.error("Error parsing date part:", err);
        }
      }
      
      // Update the calendar element with dates or default message
      if (datesContent && datesContent.trim() !== '') {
        const datesParagraph = document.createElement('p');
        datesParagraph.textContent = datesContent.trim();
        calendar.appendChild(datesParagraph);
      } else {
        const noDatesParagraph = document.createElement('p');
        noDatesParagraph.textContent = "No upcoming marked calendar events for now";
        calendar.appendChild(noDatesParagraph);
      }
    }
    
    // Function to update alarms section
    function updateAlarms(content) {
      // Start with just the heading
      alarms.innerHTML = '<h2>Alarms</h2>';
      let alarmsFound = false;

      // Get all TIME|| parts from the content
      const parts = content.split('TIME||');

      for (let i = 1; i < parts.length; i++) {
        try {
          const splitParts = parts[i].split('||');
          if (splitParts && splitParts.length >= 2) {
            const dateTimeStr = splitParts[0];
            const alarmName = splitParts[1];
            
            if (dateTimeStr && alarmName) {
              // Only show future alarms
              const targetDate = new Date(dateTimeStr);
              
              if (!isNaN(targetDate) && targetDate.getTime() > Date.now()) {
                // Add to alarms display
                const alarmItem = document.createElement('p');
                alarmItem.textContent = `${alarmName}: ${dateTimeStr}`;
                alarms.appendChild(alarmItem);
                alarmsFound = true;
              }
            }
          }
        } catch (err) {
          console.error("Error parsing alarm part:", err);
        }
      }

      if (!alarmsFound) {
        const noAlarmsMessage = document.createElement('p');
        noAlarmsMessage.textContent = "No upcoming alarms";
        alarms.appendChild(noAlarmsMessage);
      }
    }

    // Function to display alarms in popup
    function displayAlarms() {
      chrome.storage.sync.get(['alarms'], function(result) {
        const alarms = result.alarms || {};
        const alarmsContainer = document.getElementById('alarms-container');
        
        if (Object.keys(alarms).length === 0) {
          alarmsContainer.innerHTML = '<p>No upcoming alarms</p>';
          return;
        }
        
        let html = '<ul class="alarms-list">';
        for (const [name, info] of Object.entries(alarms)) {
          const date = new Date(info.scheduledTime);
          html += `
            <li class="alarm-item">
              <span class="alarm-name">${name}</span>
              <span class="alarm-time">${date.toLocaleString()}</span>
            </li>
          `;
        }
        html += '</ul>';
        alarmsContainer.innerHTML = html;
      });
    }

    // Call when popup opens
    displayAlarms();
  });