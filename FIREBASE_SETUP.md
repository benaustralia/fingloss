# Firebase Setup Guide

## Get Your Firebase Configuration

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: `fingloss-11b6a`
3. **Go to Project Settings**: Click the gear icon ⚙️ in the left sidebar
4. **Scroll down to "Your apps"** section
5. **Click "Add app"** and select the web icon `</>`
6. **Register your app**:
   - App nickname: `fingloss-web`
   - Check "Also set up Firebase Hosting" (optional)
   - Click "Register app"
7. **Copy the Firebase configuration** that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "fingloss-11b6a.firebaseapp.com",
  projectId: "fingloss-11b6a",
  storageBucket: "fingloss-11b6a.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef..."
};
```

## Update the Configuration

1. **Open** `src/lib/firebase.js`
2. **Replace** the placeholder values with your actual Firebase config
3. **Save** the file

## Enable Firestore

1. **In Firebase Console**, go to "Firestore Database"
2. **Click "Create database"**
3. **Choose "Start in test mode"** (for development)
4. **Select a location** (choose closest to you)
5. **Click "Done"**

## Test the Setup

1. **Run the app**: `npm run dev`
2. **Check the browser console** for any Firebase errors
3. **Try adding a term** to test the database connection

## Security Rules (Optional)

For production, update your Firestore rules in `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /terms/{document} {
      allow read, write: if true; // Allow all for now
    }
  }
}
```

Deploy rules with: `firebase deploy --only firestore:rules`
