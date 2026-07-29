// Built Day 20
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { setupBackgroundHandler } from './src/services/notificationService';

// Register FCM background message handler at module level
setupBackgroundHandler();

AppRegistry.registerComponent(appName, () => App);
