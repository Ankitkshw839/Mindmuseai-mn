# Firebase Setup for MindMuseAI

This document provides instructions for setting up Firebase Realtime Database rules for MindMuseAI.

## Firebase Realtime Database Rules

For the psychology chat feature and other app functionality to work properly, you need to set up the correct database rules in your Firebase project.

### Steps to Set Up Database Rules:

1. Go to your [Firebase Console](https://console.firebase.google.com/)
2. Select your project (mindfulapp-ad0fa)
3. In the left sidebar, click on "Realtime Database"
4. Click on the "Rules" tab
5. Copy and paste the following rules:

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "profiles": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "moods": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "psychology-chat": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "user-activity": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

6. Click "Publish" to save the rules

These rules ensure that:
- Users can only read and write their own data
- Each user's data is isolated and secure
- No public access is allowed to the database

## Troubleshooting

If you encounter permission errors in the console such as:
```
Error in storeUserData: permission-denied Missing or insufficient permissions.
```

This indicates that the Firebase rules are not properly set up or that the user is not authenticated correctly.

### Common Solutions:

1. Verify that you've set up the rules exactly as shown above
2. Make sure users are properly authenticated before accessing data
3. Check that the user ID being used matches the authenticated user's ID
4. Ensure the database paths match the structure in the rules

## Guest Mode

The psychology chat feature works in guest mode without requiring authentication, but session data will not be saved to Firebase. To save session data and access past sessions, users must be logged in. 