/**
 * Android: hand the widget library our background task (index.ts imports
 * this right after the app's own entry). Not in Expo Go, which can't hold
 * the widget's native part.
 */
import { isRunningInExpoGo } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTask } from './task.android';

if (!isRunningInExpoGo()) registerWidgetTaskHandler(widgetTask);
