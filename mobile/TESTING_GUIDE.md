# 🧪 VeriSure Mobile App - Complete Testing Guide

## 📋 Prerequisites

### For macOS (iOS + Android):
- ✅ Node.js >= 18 (check: `node -v`)
- ✅ Xcode (for iOS) - Download from App Store
- ✅ Android Studio (for Android)
- ✅ CocoaPods (for iOS): `sudo gem install cocoapods`
- ✅ React Native CLI: `npm install -g react-native-cli`

### For Windows/Linux (Android only):
- ✅ Node.js >= 18
- ✅ Android Studio
- ✅ Java Development Kit (JDK 11 or higher)

---

## 🚀 STEP-BY-STEP SETUP

### Step 1: Navigate to Mobile Directory
```bash
cd /app/mobile
```

### Step 2: Install Node Dependencies
```bash
# Install all npm packages
yarn install

# Or if you prefer npm
npm install
```

### Step 3: Configure Backend URL

Edit `.env` file and set the correct API URL:

**For Android Emulator:**
```bash
API_BASE_URL=http://10.0.2.2:8001/api
```

**For iOS Simulator:**
```bash
API_BASE_URL=http://localhost:8001/api
```

**For Physical Device:**
```bash
# Find your computer's local IP address:
# macOS/Linux: ifconfig | grep "inet "
# Windows: ipconfig
API_BASE_URL=http://YOUR_IP_ADDRESS:8001/api
```

### Step 4: Start Backend Server

In a separate terminal, make sure your VeriSure backend is running:

```bash
cd /app
sudo supervisorctl restart backend

# Check if backend is running
curl http://localhost:8001/api/

# You should see: {"message": "VeriSure API - Advanced AI Origin & Scam Forensics"}
```

---

## 📱 TESTING ON iOS (macOS Only)

### Step 1: Install iOS Dependencies
```bash
cd ios
pod install
cd ..
```

### Step 2: Start Metro Bundler (Optional - auto-starts)
```bash
yarn start
```

### Step 3: Run on iOS Simulator

**Default simulator:**
```bash
yarn ios
```

**Specific simulator:**
```bash
# List available simulators
xcrun simctl list devices

# Run on specific device
yarn ios --simulator="iPhone 15 Pro"
yarn ios --simulator="iPad Pro (12.9-inch)"
```

### Step 4: Manual Build with Xcode (If needed)
```bash
# Open Xcode workspace
open ios/VeriSureMobile.xcworkspace

# In Xcode:
# 1. Select a simulator from the top bar
# 2. Press Cmd + R to build and run
```

### Common iOS Issues & Fixes:

**Issue: "Command PhaseScriptExecution failed"**
```bash
cd ios
pod deintegrate
pod install
cd ..
yarn ios
```

**Issue: "Metro bundler not found"**
```bash
yarn start --reset-cache
```

**Issue: "Unable to boot simulator"**
```bash
# Reset simulator
xcrun simctl erase all
```

---

## 🤖 TESTING ON ANDROID

### Step 1: Setup Android Emulator

1. Open Android Studio
2. Go to: Tools > Device Manager (or AVD Manager)
3. Click "Create Device"
4. Select: Pixel 5 or Pixel 7 (recommended)
5. Download System Image: Android 13 (API 33) or Android 14 (API 34)
6. Click Finish

### Step 2: Start Android Emulator

**Option A: From Android Studio**
- Open Device Manager
- Click ▶️ (Play) button next to your emulator

**Option B: From Command Line**
```bash
# List emulators
emulator -list-avds

# Start emulator
emulator -avd Pixel_5_API_33
```

### Step 3: Verify Emulator is Running
```bash
adb devices
# You should see: emulator-5554 device
```

### Step 4: Run on Android Emulator
```bash
yarn android
```

### Step 5: Manual Build (if needed)
```bash
cd android
./gradlew clean
./gradlew assembleDebug
cd ..
yarn android
```

### Common Android Issues & Fixes:

**Issue: "SDK location not found"**
```bash
# Create local.properties file
echo "sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk" > android/local.properties

# On Windows:
# echo sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk > android/local.properties
```

**Issue: "ENOSPC: System limit for number of file watchers reached"**
```bash
# Linux only
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**Issue: "Could not connect to development server"**
```bash
# Restart Metro bundler
yarn start --reset-cache

# Enable reverse proxy
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8001 tcp:8001
```

**Issue: "Task :app:installDebug FAILED"**
```bash
cd android
./gradlew clean
cd ..
yarn android
```

---

## 📲 TESTING ON PHYSICAL DEVICES

### iOS Physical Device:

1. **Enable Developer Mode:**
   - Go to Settings > Privacy & Security > Developer Mode
   - Toggle ON and restart device

2. **Connect Device:**
   - Connect iPhone/iPad via USB
   - Trust the computer when prompted

3. **Open Xcode:**
   ```bash
   open ios/VeriSureMobile.xcworkspace
   ```

4. **Select Your Device:**
   - Top bar > Select your device name

5. **Add Apple Developer Account:**
   - Xcode > Preferences > Accounts
   - Sign in with Apple ID (free or paid account)

6. **Configure Signing:**
   - Select project > Signing & Capabilities
   - Select your Team
   - Xcode will handle provisioning

7. **Build & Run:**
   - Press Cmd + R
   - First time: "Untrusted Developer" on device
   - Fix: Settings > General > VPN & Device Management > Trust Developer

### Android Physical Device:

1. **Enable Developer Mode:**
   - Settings > About Phone
   - Tap "Build Number" 7 times

2. **Enable USB Debugging:**
   - Settings > Developer Options
   - Enable "USB Debugging"

3. **Connect Device:**
   - Connect via USB
   - Allow USB debugging when prompted

4. **Verify Connection:**
   ```bash
   adb devices
   # Should show your device ID
   ```

5. **Run App:**
   ```bash
   yarn android
   ```

---

## 🧪 TESTING CHECKLIST

### ✅ What to Test (Currently Implemented)

#### 1. Launch & Navigation
- [ ] App launches without crashes
- [ ] Splash screen displays correctly
- [ ] Login screen loads

#### 2. Authentication Flow
- [ ] **Register:**
  - [ ] Enter name, email, password, organization
  - [ ] Click Register button
  - [ ] Should auto-login and go to Home screen
  - [ ] Try registering with same email (should fail with error toast)

- [ ] **Login:**
  - [ ] Enter valid email/password
  - [ ] Click Login button
  - [ ] Should navigate to Home screen
  - [ ] Try invalid credentials (should show error)

- [ ] **Auto-login:**
  - [ ] Close app
  - [ ] Reopen app
  - [ ] Should go directly to Home screen (no login required)

#### 3. Home Screen
- [ ] Header shows user's name
- [ ] 5 analysis cards displayed
- [ ] User stats show correct counts
- [ ] Tapping cards navigates to respective screens

#### 4. Theme (Dark Mode)
- [ ] Pull down device control center
- [ ] Toggle dark mode on device
- [ ] App should switch theme automatically
- [ ] Colors should be readable in both modes

#### 5. Bottom Navigation
- [ ] Tap "Home" tab
- [ ] Tap "History" tab
- [ ] Tap "Compare" tab
- [ ] Tap "Profile" tab
- [ ] All tabs should be accessible

#### 6. Backend Connection
- [ ] Make sure backend is running: `curl http://localhost:8001/api/`
- [ ] Login should work (proves API connection)
- [ ] Check Metro logs for API calls

#### 7. Offline Indicator
- [ ] Turn off WiFi on device/simulator
- [ ] Home screen should show "Offline Mode" banner
- [ ] Turn WiFi back on
- [ ] Banner should disappear

---

## 🔍 DEBUGGING TIPS

### View Console Logs

**iOS:**
```bash
# Method 1: Metro bundler logs
# Already visible in the terminal where you ran `yarn ios`

# Method 2: React Native Debugger
# In simulator: Cmd + D > Open Debugger
# Then open Chrome: http://localhost:8081/debugger-ui

# Method 3: Xcode Console
# Xcode > View > Debug Area > Activate Console
```

**Android:**
```bash
# Method 1: Metro bundler logs (in terminal)

# Method 2: Logcat
adb logcat

# Method 3: Filtered logs
adb logcat | grep "ReactNative"

# Method 4: In-app developer menu
# Shake device or press Cmd + M (Mac) / Ctrl + M (Windows)
# Select "Debug" > Opens Chrome debugger
```

### Common Debug Commands

**Reload App:**
- iOS: Cmd + R
- Android: R + R (double tap R)
- Or: Shake device > Reload

**Developer Menu:**
- iOS: Cmd + D
- Android: Cmd + M (Mac) / Ctrl + M (Windows)
- Or: Shake device

**Enable Fast Refresh:**
- In developer menu > Enable Fast Refresh
- Code changes auto-reload

---

## 🎬 TESTING SCENARIOS

### Scenario 1: New User Registration
```
1. Launch app
2. Click "Register" link
3. Fill form:
   - Full Name: Test User
   - Email: test@example.com
   - Organization: Test Org
   - Password: TestPass123
4. Click "Register"
5. ✅ Should auto-login and show Home screen
6. ✅ Home screen should show "Welcome back, Test User"
```

### Scenario 2: Existing User Login
```
1. Launch app
2. Enter email: test@example.com
3. Enter password: TestPass123
4. Click "Login"
5. ✅ Should show Home screen with user data
```

### Scenario 3: Invalid Login
```
1. Launch app
2. Enter email: wrong@example.com
3. Enter password: WrongPass
4. Click "Login"
5. ✅ Should show error toast: "Login Failed"
6. ✅ Should stay on Login screen
```

### Scenario 4: Auto-Login
```
1. Login with valid credentials
2. Force quit app (swipe up from bottom)
3. Reopen app
4. ✅ Should directly show Home screen (skip login)
```

### Scenario 5: Logout
```
1. Login to app
2. Go to Profile tab
3. Click Logout (when implemented)
4. ✅ Should return to Login screen
5. Reopen app
6. ✅ Should show Login screen (not Home)
```

### Scenario 6: Theme Switching
```
1. Login to app
2. Device in Light mode
3. ✅ App should have light background
4. Open Control Center > Toggle Dark Mode
5. ✅ App should immediately switch to dark theme
6. ✅ Text should remain readable
```

### Scenario 7: Navigation Flow
```
1. Login to app
2. From Home, tap "Text Analysis" card
3. ✅ Should navigate to Text Analysis screen
4. Tap back button
5. ✅ Should return to Home screen
6. Tap "History" tab
7. ✅ Should show History screen
8. Tap "Profile" tab
9. ✅ Should show Profile screen
```

---

## 📊 PERFORMANCE TESTING

### Monitor Performance

**iOS:**
```bash
# Xcode > Debug Navigator > CPU / Memory / Network
# Or in simulator: Cmd + D > Show Performance Monitor
```

**Android:**
```bash
# In-app: Shake > Show Performance Monitor

# Or system stats:
adb shell dumpsys cpuinfo | grep verisure
adb shell dumpsys meminfo com.verisure.app
```

### Performance Targets
- [ ] Cold start: < 3 seconds
- [ ] Screen navigation: < 300ms
- [ ] Memory usage (idle): < 100 MB
- [ ] No memory leaks (check after navigation)

---

## 🐛 TROUBLESHOOTING COMMON ISSUES

### Issue: "Unable to resolve module"
```bash
# Clear Metro cache
yarn start --reset-cache

# Clear watchman cache
watchman watch-del-all

# Reinstall dependencies
rm -rf node_modules
yarn install
```

### Issue: "Build failed" (iOS)
```bash
cd ios
pod deintegrate
rm -rf Pods Podfile.lock
pod install
cd ..
yarn ios
```

### Issue: "Build failed" (Android)
```bash
cd android
./gradlew clean
cd ..
rm -rf android/app/build
yarn android
```

### Issue: Backend Connection Failed
```bash
# 1. Check backend is running
curl http://localhost:8001/api/

# 2. Check .env file has correct URL
cat .env

# 3. For Android emulator, use 10.0.2.2 not localhost
API_BASE_URL=http://10.0.2.2:8001/api

# 4. Enable reverse proxy (Android)
adb reverse tcp:8001 tcp:8001

# 5. For physical device, use computer's IP
# Find IP: ifconfig (Mac/Linux) or ipconfig (Windows)
API_BASE_URL=http://192.168.1.XXX:8001/api
```

### Issue: "Network request failed"
```bash
# iOS: Edit Info.plist to allow localhost
# Add to ios/VeriSureMobile/Info.plist:
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsLocalNetworking</key>
    <true/>
</dict>

# Android: Already configured in AndroidManifest.xml
```

---

## 📱 DEVICE-SPECIFIC TESTING

### Test on Multiple Devices:

**iOS:**
- iPhone SE (small screen)
- iPhone 15 Pro (standard)
- iPad Pro (tablet)

**Android:**
- Small screen: Samsung Galaxy S10 (360x740)
- Standard: Pixel 5 (393x851)
- Large: Samsung Galaxy S21 Ultra (412x915)
- Tablet: Samsung Tab S8 (800x1280)

---

## 🎯 QUICK TEST COMMANDS

```bash
# Complete reset and test (iOS)
cd ios && pod deintegrate && pod install && cd .. && yarn ios

# Complete reset and test (Android)
cd android && ./gradlew clean && cd .. && yarn android

# Clear everything and start fresh
rm -rf node_modules ios/Pods
yarn install
cd ios && pod install && cd ..
yarn ios  # or yarn android

# Check what's running
ps aux | grep react-native
ps aux | grep metro

# Kill all React Native processes
killall -9 node
```

---

## ✅ SUCCESS CRITERIA

Your mobile app is working correctly if:

1. ✅ App launches without crashes
2. ✅ Registration creates a new user
3. ✅ Login works with correct credentials
4. ✅ Auto-login works on app restart
5. ✅ Home screen displays user name and cards
6. ✅ Bottom navigation works
7. ✅ Dark mode switches automatically
8. ✅ Backend API calls succeed (check logs)
9. ✅ Offline banner appears when no internet
10. ✅ No console errors in Metro bundler

---

## 📞 NEED HELP?

### Check Logs:
1. Metro bundler terminal (most important)
2. Xcode console (iOS)
3. `adb logcat` (Android)

### Common Log Locations:
- Metro: Terminal where you ran `yarn start`
- iOS: Xcode > Console
- Android: `adb logcat | grep ReactNative`

### Debug API Calls:
```javascript
// Add to src/services/apiService.js for debugging
console.log('API Request:', config.url, config.data);
console.log('API Response:', response.data);
```

---

## 🎉 READY TO TEST MORE?

Once remaining screens are implemented, you can test:
- Text analysis with scam detection
- Image upload and analysis
- Video/audio analysis
- Batch file processing
- History viewing and filtering
- Report comparison
- PDF export
- Share functionality

**Current Status**: Foundation is solid, ready for screen development! 🚀
