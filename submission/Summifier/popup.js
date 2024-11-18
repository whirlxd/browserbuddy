// popup.js
document.addEventListener('DOMContentLoaded', async () => {
  const summaryDiv = document.getElementById('summary');
  const keypointsUl = document.getElementById('keypoints');

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
});