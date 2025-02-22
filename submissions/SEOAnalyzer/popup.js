document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      throw new Error('No active tab found');
    }

    // Execute content script
    const executeResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: analyzePage
    });

    if (!executeResults || !executeResults[0] || !executeResults[0].result) {
      throw new Error('Failed to analyze page');
    }

    const data = executeResults[0].result;
    displayResults(data);
  } catch (error) {
    document.getElementById('results').innerHTML = `
      <div class="section">
        <h2>Error</h2>
        <p>${error.message}</p>
      </div>
    `;
    console.error('SEO Analysis Error:', error);
  }
});

function analyzePage() {
  return {
    title: {
      content: document.title,
      length: document.title.length
    },
    description: {
      content: document.querySelector('meta[name="description"]')?.content || '',
      length: document.querySelector('meta[name="description"]')?.content?.length || 0
    },
    headings: {
      h1: Array.from(document.getElementsByTagName('h1')),
      h2: Array.from(document.getElementsByTagName('h2')),
      h3: Array.from(document.getElementsByTagName('h3'))
    },
    images: Array.from(document.getElementsByTagName('img')).map(img => ({
      hasAlt: !!img.alt.trim(),
      alt: img.alt
    })),
    technical: {
      hasCanonical: !!document.querySelector('link[rel="canonical"]'),
      hasRobots: !!document.querySelector('meta[name="robots"]'),
      hasKeywords: !!document.querySelector('meta[name="keywords"]'),
      hasViewport: !!document.querySelector('meta[name="viewport"]')
    }
  };
}

function displayResults(data) {
  // Update overall score
  const scores = calculateScores(data);
  document.querySelector('#overall-score .score').textContent = scores.total;

  // Update Meta Title
  document.getElementById('meta-title-score').textContent = `${scores.title}/10`;
  document.getElementById('meta-title-content').textContent = data.title.content;
  document.getElementById('meta-title-length').textContent = `Length: ${data.title.length} characters`;
  document.getElementById('meta-title-recommendation').textContent = getTitleRecommendation(data.title.length);

  // Update Meta Description
  document.getElementById('meta-desc-score').textContent = `${scores.description}/10`;
  document.getElementById('meta-desc-content').textContent = data.description.content || 'No meta description found';
  document.getElementById('meta-desc-length').textContent = `Length: ${data.description.length} characters`;
  document.getElementById('meta-desc-recommendation').textContent = getDescriptionRecommendation(data.description.length);

  // Update Headings
  document.getElementById('headings-score').textContent = `${scores.headings}/10`;
  document.getElementById('headings-results').innerHTML = `
    <div class="content">H1: ${data.headings.h1.length}, H2: ${data.headings.h2.length}, H3: ${data.headings.h3.length}</div>
    <div class="recommendation">${getHeadingsRecommendation(data.headings)}</div>
  `;

  // Update Images
  document.getElementById('images-score').textContent = `${scores.images}/10`;
  const imagesWithAlt = data.images.filter(img => img.hasAlt).length;
  document.getElementById('images-results').innerHTML = `
    <div class="content">${imagesWithAlt} of ${data.images.length} images have alt text</div>
    <div class="recommendation">${getImagesRecommendation(data.images)}</div>
  `;

  // Update Technical SEO
  document.getElementById('technical-score').textContent = `${scores.technical}/10`;
  const technicalElements = [];
  if (data.technical.hasCanonical) technicalElements.push('Canonical URL');
  if (data.technical.hasRobots) technicalElements.push('Robots Meta');
  if (data.technical.hasKeywords) technicalElements.push('Keywords Meta');
  if (data.technical.hasViewport) technicalElements.push('Viewport Meta');

  document.getElementById('technical-results').innerHTML = `
    <div class="content">${technicalElements.length ? technicalElements.join(', ') : 'No technical elements found'}</div>
    <div class="recommendation">${getTechnicalRecommendation(data.technical)}</div>
  `;
}

function calculateScores(data) {
  const scores = {
    title: calculateTitleScore(data.title.length),
    description: calculateDescriptionScore(data.description.length),
    headings: calculateHeadingsScore(data.headings),
    images: calculateImagesScore(data.images),
    technical: calculateTechnicalScore(data.technical)
  };

  scores.total = Math.round(
    (scores.title + scores.description + scores.headings + scores.images + scores.technical) * 2
  );

  return scores;
}

function calculateTitleScore(length) {
  if (length >= 30 && length <= 60) return 10;
  if (length < 30) return Math.round((length / 30) * 10);
  return Math.max(0, 10 - ((length - 60) / 10));
}

function calculateDescriptionScore(length) {
  if (length >= 120 && length <= 160) return 10;
  if (length < 120) return Math.round((length / 120) * 10);
  return Math.max(0, 10 - ((length - 160) / 20));
}

function calculateHeadingsScore(headings) {
  const h1Count = headings.h1.length;
  const hasH2 = headings.h2.length > 0;
  
  if (h1Count === 1 && hasH2) return 10;
  if (h1Count === 1) return 7;
  if (h1Count === 0) return 3;
  return 5; // Multiple H1s
}

function calculateImagesScore(images) {
  if (images.length === 0) return 10;
  return Math.round((images.filter(img => img.hasAlt).length / images.length) * 10);
}

function calculateTechnicalScore(technical) {
  let score = 0;
  if (technical.hasCanonical) score += 3;
  if (technical.hasRobots) score += 2;
  if (technical.hasKeywords) score += 2;
  if (technical.hasViewport) score += 3;
  return score;
}

function getTitleRecommendation(length) {
  if (length === 0) return '⚠️ Missing title tag';
  if (length < 30) return '⚠️ Title is too short (recommended: 30-60 characters)';
  if (length > 60) return '⚠️ Title is too long (recommended: 30-60 characters)';
  return '✓ Title length is optimal';
}

function getDescriptionRecommendation(length) {
  if (length === 0) return '⚠️ Missing meta description';
  if (length < 120) return '⚠️ Description is too short (recommended: 120-160 characters)';
  if (length > 160) return '⚠️ Description is too long (recommended: 120-160 characters)';
  return '✓ Description length is optimal';
}

function getHeadingsRecommendation(headings) {
  const h1Count = headings.h1.length;
  if (h1Count === 0) return '⚠️ No H1 heading found';
  if (h1Count > 1) return '⚠️ Multiple H1 headings found (recommended: only one)';
  if (headings.h2.length === 0) return '⚠️ No H2 headings found';
  return '✓ Heading structure is good';
}

function getImagesRecommendation(images) {
  if (images.length === 0) return '✓ No images to analyze';
  const missingAlt = images.length - images.filter(img => img.hasAlt).length;
  if (missingAlt === 0) return '✓ All images have alt text';
  return `⚠️ ${missingAlt} image${missingAlt === 1 ? ' is' : 's are'} missing alt text`;
}

function getTechnicalRecommendation(technical) {
  const missing = [];
  if (!technical.hasCanonical) missing.push('canonical URL');
  if (!technical.hasRobots) missing.push('robots meta');
  if (!technical.hasKeywords) missing.push('keywords meta');
  if (!technical.hasViewport) missing.push('viewport meta');
  
  if (missing.length === 0) return '✓ All technical elements are present';
  return `⚠️ Missing: ${missing.join(', ')}`;
}
