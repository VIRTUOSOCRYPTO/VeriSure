// VeriSure Browser Extension - Options Script

const DEFAULT_API_URL = 'http://localhost:8001';
const STORAGE_KEY = 'verisure_api_url';

const apiUrlInput = document.getElementById('apiUrl');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const statusMessage = document.getElementById('statusMessage');

// Load saved settings
chrome.storage.sync.get([STORAGE_KEY], (result) => {
  apiUrlInput.value = result[STORAGE_KEY] || DEFAULT_API_URL;
});

// Save settings
saveBtn.addEventListener('click', async () => {
  const apiUrl = apiUrlInput.value.trim();
  
  // Validate URL
  if (!apiUrl) {
    showStatus('Please enter a valid URL', 'error');
    return;
  }
  
  try {
    // Remove trailing slash
    const cleanUrl = apiUrl.replace(/\/$/, '');
    
    // Test API connection
    saveBtn.disabled = true;
    saveBtn.textContent = 'Testing connection...';
    
    const response = await fetch(`${cleanUrl}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('API connection failed');
    }
    
    // Save to storage
    await chrome.storage.sync.set({ [STORAGE_KEY]: cleanUrl });
    
    showStatus('Settings saved successfully! API connection verified.', 'success');
    
  } catch (error) {
    console.error('API test error:', error);
    
    // Show warning but still save
    const shouldSave = confirm(
      `Warning: Could not connect to API at ${apiUrl}\n\nError: ${error.message}\n\nDo you want to save this URL anyway?`
    );
    
    if (shouldSave) {
      const cleanUrl = apiUrl.replace(/\/$/, '');
      await chrome.storage.sync.set({ [STORAGE_KEY]: cleanUrl });
      showStatus('Settings saved (API connection not verified)', 'success');
    } else {
      showStatus('Settings not saved', 'error');
    }
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Settings';
  }
});

// Reset to default
resetBtn.addEventListener('click', async () => {
  if (confirm('Reset to default settings?')) {
    apiUrlInput.value = DEFAULT_API_URL;
    await chrome.storage.sync.set({ [STORAGE_KEY]: DEFAULT_API_URL });
    showStatus('Settings reset to default', 'success');
  }
});

// Show status message
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  
  // Auto-hide success messages after 3 seconds
  if (type === 'success') {
    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 3000);
  }
}

// Allow Enter key to save
apiUrlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    saveBtn.click();
  }
});
