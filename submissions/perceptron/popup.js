document.getElementById('deuteranopia').addEventListener('click', () => {
  applyFilter('deuteranopia');
});

document.getElementById('protanopia').addEventListener('click', () => {
  applyFilter('protanopia');
});

document.getElementById('tritanopia').addEventListener('click', () => {
  applyFilter('tritanopia');
});

document.getElementById('normal').addEventListener('click', () => {
  applyFilter('normal');
});

function applyFilter(filterType) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab && tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('about://')) {
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          func: simulateColorBlindness,
          args: [filterType]
        },
        () => console.log(`Applied filter: ${filterType}`)
      );
    } else {
      console.error("Cannot apply filter to this tab. Invalid URL or internal page.");
    }
  });
}

function simulateColorBlindness(filterType) {
  const filters = {
    deuteranopia: 'url(#deuteranopia-filter)',
    protanopia: 'url(#protanopia-filter)',
    tritanopia: 'url(#tritanopia-filter)',
    normal: 'none'
  };

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" style="position:absolute; width:0; height:0;">
      <filter id="deuteranopia-filter">
        <feColorMatrix type="matrix" values="0.625,0.375,0,0,0 0.7,0.3,0,0,0 0,0.3,0.7,0,0 0,0,0,1,0" />
      </filter>
      <filter id="protanopia-filter">
        <feColorMatrix type="matrix" values="0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0" />
      </filter>
      <filter id="tritanopia-filter">
        <feColorMatrix type="matrix" values="0.95,0.05,0,0,0 0,0.433,0.567,0,0 0,0.475,0.525,0,0 0,0,0,1,0" />
      </filter>
    </svg>
  `;

  let existingSvg = document.querySelector('#colorblind-filters');
  if (!existingSvg) {
    const div = document.createElement('div');
    div.id = 'colorblind-filters';
    div.innerHTML = svg;
    document.body.appendChild(div);
  }

  const content = document.querySelector('main') || document.body;
  content.style.filter = filters[filterType];
  
  const fixedElements = document.querySelectorAll('[style*="position: fixed"]');
  fixedElements.forEach((el) => {
    el.style.filter = 'none';
  });
}
