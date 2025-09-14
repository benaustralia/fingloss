import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBbVxa9eh2JwT124nU-kLH_yF7V8MybimI",
  authDomain: "fingloss-11b6a.firebaseapp.com",
  projectId: "fingloss-11b6a",
  storageBucket: "fingloss-11b6a.firebasestorage.app",
  messagingSenderId: "299026518489",
  appId: "1:299026518489:web:d6f8a4cefb91cb55bd49c8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

export default app;
