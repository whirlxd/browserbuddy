// Listen for installation or update
chrome.runtime.onInstalled.addListener(function() {
  console.log("Extension installed or updated");
});

// Keep the service worker alive
function keepAlive() {
  setInterval(() => {
    console.log("Background service worker ping: " + new Date());
  }, 20000); // Every 20 seconds
}
keepAlive();

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log("Background received message:", message);
  
  if (message.action === 'processText') {
    console.log("Background received text to process");
    
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
            console.error("Error saving to storage:", chrome.runtime.lastError);
            sendResponse({success: false, error: chrome.runtime.lastError.message});
          } else {
            console.log("Content saved successfully");
            
            // Process and create alarms after saving content
            if (typeof chrome.alarms !== 'undefined') {
              try {
                processAlarms(processedContent);
              } catch (e) {
                console.error("Error processing alarms:", e);
              }
            } else {
              console.warn("Alarms API not available");
            }
            
            sendResponse({success: true});
          }
        });
      } catch (error) {
        console.error("Error processing content:", error);
        sendResponse({success: false, error: error.message});
      }
    }).catch(error => {
      console.error('Error summarizing text:', error);
      sendResponse({success: false, error: error.message});
    });
    
    return true; // Keep the message channel open for the async response
  }
});

// Function to process and create alarms from content
function processAlarms(content) {
  if (!content) return;
  if (typeof chrome.alarms === 'undefined') {
    console.warn("Alarms API not available for processing");
    return;
  }
  
  console.log("Processing content for alarms");
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
            console.log(`Creating alarm: ${alarmName} at ${dateTimeStr}`);
            chrome.alarms.create(alarmName, { when: targetDate.getTime() });
          } else {
            console.log(`Skipping invalid or past alarm: ${alarmName} at ${dateTimeStr}`);
          }
        }
      }
    } catch (err) {
      console.error("Error processing alarm:", err);
    }
  }
}

// Set up alarm listener - Only if alarms API is available
if (typeof chrome.alarms !== 'undefined') {
  chrome.alarms.onAlarm.addListener((alarm) => {
    console.log(`Alarm triggered: ${alarm.name}`);
    if (typeof chrome.notifications !== 'undefined') {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'images/slate-logo-btn.jpg',
        title: "slate // " + alarm.name,
        message: "psst! hey! time for " + alarm.name,
      });
    } else {
      console.warn("Notifications API not available");
    }
  });
} else {
  console.warn("Alarms API not available for listener");
}

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
            console.error('Error:', error);
            reject(error);
          });
    });
}
