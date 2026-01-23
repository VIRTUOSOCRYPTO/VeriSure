"# 🚀 Quick Start - VeriSure Mobile Testing

## ⚡ Super Fast Start

```bash
cd /app/mobile

# Interactive test script (EASIEST)
./test.sh

# Or manually:
yarn install  # First time only
yarn ios      # For iOS
yarn android  # For Android
```

## 📱 Prerequisites Check

```bash
# Check Node.js (need 18+)
node -v

# Check if backend is running
curl http://localhost:8001/api/

# Start backend if needed
cd /app && sudo supervisorctl restart backend
```

## 🎯 Quick Testing (What Works Now)

### 1️⃣ Register New User
```
Open app → Tap \"Register\"
Name: Test User
Email: test@example.com
Password: TestPass123
Tap \"Register\" → Should auto-login
```

### 2️⃣ Login Existing User
```
Email: test@example.com
Password: TestPass123
Tap \"Login\" → See Home screen
```

### 3️⃣ Explore Home
```
• See your name in header
• See 5 analysis cards
• See usage stats
• Toggle device dark mode → Theme changes
```

### 4️⃣ Test Navigation
```
Tap bottom tabs:
• Home → Analysis options
• History → (Empty for now)
• Compare → (Empty for now)
• Profile → (Empty for now)
```

## 🐛 Common Issues - Quick Fixes

### \"Cannot connect to backend\"
```bash
# Update .env with correct URL
cd /app/mobile

# For Android Emulator:
echo \"API_BASE_URL=http://10.0.2.2:8001/api\" > .env

# For iOS Simulator:
echo \"API_BASE_URL=http://localhost:8001/api\" > .env

# Then rebuild
yarn ios    # or yarn android
```

### \"Build failed\"
```bash
# iOS:
cd /app/mobile/ios
pod install
cd ..
yarn ios

# Android:
cd /app/mobile/android
./gradlew clean
cd ..
yarn android
```

### \"Metro bundler issues\"
```bash
cd /app/mobile
yarn start --reset-cache
```

## 📊 What's Working vs Not Yet

### ✅ Working Now:
- App launches
- Registration
- Login/Logout
- Auto-login
- Home screen UI
- Bottom navigation
- Dark mode
- Backend API connection
- Offline detection

### ⏳ Not Yet (Screens need to be built):
- Text analysis
- Image/Video/Audio analysis
- Batch processing
- Viewing results
- History list
- Report comparison
- Profile editing
- Settings

## 🎬 Testing Videos/Screenshots

### Take Screenshots:
- **iOS**: Cmd + S in simulator
- **Android**: Emulator toolbar → Camera icon

### Record Screen:
- **iOS**: Simulator → File → Record Screen
- **Android**: Emulator toolbar → Screen record icon

## 🔍 View Logs While Testing

Keep terminal visible where you ran `yarn ios` or `yarn android` to see:
- API requests/responses
- Navigation events
- Errors (if any)
- Console.log statements

## ⚙️ Device Settings to Test

1. **Dark Mode**: Control Center → Toggle dark mode
2. **Network**: Settings → WiFi → Toggle off (test offline mode)
3. **Language**: Not needed yet (English is default)

## 🎯 Success Checklist

Run through these quickly:
- [ ] App opens without crash
- [ ] Register works (test@example.com)
- [ ] Login works with same credentials
- [ ] Home shows your name
- [ ] Bottom tabs are clickable
- [ ] Dark mode switches automatically
- [ ] No red error screens
- [ ] Backend connection works (check terminal logs)

## 📞 Need More Help?

Read full guides:
- **Complete Guide**: `/app/mobile/TESTING_GUIDE.md`
- **Implementation Status**: `/app/mobile/IMPLEMENTATION_STATUS.md`
- **App README**: `/app/mobile/README.md`

## 🚀 Ready for Production Testing?

Once remaining screens are built, you'll be able to test:
- Complete analysis workflows
- File uploads with progress
- Async video/audio processing
- Offline queue and sync
- Report sharing
- PDF export
- Push notifications

---

**Current Status**: Foundation complete ✅ | Screens: 27% (3/11) ⏳

**Quick support**: Check terminal logs first, they usually tell you exactly what's wrong!
"
