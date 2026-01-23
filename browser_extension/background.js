// VeriSure Browser Extension - Background Service Worker

// API Configuration
let API_URL = 'http://localhost:8001'; // Default

// Load API URL from storage
chrome.storage.sync.get(['verisure_api_url'], (result) => {
  if (result.verisure_api_url) {
    API_URL = result.verisure_api_url;
  }
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.verisure_api_url) {
    API_URL = changes.verisure_api_url.newValue;
  }
});

// Create context menus on installation
chrome.runtime.onInstalled.addListener(() => {
  // Context menu for selected text
  chrome.contextMenus.create({
    id: 'analyzeText',
    title: 'Analyze with VeriSure',
    contexts: ['selection']
  });
  
  // Context menu for images
  chrome.contextMenus.create({
    id: 'analyzeImage',
    title: 'Analyze Image',
    contexts: ['image']
  });
  
  // Context menu for links
  chrome.contextMenus.create({
    id: 'analyzeLink',
    title: 'Analyze Link',
    contexts: ['link']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'analyzeText') {
    // Store selected text and open popup
    await chrome.storage.local.set({ contextData: info.selectionText });
    chrome.action.openPopup();
  }
  else if (info.menuItemId === 'analyzeImage') {
    // Analyze image
    analyzeImage(info.srcUrl, tab);
  }
  else if (info.menuItemId === 'analyzeLink') {
    // Analyze link
    await chrome.storage.local.set({ contextData: info.linkUrl });
    chrome.action.openPopup();
  }
});

// Analyze image function
async function analyzeImage(imageUrl, tab) {
  try {
    // Show notification that analysis started
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'VeriSure',
      message: 'Analyzing image...'
    });
    
    // Fetch image as blob
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    // Prepare form data
    const formData = new FormData();
    formData.append('input_type', 'file');
    formData.append('file', blob, 'image.jpg');
    
    // Call API
    const apiResponse = await fetch(`${API_URL}/api/analyze`, {
      method: 'POST',
      body: formData
    });
    
    if (!apiResponse.ok) {
      throw new Error(`API error: ${apiResponse.status}`);
    }
    
    const data = await apiResponse.json();
    
    // Check if it's an async job
    if (data.job_id) {
      // Show notification that processing is ongoing
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'VeriSure',
        message: 'Image analysis in progress. Click to view status.',
        requireInteraction: true
      });
    } else {
      // Show result notification
      const riskLevel = data.scam_assessment.risk_level;
      showResultNotification(data, riskLevel);
    }
    
  } catch (error) {
    console.error('Image analysis error:', error);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'VeriSure - Error',
      message: 'Failed to analyze image: ' + error.message
    });
  }
}

// Show result notification
function showResultNotification(report, riskLevel) {
  const riskEmoji = {
    high: '🔴',
    medium: '🟡',
    low: '🟢'
  };
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: `${riskEmoji[riskLevel]} VeriSure: ${riskLevel.toUpperCase()} Risk`,
    message: `${report.origin_verdict.classification}\n\nClick to view full report.`,
    requireInteraction: true
  }, (notificationId) => {
    // Store report ID for notification click
    chrome.storage.local.set({ 
      [`notification_${notificationId}`]: report.report_id 
    });
  });
}

// Handle notification clicks
chrome.notifications.onClicked.addListener(async (notificationId) => {
  // Get report ID from storage
  const result = await chrome.storage.local.get([`notification_${notificationId}`]);
  const reportId = result[`notification_${notificationId}`];
  
  if (reportId) {
    // Open report in new tab
    const reportUrl = `${API_URL.replace('/api', '')}/results/${reportId}`;
    chrome.tabs.create({ url: reportUrl });
    
    // Clear notification data
    chrome.storage.local.remove([`notification_${notificationId}`]);
  }
  
  // Clear notification
  chrome.notifications.clear(notificationId);
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyze') {
    analyzeContent(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'getApiUrl') {
    sendResponse({ apiUrl: API_URL });
  }
});

// Analyze content function
async function analyzeContent(content) {
  const formData = new FormData();
  
  // Detect content type
  if (content.startsWith('http')) {
    formData.append('input_type', 'url');
    formData.append('content', content);
  } else {
    formData.append('input_type', 'text');
    formData.append('content', content);
  }
  
  const response = await fetch(`${API_URL}/api/analyze`, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return await response.json();
}

// Set default badge
chrome.action.setBadgeBackgroundColor({ color: '#667eea' });

console.log('VeriSure background service worker loaded');
