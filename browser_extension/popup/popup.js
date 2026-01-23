// VeriSure Browser Extension - Popup Script

// Configuration
let API_URL = 'http://localhost:8001'; // Default, can be changed in settings
const STORAGE_KEYS = {
  API_URL: 'verisure_api_url',
  HISTORY: 'verisure_history',
  CURRENT_REPORT: 'verisure_current_report'
};

// DOM Elements
const contentInput = document.getElementById('contentInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const scanPageBtn = document.getElementById('scanPageBtn');
const loadingState = document.getElementById('loadingState');
const resultsSection = document.getElementById('resultsSection');
const quickTips = document.getElementById('quickTips');
const closeResults = document.getElementById('closeResults');
const viewFullReport = document.getElementById('viewFullReport');
const exportPDF = document.getElementById('exportPDF');
const settingsBtn = document.getElementById('settingsBtn');
const openWebApp = document.getElementById('openWebApp');
const clearHistory = document.getElementById('clearHistory');

// Tab elements
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// Current analysis data
let currentReport = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Load settings
  await loadSettings();
  
  // Load history
  loadHistory();
  
  // Check if there's context data from right-click
  checkContextData();
});

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get([STORAGE_KEYS.API_URL]);
    if (result[STORAGE_KEYS.API_URL]) {
      API_URL = result[STORAGE_KEYS.API_URL];
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Check for context menu data
async function checkContextData() {
  try {
    const result = await chrome.storage.local.get(['contextData']);
    if (result.contextData) {
      contentInput.value = result.contextData;
      // Clear context data
      await chrome.storage.local.remove(['contextData']);
      // Auto-analyze if there's context data
      setTimeout(() => analyzeContent(), 100);
    }
  } catch (error) {
    console.error('Failed to check context data:', error);
  }
}

// Tab switching
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    
    // Update active tab
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Update active content
    tabContents.forEach(content => {
      if (content.id === `${tabName}Tab`) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });
    
    // Reload history if history tab is opened
    if (tabName === 'history') {
      loadHistory();
    }
  });
});

// Analyze button click
analyzeBtn.addEventListener('click', analyzeContent);

// Scan page button click
scanPageBtn.addEventListener('click', async () => {
  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Execute script to get page text
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Get all visible text from the page
        const bodyText = document.body.innerText;
        // Limit to first 5000 characters
        return bodyText.substring(0, 5000);
      }
    });
    
    if (results && results[0] && results[0].result) {
      contentInput.value = results[0].result;
      analyzeContent();
    } else {
      showNotification('Failed to scan page', 'error');
    }
  } catch (error) {
    console.error('Page scan error:', error);
    showNotification('Failed to scan page: ' + error.message, 'error');
  }
});

// Analyze content function
async function analyzeContent() {
  const content = contentInput.value.trim();
  
  if (!content) {
    showNotification('Please enter some content to analyze', 'error');
    return;
  }
  
  // Show loading state
  quickTips.style.display = 'none';
  resultsSection.style.display = 'none';
  loadingState.style.display = 'block';
  analyzeBtn.disabled = true;
  scanPageBtn.disabled = true;
  
  try {
    // Prepare form data
    const formData = new FormData();
    
    // Detect if URL
    const isURL = content.match(/^https?:\/\//i);
    if (isURL) {
      formData.append('input_type', 'url');
      formData.append('content', content);
    } else {
      formData.append('input_type', 'text');
      formData.append('content', content);
    }
    
    // Call API
    const response = await fetch(`${API_URL}/api/analyze`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if it's an async job
    if (data.job_id) {
      // Poll for results
      await pollJobStatus(data.job_id);
    } else {
      // Display results immediately
      displayResults(data);
    }
    
  } catch (error) {
    console.error('Analysis error:', error);
    loadingState.style.display = 'none';
    quickTips.style.display = 'block';
    analyzeBtn.disabled = false;
    scanPageBtn.disabled = false;
    showNotification('Analysis failed: ' + error.message, 'error');
  }
}

// Poll job status for async operations
async function pollJobStatus(jobId, maxAttempts = 30) {
  let attempts = 0;
  
  const poll = async () => {
    try {
      const response = await fetch(`${API_URL}/api/job/${jobId}`);
      const data = await response.json();
      
      if (data.status === 'SUCCESS') {
        displayResults(data.result);
      } else if (data.status === 'FAILURE') {
        throw new Error(data.error || 'Job failed');
      } else if (attempts >= maxAttempts) {
        throw new Error('Analysis timeout');
      } else {
        // Continue polling
        attempts++;
        setTimeout(poll, 2000);
      }
    } catch (error) {
      console.error('Job polling error:', error);
      loadingState.style.display = 'none';
      quickTips.style.display = 'block';
      analyzeBtn.disabled = false;
      scanPageBtn.disabled = false;
      showNotification('Analysis failed: ' + error.message, 'error');
    }
  };
  
  poll();
}

// Display results
function displayResults(report) {
  currentReport = report;
  
  // Hide loading, show results
  loadingState.style.display = 'none';
  resultsSection.style.display = 'block';
  analyzeBtn.disabled = false;
  scanPageBtn.disabled = false;
  
  // Display risk badge
  const riskBadge = document.getElementById('riskBadge');
  const riskLevel = report.scam_assessment.risk_level;
  riskBadge.className = `risk-badge ${riskLevel}`;
  riskBadge.textContent = `🚨 ${riskLevel.toUpperCase()} RISK`;
  
  // Set badge color on extension icon
  updateBadge(riskLevel);
  
  // Display origin verdict
  const originVerdict = document.getElementById('originVerdict');
  originVerdict.innerHTML = `
    <div style="margin-bottom: 8px;">
      <strong>${report.origin_verdict.classification}</strong>
    </div>
    <div style="font-size: 12px; color: #6b7280;">
      Confidence: ${report.origin_verdict.confidence}
    </div>
  `;
  
  // Display scam patterns (max 5)
  const scamPatterns = document.getElementById('scamPatterns');
  scamPatterns.innerHTML = '';
  const patterns = report.scam_assessment.scam_patterns.slice(0, 5);
  patterns.forEach(pattern => {
    const li = document.createElement('li');
    li.textContent = pattern;
    scamPatterns.appendChild(li);
  });
  
  // Display recommendations (max 3)
  const recommendations = document.getElementById('recommendations');
  recommendations.innerHTML = '';
  const actions = report.recommendations.actions.slice(0, 3);
  actions.forEach(action => {
    const li = document.createElement('li');
    li.textContent = action;
    recommendations.appendChild(li);
  });
  
  // Save to history
  saveToHistory(report);
  
  // Show notification
  showNotification(`Analysis complete: ${riskLevel.toUpperCase()} risk`, riskLevel === 'high' ? 'error' : 'success');
}

// Close results
closeResults.addEventListener('click', () => {
  resultsSection.style.display = 'none';
  quickTips.style.display = 'block';
  contentInput.value = '';
  currentReport = null;
  
  // Reset badge
  chrome.action.setBadgeText({ text: '' });
});

// View full report
viewFullReport.addEventListener('click', () => {
  if (currentReport && currentReport.report_id) {
    const reportUrl = `${API_URL.replace('/api', '')}/results/${currentReport.report_id}`;
    chrome.tabs.create({ url: reportUrl });
  }
});

// Export PDF
exportPDF.addEventListener('click', () => {
  if (currentReport && currentReport.report_id) {
    const pdfUrl = `${API_URL}/export/pdf/${currentReport.report_id}`;
    chrome.tabs.create({ url: pdfUrl });
  }
});

// Settings button
settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Open web app
openWebApp.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: API_URL.replace('/api', '') });
});

// Update badge on extension icon
function updateBadge(riskLevel) {
  const colors = {
    high: '#dc2626',
    medium: '#d97706',
    low: '#16a34a'
  };
  
  chrome.action.setBadgeText({ text: riskLevel.charAt(0).toUpperCase() });
  chrome.action.setBadgeBackgroundColor({ color: colors[riskLevel] || '#6b7280' });
}

// Show notification
function showNotification(message, type = 'info') {
  // Browser notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: '../icons/icon128.png',
    title: 'VeriSure',
    message: message
  });
}

// Save to history
async function saveToHistory(report) {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEYS.HISTORY]);
    let history = result[STORAGE_KEYS.HISTORY] || [];
    
    // Add to beginning of array
    history.unshift({
      report_id: report.report_id,
      timestamp: report.timestamp,
      risk_level: report.scam_assessment.risk_level,
      classification: report.origin_verdict.classification,
      content_preview: contentInput.value.substring(0, 100)
    });
    
    // Keep only last 50 items
    history = history.slice(0, 50);
    
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: history });
  } catch (error) {
    console.error('Failed to save to history:', error);
  }
}

// Load history
async function loadHistory() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEYS.HISTORY]);
    const history = result[STORAGE_KEYS.HISTORY] || [];
    
    const historyList = document.getElementById('historyList');
    
    if (history.length === 0) {
      historyList.innerHTML = '<p class="empty-state">No recent analyses</p>';
      return;
    }
    
    historyList.innerHTML = '';
    
    history.forEach(item => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      
      const riskColors = {
        high: 'background: #fef2f2; color: #dc2626;',
        medium: 'background: #fffbeb; color: #d97706;',
        low: 'background: #f0fdf4; color: #16a34a;'
      };
      
      historyItem.innerHTML = `
        <div class="history-item-header">
          <span class="history-item-risk" style="${riskColors[item.risk_level]}">
            ${item.risk_level.toUpperCase()}
          </span>
          <span class="history-item-time">
            ${formatTime(item.timestamp)}
          </span>
        </div>
        <div class="history-item-content">
          ${item.content_preview}
        </div>
      `;
      
      historyItem.addEventListener('click', () => {
        // Open full report
        const reportUrl = `${API_URL.replace('/api', '')}/results/${item.report_id}`;
        chrome.tabs.create({ url: reportUrl });
      });
      
      historyList.appendChild(historyItem);
    });
  } catch (error) {
    console.error('Failed to load history:', error);
  }
}

// Clear history
clearHistory.addEventListener('click', async () => {
  if (confirm('Clear all analysis history?')) {
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: [] });
    loadHistory();
    showNotification('History cleared', 'success');
  }
});

// Format timestamp
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}