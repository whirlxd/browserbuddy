document.addEventListener('DOMContentLoaded', async () => {
  const apiKeySection = document.getElementById('api-key-section');
  const contentSection = document.getElementById('content-section');
  const summaryDiv = document.getElementById('summary');
  const keypointsUl = document.getElementById('keypoints');

  // Check if API key exists
  chrome.storage.sync.get(['hf_api_key'], (result) => {
    if (!result.hf_api_key) {
      apiKeySection.style.display = 'block';
      contentSection.style.display = 'none';
    } else {
      apiKeySection.style.display = 'none';
      contentSection.style.display = 'block';
      loadContent();
    }
  });

  function loadContent() {
    chrome.storage.local.get(['summary', 'keypoints'], (data) => {
      if (data.summary) {
        summaryDiv.innerText = data.summary;
      } else {
        summaryDiv.innerText = "No text selected or summarized.";
      }

      if (data.keypoints && data.keypoints.length > 0) {
        keypointsUl.innerHTML = data.keypoints
          .map(point => `<li>${point}</li>`)
          .join('');
      } else {
        keypointsUl.innerHTML = "<li>No key points available.</li>";
      }
    });
  }

  document.getElementById('save-key').addEventListener('click', async () => {
    const apiKey = document.getElementById('api-key').value;
    if (!apiKey) {
      alert('Please enter an API key');
      return;
    }
    await chrome.storage.sync.set({ hf_api_key: apiKey });
    apiKeySection.style.display = 'none';
    contentSection.style.display = 'block';
    loadContent();
  });
});