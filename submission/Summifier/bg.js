const HF_API_KEY = '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';
const SUMMARIZE_API_URL = 'https://api-inference.huggingface.co/models/sshleifer/distilbart-cnn-12-6';

// Create context menu item for text selection

function extractKeypoints(summary) {
  // Split into sentences and filter out empty ones
  let sentences = summary.split(/[.!?]+/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 0);

  // Extract key points based on importance markers
  const importanceMarkers = [
    'importantly',
    'significantly',
    'notably',
    'key',
    'main',
    'primary',
    'essential',
    'crucial',
    'critical',
    'major'
  ];

  let keypoints = sentences.filter(sentence => 
    importanceMarkers.some(marker => 
      sentence.toLowerCase().includes(marker)
    )
  );

  // If no sentences with importance markers, take the first 3 sentences
  if (keypoints.length === 0) {
    keypoints = sentences.slice(0, 3);
  }

  // Add bullet points and clean up
  return keypoints.map(point => 
    point.charAt(0).toUpperCase() + point.slice(1)
  );
}

async function summarizeText(text) {
  try {
    const response = await fetch(SUMMARIZE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: text,
        parameters: {
          max_length: 150,
          min_length: 40,
          do_sample: false
        }
      })
    });

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const result = await response.json();
    const summary = result[0]?.summary_text || "Could not generate summary.";
    const keypoints = extractKeypoints(summary);
    return { summary, keypoints };
  } catch (error) {
    console.error('Summarization error:', error);
    return { 
      summary: "Error generating summary.", 
      keypoints: ["Error extracting key points."] 
    };
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "summarize",
    title: "Summarize selected text",
    contexts: ["selection"]
  });
});

// Listen for the context menu click event
chrome.contextMenus.onClicked.addListener(async (info) => {
  if (!info.selectionText) return;

  if (info.menuItemId === "summarize") {
    const result = await summarizeText(info.selectionText);
    chrome.storage.local.set({ summary: result.summary, keypoints: result.keypoints });
    chrome.action.openPopup();
  }
});
