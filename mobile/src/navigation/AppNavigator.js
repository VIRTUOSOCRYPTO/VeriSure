import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main Screens
import HomeScreen from '../screens/home/HomeScreen';
import TextAnalysisScreen from '../screens/analysis/TextAnalysisScreen';
import ImageAnalysisScreen from '../screens/analysis/ImageAnalysisScreen';
import VideoAnalysisScreen from '../screens/analysis/VideoAnalysisScreen';
import AudioAnalysisScreen from '../screens/analysis/AudioAnalysisScreen';
import BatchAnalysisScreen from '../screens/analysis/BatchAnalysisScreen';
import ResultScreen from '../screens/results/ResultScreen';
import HistoryScreen from '../screens/history/HistoryScreen';
import ComparisonScreen from '../screens/comparison/ComparisonScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import JobStatusScreen from '../screens/results/JobStatusScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const HomeStack = () => {
  const { colors } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'VeriSure' }} />
      <Stack.Screen name="TextAnalysis" component={TextAnalysisScreen} options={{ title: 'Text Analysis' }} />
      <Stack.Screen name="ImageAnalysis" component={ImageAnalysisScreen} options={{ title: 'Image Analysis' }} />
      <Stack.Screen name="VideoAnalysis" component={VideoAnalysisScreen} options={{ title: 'Video Analysis' }} />
      <Stack.Screen name="AudioAnalysis" component={AudioAnalysisScreen} options={{ title: 'Audio Analysis' }} />
      <Stack.Screen name="BatchAnalysis" component={BatchAnalysisScreen} options={{ title: 'Batch Analysis' }} />
      <Stack.Screen name="Result" component={ResultScreen} options={{ title: 'Analysis Result' }} />
      <Stack.Screen name="JobStatus" component={JobStatusScreen} options={{ title: 'Processing...' }} />
    </Stack.Navigator>
  );
};

const HistoryStack = () => {
  const { colors } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="HistoryMain" component={HistoryScreen} options={{ title: 'History' }} />
      <Stack.Screen name="Result" component={ResultScreen} options={{ title: 'Analysis Result' }} />
    </Stack.Navigator>
  );
};

const ComparisonStack = () => {
  const { colors } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="ComparisonMain" component={ComparisonScreen} options={{ title: 'Compare Reports' }} />
    </Stack.Navigator>
  );
};

const ProfileStack = () => {
  const { colors } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Stack.Navigator>
  );
};

const MainTabs = () => {
  const { colors } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="history" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Compare"
        component={ComparisonStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="compare" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="account" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const AuthStack = () => {
  const { colors } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a loading screen
  }

  return isAuthenticated ? <MainTabs /> : <AuthStack />;
};

export default AppNavigator;
