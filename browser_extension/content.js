// VeriSure Browser Extension - Content Script
// This script runs on all web pages and provides inline analysis features

(function() {
  'use strict';
  
  // Create floating analysis button
  let floatingButton = null;
  let selectedText = '';
  
  // Initialize
  function init() {
    // Listen for text selection
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('touchend', handleTextSelection);
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(handleMessage);
    
    console.log('VeriSure content script loaded');
  }
  
  // Handle text selection
  function handleTextSelection(e) {
    // Small delay to ensure selection is complete
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text && text.length > 10 && text.length < 5000) {
        selectedText = text;
        showFloatingButton(e.clientX, e.clientY);
      } else {
        hideFloatingButton();
      }
    }, 100);
  }
  
  // Show floating analysis button
  function showFloatingButton(x, y) {
    // Remove existing button
    hideFloatingButton();
    
    // Create button
    floatingButton = document.createElement('div');
    floatingButton.id = 'verisure-floating-btn';
    floatingButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      </svg>
      <span>Analyze</span>
    `;
    
    // Style button
    Object.assign(floatingButton.style, {
      position: 'fixed',
      left: `${x + 10}px`,
      top: `${y + 10}px`,
      zIndex: '999999',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
      transition: 'transform 0.2s',
      fontWeight: '500'
    });
    
    // Add hover effect
    floatingButton.addEventListener('mouseenter', () => {
      floatingButton.style.transform = 'scale(1.05)';
    });
    
    floatingButton.addEventListener('mouseleave', () => {
      floatingButton.style.transform = 'scale(1)';
    });
    
    // Add click handler
    floatingButton.addEventListener('click', analyzeSelection);
    
    // Add to page
    document.body.appendChild(floatingButton);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      hideFloatingButton();
    }, 5000);
  }
  
  // Hide floating button
  function hideFloatingButton() {
    if (floatingButton && floatingButton.parentNode) {
      floatingButton.parentNode.removeChild(floatingButton);
      floatingButton = null;
    }
  }
  
  // Analyze selected text
  async function analyzeSelection() {
    if (!selectedText) return;
    
    // Hide button
    hideFloatingButton();
    
    // Show loading indicator
    showLoadingIndicator();
    
    try {
      // Send message to background script
      const response = await chrome.runtime.sendMessage({
        action: 'analyze',
        data: selectedText
      });
      
      if (response.success) {
        // Show inline results
        showInlineResults(response.data);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      showError('Analysis failed: ' + error.message);
    } finally {
      hideLoadingIndicator();
    }
  }
  
  // Show loading indicator
  function showLoadingIndicator() {
    const loader = document.createElement('div');
    loader.id = 'verisure-loader';
    loader.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        background: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      ">
        <div style="
          width: 16px;
          height: 16px;
          border: 2px solid #f3f4f6;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: verisure-spin 1s linear infinite;
        "></div>
        <span style="
          font-size: 13px;
          color: #374151;
          font-family: system-ui, -apple-system, sans-serif;
        ">Analyzing...</span>
      </div>
    `;
    
    Object.assign(loader.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: '999999'
    });
    
    // Add spinner animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes verisure-spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(loader);
  }
  
  // Hide loading indicator
  function hideLoadingIndicator() {
    const loader = document.getElementById('verisure-loader');
    if (loader) {
      loader.remove();
    }
  }
  
  // Show inline results
  function showInlineResults(report) {
    // Remove existing results
    const existing = document.getElementById('verisure-results');
    if (existing) existing.remove();
    
    const riskLevel = report.scam_assessment.risk_level;
    const riskColors = {
      high: { bg: '#fef2f2', border: '#dc2626', text: '#dc2626' },
      medium: { bg: '#fffbeb', border: '#d97706', text: '#d97706' },
      low: { bg: '#f0fdf4', border: '#16a34a', text: '#16a34a' }
    };
    
    const colors = riskColors[riskLevel];
    
    const resultsDiv = document.createElement('div');
    resultsDiv.id = 'verisure-results';
    resultsDiv.innerHTML = `
      <div style="
        background: white;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        max-width: 400px;
        font-family: system-ui, -apple-system, sans-serif;
        overflow: hidden;
      ">
        <!-- Header -->
        <div style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <strong style="font-size: 14px;">VeriSure Analysis</strong>
          </div>
          <button onclick="document.getElementById('verisure-results').remove()" style="
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
          ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <!-- Risk Badge -->
        <div style="
          background: ${colors.bg};
          border: 1px solid ${colors.border};
          color: ${colors.text};
          padding: 10px 16px;
          text-align: center;
          font-weight: 600;
          font-size: 13px;
        ">
          🚨 ${riskLevel.toUpperCase()} RISK
        </div>
        
        <!-- Content -->
        <div style="padding: 16px; font-size: 13px; color: #374151;">
          <!-- Origin -->
          <div style="margin-bottom: 12px;">
            <div style="font-weight: 600; margin-bottom: 4px;">🔍 Content Origin</div>
            <div>${report.origin_verdict.classification}</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">
              Confidence: ${report.origin_verdict.confidence}
            </div>
          </div>
          
          <!-- Patterns -->
          <div style="margin-bottom: 12px;">
            <div style="font-weight: 600; margin-bottom: 4px;">⚠️ Top Patterns</div>
            <ul style="margin: 0; padding-left: 20px; font-size: 12px;">
              ${report.scam_assessment.scam_patterns.slice(0, 3).map(p => `<li>${p}</li>`).join('')}
            </ul>
          </div>
          
          <!-- Recommendations -->
          <div style="margin-bottom: 12px;">
            <div style="font-weight: 600; margin-bottom: 4px;">💡 Recommendation</div>
            <div style="font-size: 12px;">${report.recommendations.actions[0]}</div>
          </div>
          
          <!-- Actions -->
          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button onclick="chrome.runtime.sendMessage({action: 'getApiUrl'}, (response) => {
              window.open(response.apiUrl.replace('/api', '') + '/results/${report.report_id}', '_blank');
            })" style="
              flex: 1;
              padding: 8px;
              background: #667eea;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 12px;
              font-weight: 500;
            ">
              View Full Report
            </button>
            <button onclick="document.getElementById('verisure-results').remove()" style="
              flex: 1;
              padding: 8px;
              background: #f3f4f6;
              color: #374151;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 12px;
              font-weight: 500;
            ">
              Close
            </button>
          </div>
        </div>
      </div>
    `;
    
    Object.assign(resultsDiv.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: '999999',
      animation: 'verisure-slidein 0.3s ease-out'
    });
    
    // Add slide-in animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes verisure-slidein {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(resultsDiv);
    
    // Auto-close after 15 seconds
    setTimeout(() => {
      if (resultsDiv.parentNode) {
        resultsDiv.remove();
      }
    }, 15000);
  }
  
  // Show error message
  function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
      <div style="
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #dc2626;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(220, 38, 38, 0.15);
        font-size: 13px;
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <strong>Error:</strong> ${message}
      </div>
    `;
    
    Object.assign(errorDiv.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: '999999'
    });
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 5000);
  }
  
  // Handle messages from background script
  function handleMessage(request, sender, sendResponse) {
    if (request.action === 'analyzePageText') {
      const pageText = document.body.innerText.substring(0, 5000);
      sendResponse({ text: pageText });
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
