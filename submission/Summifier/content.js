chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_SELECTION") {
      sendResponse({ selectedText: window.getSelection().toString() });
    }
  });