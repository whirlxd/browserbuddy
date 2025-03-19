// Listen for installation or update
chrome.runtime.onInstalled.addListener(function() {
  console.log("Extension installed or updated");
  
  // Create a test alarm that will fire after 40 seconds
  const when = Date.now() + (40 * 1000); // 40 seconds from now
  chrome.alarms.create('test', {
    when: when
  });
});

// Keep the service worker alive with minimal logging
function keepAlive() {
  setInterval(() => {}, 20000); // Every 20 seconds
}
keepAlive();

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'processText') {
    // Process the text using the LLM
    summarise(message.text).then(summarised => {
      try {
        // Add URL to the content
        const processedContent = summarised + "URL||" + message.url + "|||";
        
        // Save to storage
        chrome.storage.sync.set({
          content: processedContent
        }, function() {
          if (chrome.runtime.lastError) {
            sendResponse({success: false, error: chrome.runtime.lastError.message});
          } else {
            // Process and create alarms after saving content
            try {
              processAlarms(processedContent);
            } catch (e) {
              console.error("Error processing alarms:", e);
            }
            
            sendResponse({success: true});
          }
        });
      } catch (error) {
        sendResponse({success: false, error: error.message});
      }
    }).catch(error => {
      sendResponse({success: false, error: error.message});
    });
    
    return true; // Keep the message channel open for the async response
  }
});

// Function to process and create alarms from content
function processAlarms(content) {
  if (!content) return;
  
  const parts = content.split('TIME||');

  for (let i = 1; i < parts.length; i++) {
    try {
      const splitParts = parts[i].split('||');
      if (splitParts && splitParts.length >= 2) {
        const dateTimeStr = splitParts[0];
        const alarmName = splitParts[1];
        
        if (dateTimeStr && alarmName) {
          // Create alarm
          const targetDate = new Date(dateTimeStr);
          
          // Check for valid date and future time
          if (!isNaN(targetDate) && targetDate.getTime() > Date.now()) {
            chrome.alarms.create(alarmName, { 
              when: targetDate.getTime()
            });
            
            // Store alarm info in storage for popup display
            storeAlarmInfo(alarmName, targetDate);
          }
        }
      }
    } catch (err) {
      console.error("Error processing alarm:", err);
    }
  }
}

// Store alarm info in storage
function storeAlarmInfo(name, date) {
  chrome.storage.sync.get(['alarms'], function(result) {
    let alarms = result.alarms || {};
    alarms[name] = {
      name: name,
      scheduledTime: date.getTime(),
      created: Date.now()
    };
    
    chrome.storage.sync.set({ alarms: alarms });
  });
}

// Remove alarm info from storage when alarm fires
function removeAlarmInfo(name) {
  chrome.storage.sync.get(['alarms'], function(result) {
    let alarms = result.alarms || {};
    delete alarms[name];
    chrome.storage.sync.set({ alarms: alarms });
  });
}

// Set up alarm listener - Using alert instead of notifications
chrome.alarms.onAlarm.addListener((alarm) => {
  // Create a new tab that will show the alert
  chrome.tabs.create({ url: 'alarm-alert.html?name=' + encodeURIComponent(alarm.name) });
  
  // Remove the alarm info from storage
  removeAlarmInfo(alarm.name);
});

// Summarize function
function summarise(text){
    return new Promise((resolve, reject) => {
        const apiUrl = 'https://ai.hackclub.com/chat/completions';

        const messages = [
          { role: "system", content: "You will be given some text. You are supposed to take out pointers (small notes) from them, from which the user can easily get an overview of the doc. Try your best to keep the pointers bite-sized and few in number. The last few line(s) of the provided text, which will be seperated by 3 newlines, is a note from the user. This is SUPER important. Another SUPER important thing is, take all important dates/times which would basically be important reminders/alarms from the text. The dates/times should ONLY be used for alarms, and not random dates and times from the text. These dates/times should STRICTLY be in the syntax as given: for dates: DATE||(date in dd, mm, yyyy format, along with a very concise title of the event. If dates are spanning multiple days, write it.)|| for times: TIME||March 20, 2025 14:30:00||(name of alarm)||. Follow the given instructions STRICTLY. Examples: DATE||2nd of March, 2025||, or DATE||22 April to 31 August||, or, for time, TIME||April 13, 2025 21:35:00||Chemistry Class|| or TIME||January 5, 2023 17:52:00||MOON LANDING||, etc. All the actual pointers (not dates/times) together should be inside ||| (3 lines) before and after. Dates/times should be OUTSIDE the |||" },
          { role: "user", content: text }
        ];

        const requestOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: messages })
        };

        fetch(apiUrl, requestOptions)
          .then(response => response.json())
          .then(data => {
            resolve(data.choices[0].message.content);
          })
          .catch(error => {
            reject(error);
          });
    });
}
