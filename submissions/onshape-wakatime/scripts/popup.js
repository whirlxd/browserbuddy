chrome.storage.local.get().then((items) => {
    console.log(items.apiKey);
    let api_key = document.getElementById("api_key");
    api_key.value = items.apiKey;
    api_key.addEventListener("change", function () {
        chrome.storage.local.set({ apiKey: api_key.value });
    });
    
    let enabled = document.getElementById("enabled");
    enabled.checked = items.enabled;
    enabled.addEventListener("change", function () {


        chrome.storage.local.set({ enabled: enabled.checked });
    });

    let msg = document.getElementById("msg");
    msg.innerText = items.msg;

    let sendHeartbeat = document.getElementById("sendHeartbeat");
    sendHeartbeat.addEventListener("click", function () {
        chrome.runtime.sendMessage({ msg: "forceSendHeartbeat" });
    });
  });
