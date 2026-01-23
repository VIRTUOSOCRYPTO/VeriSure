# VeriSure Browser Extension 🛡️

A powerful browser extension for real-time scam detection and content authenticity verification.

## 🌟 Features

### ✅ Context Menu Integration
- **Right-click selected text** → "Analyze with VeriSure"
- **Right-click images** → "Analyze Image"
- **Right-click links** → "Analyze Link"

### ✅ Popup Interface
- Quick text/URL analysis
- Analysis history (last 50 items)
- Risk level indicators
- Export to PDF

### ✅ Inline Analysis
- Select text on any webpage
- Floating "Analyze" button appears
- Inline results display
- Auto-dismiss after 15 seconds

### ✅ Page Scanning
- Scan entire webpage for suspicious content
- Analyze up to 5000 characters
- One-click analysis

### ✅ Smart Notifications
- Browser notifications for analysis results
- Risk-level badges on extension icon
- Color-coded indicators (🔴 High, 🟡 Medium, 🟢 Low)

---

## 📦 Installation

### Development Mode (Chrome/Edge)

1. **Clone or download this repository**

2. **Open Chrome/Edge Extensions page:**
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`

3. **Enable "Developer mode"** (toggle in top-right corner)

4. **Click "Load unpacked"**

5. **Select the `/app/browser_extension` folder**

6. **Done!** The VeriSure icon should appear in your browser toolbar

### Production Build

```bash
# Create a ZIP file for Chrome Web Store submission
cd /app/browser_extension
zip -r verisure-extension.zip . -x "*.git*" "*node_modules*" "*.DS_Store" "generate_icons.py"
```

---

## ⚙️ Configuration

### Setting up API Endpoint

1. Click the VeriSure extension icon
2. Click the **Settings** button (gear icon)
3. Enter your API endpoint URL:
   - **Local development**: `http://localhost:8001`
   - **Production**: `https://your-verisure-app.com`
4. Click **Save Settings**
5. The extension will test the connection

### Default Settings

```javascript
API_URL: 'http://localhost:8001'
History limit: 50 items
Auto-dismiss results: 15 seconds
```

---

## 🚀 Usage

### Method 1: Popup Interface
1. Click the VeriSure icon in toolbar
2. Enter text or paste URL
3. Click "Analyze Content"
4. View results instantly

### Method 2: Context Menu (Text)
1. Select any text on a webpage
2. Right-click → "Analyze with VeriSure"
3. View inline results

### Method 3: Context Menu (Images)
1. Right-click on any image
2. Select "Analyze Image"
3. Get notification when complete

### Method 4: Inline Selection
1. Select text on any webpage
2. Click the floating "Analyze" button
3. View results inline

### Method 5: Page Scan
1. Open the popup
2. Click "Scan Page"
3. Analyzes all visible text on the current page

---

## 🎨 UI Components

### Popup
- **Width**: 400px
- **Height**: Auto (min 500px)
- **Tabs**: Analyze, History
- **Theme**: Purple gradient (#667eea to #764ba2)

### Inline Results
- **Position**: Top-right corner
- **Animation**: Slide-in from right
- **Auto-dismiss**: 15 seconds
- **Close button**: Manual close available

### Context Menu
- **Positions**:
  - "Analyze with VeriSure" (text selection)
  - "Analyze Image" (images)
  - "Analyze Link" (links)

---

## 🔧 Technical Details

### Manifest Version
- **V3** (latest Chrome extension standard)

### Permissions Required
- `activeTab` - Access current tab content
- `contextMenus` - Right-click menu integration
- `storage` - Save settings and history
- `notifications` - Browser notifications
- `scripting` - Content script injection

### API Integration
- **Backend**: FastAPI at `/api/analyze`
- **Method**: POST with FormData
- **Supports**: text, URL, file uploads
- **Async**: Polls `/api/job/{id}` for video/audio

### Files Structure
```
browser_extension/
├── manifest.json           # Extension configuration
├── background.js           # Service worker (API calls, context menus)
├── content.js              # Content script (inline analysis)
├── popup/
│   ├── popup.html          # Popup UI
│   ├── popup.js            # Popup logic
│   └── popup.css           # Popup styles
├── options/
│   ├── options.html        # Settings page
│   └── options.js          # Settings logic
├── icons/
│   ├── icon16.png          # Toolbar icon
│   ├── icon48.png          # Extension manager icon
│   └── icon128.png         # Chrome Web Store icon
└── README.md               # This file
```

---

## 📊 Data Storage

### Chrome Storage API
- **Sync storage**: API URL (synced across devices)
- **Local storage**: History, temporary context data

### Storage Keys
```javascript
'verisure_api_url'      // API endpoint URL
'verisure_history'      // Analysis history (last 50)
'contextData'           // Temporary context menu data
```

---

## 🎯 Keyboard Shortcuts

- **Enter** in popup textarea → Analyze
- **Esc** → Close inline results
- **Enter** in settings → Save

---

## 🐛 Troubleshooting

### Extension not working?
1. Check if API endpoint is correct in Settings
2. Ensure backend server is running
3. Check browser console for errors (F12 → Console)
4. Reload extension: `chrome://extensions/` → Reload button

### Context menu not appearing?
1. Reload the extension
2. Refresh the webpage
3. Check permissions are granted

### Inline analysis not showing?
1. Check if content script is loaded (Console should show "VeriSure content script loaded")
2. Try refreshing the page
3. Verify text selection is between 10-5000 characters

### API connection failed?
1. Verify backend is running: `curl http://localhost:8001/api/health`
2. Check CORS settings on backend
3. Test API URL in settings with "Save Settings" button

---

## 🔒 Privacy & Security

### Data Handling
- ✅ No data stored on extension servers
- ✅ All analysis done via your API endpoint
- ✅ History stored locally in browser
- ✅ No tracking or analytics

### Permissions Explanation
- **activeTab**: Only accesses current tab when you click analyze
- **contextMenus**: Adds right-click menu options
- **storage**: Saves your settings locally
- **notifications**: Shows analysis results
- **scripting**: Injects analysis UI on pages

---

## 🚀 Publishing to Chrome Web Store

### Requirements
1. Google Developer account ($5 one-time fee)
2. Privacy policy URL
3. Promotional images (440x280, 920x680, 1280x800)

### Steps
1. **Create ZIP**:
   ```bash
   zip -r verisure-extension.zip . -x "*.git*" "*README.md" "generate_icons.py"
   ```

2. **Upload to Chrome Web Store**:
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
   - Click "New Item"
   - Upload ZIP file
   - Fill in details:
     - Name: VeriSure - AI Scam Detector
     - Description: Instantly verify content authenticity...
     - Category: Productivity
     - Language: English

3. **Submit for Review** (typically 1-3 days)

4. **Publish!**

---

## 📈 Roadmap

### v1.1 (Planned)
- [ ] Multi-language support (10 Indian languages)
- [ ] Batch analysis (multiple tabs)
- [ ] Custom keyboard shortcuts
- [ ] Dark mode theme

### v1.2 (Future)
- [ ] WhatsApp Web integration
- [ ] Social media platform integration
- [ ] Real-time URL scanning
- [ ] Advanced forensics mode

---

## 🤝 Contributing

This extension is part of the VeriSure project. For contribution guidelines, see the main project README.

---

## 📄 License

Same as VeriSure main project.

---

## 🆘 Support

- **Issues**: Open an issue on GitHub
- **Email**: support@verisure.app
- **Web App**: https://your-verisure-app.com

---

## 🎉 Credits

Built with ❤️ for safer internet browsing.

**Technologies Used:**
- Manifest V3 (Chrome Extensions API)
- Vanilla JavaScript (ES6+)
- Chrome Storage API
- Chrome Notifications API
- FastAPI Backend Integration

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Status**: Production Ready ✅
