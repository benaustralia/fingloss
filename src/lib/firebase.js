import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your Firebase configuration
const firebaseConfig = {
  // You'll need to add your actual Firebase config here
  // Get this from Firebase Console > Project Settings > General > Your apps
  apiKey: "your-api-key",
  authDomain: "fingloss-11b6a.firebaseapp.com",
  projectId: "fingloss-11b6a",
  storageBucket: "fingloss-11b6a.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

export default app;
