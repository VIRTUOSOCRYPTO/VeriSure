import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';
import Toast from 'react-native-toast-message';

class NotificationService {
  constructor() {
    this.initialize();
  }

  async initialize() {
    // Request permission for notifications
    await this.requestPermission();

    // Get FCM token
    const token = await this.getFCMToken();
    console.log('FCM Token:', token);

    // Handle foreground notifications
    messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground notification:', remoteMessage);
      this.showLocalNotification(remoteMessage);
    });

    // Handle background/quit state notifications
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background notification:', remoteMessage);
    });

    // Handle notification opened app
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification opened app:', remoteMessage);
      this.handleNotificationAction(remoteMessage);
    });

    // Check if app was opened from quit state by notification
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('App opened from quit state:', remoteMessage);
          this.handleNotificationAction(remoteMessage);
        }
      });
  }

  async requestPermission() {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          console.log('iOS notification permission granted');
        }
      } else if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Android notification permission granted');
          }
        }
      }
    } catch (error) {
      console.error('Notification permission error:', error);
    }
  }

  async getFCMToken() {
    try {
      const token = await messaging().getToken();
      return token;
    } catch (error) {
      console.error('Get FCM token error:', error);
      return null;
    }
  }

  showLocalNotification(remoteMessage) {
    const { notification } = remoteMessage;
    if (notification) {
      Toast.show({
        type: 'info',
        text1: notification.title,
        text2: notification.body,
        visibilityTime: 4000,
        autoHide: true,
      });
    }
  }

  handleNotificationAction(remoteMessage) {
    // Handle navigation based on notification data
    const { data } = remoteMessage;
    console.log('Notification data:', data);

    // You can navigate to specific screens based on data
    // Example: if (data.type === 'analysis_complete') navigate to results
  }

  async subscribeToTopic(topic) {
    try {
      await messaging().subscribeToTopic(topic);
      console.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      console.error('Subscribe to topic error:', error);
    }
  }

  async unsubscribeFromTopic(topic) {
    try {
      await messaging().unsubscribeFromTopic(topic);
      console.log(`Unsubscribed from topic: ${topic}`);
    } catch (error) {
      console.error('Unsubscribe from topic error:', error);
    }
  }
}

const notificationService = new NotificationService();
export default notificationService;
