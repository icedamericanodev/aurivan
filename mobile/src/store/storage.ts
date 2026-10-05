/**
 * Where saved data lives on the phone. AsyncStorage is a simple key/value
 * store that survives app restarts. All stores share this adapter so
 * swapping storage later (e.g. to MMKV for speed) is a one-file change.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

export const persistStorage = createJSONStorage(() => AsyncStorage);
