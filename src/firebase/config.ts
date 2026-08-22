import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Web app's Firebase configuration provided by user
const firebaseConfig = {
  apiKey: "AIzaSyD9D3BlTC72kzQbYCqa6aaDlhlaOwlc12o",
  authDomain: "vegies-restro.firebaseapp.com",
  projectId: "vegies-restro",
  storageBucket: "vegies-restro.firebasestorage.app",
  messagingSenderId: "1006312916651",
  appId: "1:1006312916651:web:29ef33b14c0be22b6319ee"
};

// Initialize Firebase
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export const db = getFirestore(app);
