#!/bin/bash

# VeriSure Mobile App - Quick Test Script
# This script helps you quickly test the mobile app

echo "🚀 VeriSure Mobile App - Quick Test Setup"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the mobile directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found${NC}"
    echo "Please run this script from /app/mobile directory"
    echo ""
    echo "Run: cd /app/mobile && bash test.sh"
    exit 1
fi

echo -e "${GREEN}✓ Found mobile project${NC}"
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js installed:${NC} $NODE_VERSION"
else
    echo -e "${RED}❌ Node.js not found${NC}"
    echo "Please install Node.js 18 or higher"
    exit 1
fi

# Check Yarn
if command -v yarn &> /dev/null; then
    YARN_VERSION=$(yarn -v)
    echo -e "${GREEN}✓ Yarn installed:${NC} $YARN_VERSION"
else
    echo -e "${YELLOW}⚠ Yarn not found, using npm instead${NC}"
fi

echo ""
echo "📦 Checking dependencies..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies (this may take a few minutes)...${NC}"
    yarn install || npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

echo ""
echo "🔧 Checking backend server..."

# Check if backend is running
if curl -s http://localhost:8001/api/ > /dev/null; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is not running${NC}"
    echo ""
    echo "Please start the backend first:"
    echo "  cd /app"
    echo "  sudo supervisorctl restart backend"
    echo ""
    read -p "Press Enter once backend is running..."
fi

echo ""
echo "📱 Select testing option:"
echo ""
echo "1) Test on iOS Simulator (macOS only)"
echo "2) Test on Android Emulator"
echo "3) Just start Metro Bundler"
echo "4) Clean and reset everything"
echo "5) Check .env configuration"
echo "6) Exit"
echo ""
read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        echo ""
        echo "🍎 Starting iOS Simulator..."
        
        # Check if on macOS
        if [[ "$OSTYPE" != "darwin"* ]]; then
            echo -e "${RED}❌ iOS development is only available on macOS${NC}"
            exit 1
        fi
        
        # Check if Xcode is installed
        if ! command -v xcodebuild &> /dev/null; then
            echo -e "${RED}❌ Xcode not installed${NC}"
            echo "Please install Xcode from the App Store"
            exit 1
        fi
        
        # Check if pods are installed
        if [ ! -d "ios/Pods" ]; then
            echo -e "${YELLOW}Installing iOS dependencies (CocoaPods)...${NC}"
            cd ios
            pod install
            cd ..
        fi
        
        echo ""
        echo -e "${GREEN}Starting iOS app...${NC}"
        echo "This will take 1-2 minutes for the first build"
        echo ""
        yarn ios
        ;;
        
    2)
        echo ""
        echo "🤖 Starting Android Emulator..."
        
        # Check if adb is available
        if ! command -v adb &> /dev/null; then
            echo -e "${RED}❌ Android SDK not found${NC}"
            echo "Please install Android Studio and configure Android SDK"
            exit 1
        fi
        
        # Check if any device is connected
        DEVICES=$(adb devices | grep -v "List" | grep "device" | wc -l)
        
        if [ $DEVICES -eq 0 ]; then
            echo -e "${YELLOW}⚠ No Android device or emulator detected${NC}"
            echo ""
            echo "Please:"
            echo "1. Start an Android emulator from Android Studio"
            echo "   OR"
            echo "2. Connect a physical Android device with USB debugging enabled"
            echo ""
            read -p "Press Enter once device is ready..."
        else
            echo -e "${GREEN}✓ Android device detected${NC}"
        fi
        
        # Setup reverse proxy for API access
        adb reverse tcp:8001 tcp:8001
        echo -e "${GREEN}✓ Port forwarding configured${NC}"
        
        echo ""
        echo -e "${GREEN}Starting Android app...${NC}"
        echo "This will take 2-3 minutes for the first build"
        echo ""
        yarn android
        ;;
        
    3)
        echo ""
        echo "📡 Starting Metro Bundler..."
        echo "You can then run iOS or Android from another terminal"
        echo ""
        yarn start
        ;;
        
    4)
        echo ""
        echo "🧹 Cleaning project..."
        
        # Ask for confirmation
        read -p "This will delete node_modules and rebuild. Continue? (y/n): " confirm
        
        if [ "$confirm" = "y" ]; then
            echo "Removing node_modules..."
            rm -rf node_modules
            
            echo "Removing iOS pods..."
            rm -rf ios/Pods ios/Podfile.lock
            
            echo "Cleaning Android..."
            cd android
            ./gradlew clean
            cd ..
            
            echo "Reinstalling dependencies..."
            yarn install
            
            echo "Installing iOS dependencies..."
            cd ios
            pod install
            cd ..
            
            echo -e "${GREEN}✓ Clean and reset complete${NC}"
            echo ""
            echo "Now run this script again to test"
        else
            echo "Cancelled"
        fi
        ;;
        
    5)
        echo ""
        echo "⚙️  .env Configuration:"
        echo "======================"
        
        if [ -f ".env" ]; then
            cat .env
            echo ""
            echo -e "${YELLOW}Note:${NC}"
            echo "- For Android Emulator: use http://10.0.2.2:8001/api"
            echo "- For iOS Simulator: use http://localhost:8001/api"
            echo "- For Physical Device: use http://YOUR_COMPUTER_IP:8001/api"
            echo ""
            
            read -p "Do you want to update the API URL? (y/n): " update
            
            if [ "$update" = "y" ]; then
                echo ""
                echo "Select platform:"
                echo "1) Android Emulator"
                echo "2) iOS Simulator"
                echo "3) Physical Device (manual IP entry)"
                read -p "Choice: " platform
                
                case $platform in
                    1)
                        echo "API_BASE_URL=http://10.0.2.2:8001/api" > .env
                        echo -e "${GREEN}✓ Updated for Android Emulator${NC}"
                        ;;
                    2)
                        echo "API_BASE_URL=http://localhost:8001/api" > .env
                        echo -e "${GREEN}✓ Updated for iOS Simulator${NC}"
                        ;;
                    3)
                        read -p "Enter your computer's IP address: " ip
                        echo "API_BASE_URL=http://$ip:8001/api" > .env
                        echo -e "${GREEN}✓ Updated for Physical Device${NC}"
                        ;;
                esac
            fi
        else
            echo -e "${RED}❌ .env file not found${NC}"
            echo "Creating default .env file..."
            echo "API_BASE_URL=http://10.0.2.2:8001/api" > .env
            echo -e "${GREEN}✓ Created .env with Android Emulator default${NC}"
        fi
        ;;
        
    6)
        echo "Goodbye!"
        exit 0
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "📝 Testing Tips:"
echo "  • Register: Create account (test@example.com / TestPass123)"
echo "  • Login: Use credentials to login"
echo "  • Navigate: Try all bottom tabs"
echo "  • Dark Mode: Toggle system dark mode"
echo ""
echo "🐛 Debug:"
echo "  • iOS: Cmd + D for developer menu"
echo "  • Android: Cmd + M for developer menu"
echo "  • Reload: Double tap R (Android) or Cmd + R (iOS)"
echo ""
echo "📚 Full docs: See /app/mobile/TESTING_GUIDE.md"
echo -e "${GREEN}========================================${NC}"
