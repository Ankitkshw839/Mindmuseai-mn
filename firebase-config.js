// Firebase configuration file
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getDatabase, ref as dbRef, set, get, update, push, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Export all Firebase modules for use in other files
export { getDatabase, set, get, update, push, onValue };
export { dbRef };

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCV4kBxBlDt8MAeU2bxhJbkhbtFzCjsQMw",
    authDomain: "mindfulapp-ad0fa.firebaseapp.com",
    databaseURL: "https://mindfulapp-ad0fa-default-rtdb.firebaseio.com/",
    projectId: "mindfulapp-ad0fa",
    storageBucket: "mindfulapp-ad0fa.firebasestorage.app",
    messagingSenderId: "1089965307078",
    appId: "1:1089965307078:web:406ba4d91fac87331593c7"
  };
console.log("Initializing Firebase with config:", {
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId
});

// Initialize Firebase
let app, auth, db, realtimeDb, googleProvider, storage;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    realtimeDb = getDatabase(app);
    storage = getStorage(app);
    googleProvider = new GoogleAuthProvider();
    console.log("Firebase initialized successfully");
    console.log("Realtime Database URL:", firebaseConfig.databaseURL);
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// Email/Password signup
export const createUser = async (email, password) => {
    try {
        console.log("createUser called with email:", email);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("User created successfully:", userCredential.user.uid);
        return userCredential.user;
    } catch (error) {
        console.error("Error in createUser:", error.code, error.message);
        throw error;
    }
};

// Email/Password login
export const signInUser = async (email, password) => {
    try {
        console.log("signInUser called with email:", email);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("User signed in successfully:", userCredential.user.uid);
        return userCredential.user;
    } catch (error) {
        console.error("Error in signInUser:", error.code, error.message);
        throw error;
    }
};

// Google login
export const signInWithGoogle = async () => {
    try {
        console.log("signInWithGoogle called");
        const result = await signInWithPopup(auth, googleProvider);
        console.log("Google sign in successful:", result.user.uid);
        return result.user;
    } catch (error) {
        console.error("Error in signInWithGoogle:", error.code, error.message);
        throw error;
    }
};

// Logout
export const logoutUser = async () => {
    try {
        console.log("logoutUser called");
        await signOut(auth);
        console.log("User signed out successfully");
        return true;
    } catch (error) {
        console.error("Error in logoutUser:", error.code, error.message);
        throw error;
    }
};

// Get current user
export const getCurrentUser = () => {
    return new Promise((resolve, reject) => {
        console.log("getCurrentUser called");
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            console.log("Current user:", user ? user.uid : "No user");
            resolve(user);
        }, (error) => {
            console.error("Error in getCurrentUser:", error);
            reject(error);
        });
    });
};

// Store additional user data in Firestore
export const storeUserData = async (userId, userData) => {
    try {
        console.log("storeUserData called for userId:", userId);
        const userRef = doc(db, "users", userId);
        await setDoc(userRef, userData, { merge: true });
        console.log("User data stored successfully");
        return true;
    } catch (error) {
        console.error("Error in storeUserData:", error.code, error.message);
        throw error;
    }
};

// Upload file to Firebase Storage
export const uploadFile = async (file, path) => {
    try {
        console.log(`Uploading file to path: ${path}`);
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log("File uploaded successfully, download URL:", downloadURL);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading file:", error.code, error.message);
        throw error;
    }
};

// Function to get the Firebase app instance
export function getFirebaseApp() {
    return app;
}

// ===== REALTIME DATABASE FUNCTIONS FOR PROFILE DATA =====

// Save user profile data to Realtime Database
export const saveUserProfile = async (userId, profileData) => {
    try {
        console.log("Saving profile data for user:", userId);
        const userProfileRef = dbRef(realtimeDb, `profiles/${userId}`);
        await set(userProfileRef, {
            ...profileData,
            lastUpdated: new Date().toISOString()
        });
        console.log("Profile data saved successfully");
        return true;
    } catch (error) {
        console.error("Error saving profile data:", error);
        throw error;
    }
};

// Get user profile data from Realtime Database
export const getUserProfile = async (userId) => {
    try {
        console.log("Getting profile data for user:", userId);
        const userProfileRef = dbRef(realtimeDb, `profiles/${userId}`);
        const snapshot = await get(userProfileRef);
        
        if (snapshot.exists()) {
            console.log("Profile data retrieved successfully");
            return snapshot.val();
        } else {
            console.log("No profile data found for user");
            return null;
        }
    } catch (error) {
        console.error("Error getting profile data:", error);
        throw error;
    }
};

// Update specific profile fields
export const updateUserProfile = async (userId, updates) => {
    try {
        console.log("Updating profile data for user:", userId);
        const userProfileRef = dbRef(realtimeDb, `profiles/${userId}`);
        await update(userProfileRef, {
            ...updates,
            lastUpdated: new Date().toISOString()
        });
        console.log("Profile data updated successfully");
        return true;
    } catch (error) {
        console.error("Error updating profile data:", error);
        throw error;
    }
};

// Listen to profile changes in real-time
export const listenToProfileChanges = (userId, callback) => {
    try {
        console.log("Setting up profile listener for user:", userId);
        const userProfileRef = dbRef(realtimeDb, `profiles/${userId}`);
        return onValue(userProfileRef, (snapshot) => {
            const data = snapshot.exists() ? snapshot.val() : null;
            callback(data);
        });
    } catch (error) {
        console.error("Error setting up profile listener:", error);
        throw error;
    }
};

// Save mood tracking data
export const saveMoodEntry = async (userId, moodData) => {
    try {
        console.log("Saving mood entry for user:", userId);
        const moodRef = dbRef(realtimeDb, `moods/${userId}`);
        const newMoodRef = push(moodRef);
        await set(newMoodRef, {
            ...moodData,
            timestamp: new Date().toISOString()
        });
        console.log("Mood entry saved successfully");
        return true;
    } catch (error) {
        console.error("Error saving mood entry:", error);
        throw error;
    }
};

// Get mood history
export const getMoodHistory = async (userId, limit = 30) => {
    try {
        console.log("Getting mood history for user:", userId);
        const moodRef = dbRef(realtimeDb, `moods/${userId}`);
        const snapshot = await get(moodRef);
        
        if (snapshot.exists()) {
            const moods = Object.values(snapshot.val());
            // Sort by timestamp and limit results
            return moods
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, limit);
        } else {
            return [];
        }
    } catch (error) {
        console.error("Error getting mood history:", error);
        throw error;
    }
};

/* ===== ACTIVITY TRACKING FUNCTIONS ===== */
// Helper to fetch activity counters for a user (streak, chat sessions, mood entries)
export const getActivityCounts = async (userId) => {
    try {
        const activityRef = dbRef(realtimeDb, `activity/${userId}`);
        const snapshot = await get(activityRef);
        if (!snapshot.exists()) {
            return {
                streak: { currentStreak: 0 },
                chatSessions: 0,
                moodEntries: 0
            };
        }
        const data = snapshot.val();
        return {
            streak: data.streak || { currentStreak: 0 },
            chatSessions: data.chatSessions || 0,
            moodEntries: data.moodEntries || 0
        };
    } catch (error) {
        console.error("Error fetching activity counts:", error);
        throw error;
    }
};

/* ===== END ACTIVITY FUNCTIONS ===== */

// Record a daily login and maintain a running streak counter
export const recordDailyLogin = async (userId) => {
    try {
        const today = new Date();
        const yyyyMmDd = today.toISOString().split("T")[0]; // e.g. 2025-06-26
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

        const streakRef = dbRef(realtimeDb, `activity/${userId}/streak`);
        await runTransaction(streakRef, (data) => {
            if (data === null) {
                // First ever login
                return {
                    currentStreak: 1,
                    lastLoginDate: yyyyMmDd
                };
            }

            // If already logged in today, do nothing
            if (data.lastLoginDate === yyyyMmDd) {
                return data;
            }

            // If last login was yesterday, increment streak
            if (data.lastLoginDate === yesterday) {
                return {
                    currentStreak: (data.currentStreak || 0) + 1,
                    lastLoginDate: yyyyMmDd
                };
            }

            // Otherwise, reset streak
            return {
                currentStreak: 1,
                lastLoginDate: yyyyMmDd
            };
        });
        console.log("Daily login recorded for", userId);
        return true;
    } catch (error) {
        console.error("Error recording daily login streak:", error);
        throw error;
    }
};

// Increment number of chat sessions the user launches in the AI chat
export const incrementChatSession = async (userId) => {
    try {
        const chatRef = dbRef(realtimeDb, `activity/${userId}/chatSessions`);
        await runTransaction(chatRef, (count) => {
            return (count || 0) + 1;
        });
        console.log("Chat session incremented for", userId);
        return true;
    } catch (error) {
        console.error("Error incrementing chat session count:", error);
        throw error;
    }
};

// Increment number of mood emoji clicks the user performs in app.html
export const incrementMoodEntryCount = async (userId) => {
    try {
        const moodRef = dbRef(realtimeDb, `activity/${userId}/moodEntries`);
        await runTransaction(moodRef, (count) => {
            return (count || 0) + 1;
        });
        console.log("Mood entry count incremented for", userId);
        return true;
    } catch (error) {
        console.error("Error incrementing mood entry count:", error);
        throw error;
    }
};

export { auth, db, realtimeDb, storage }; 

console.log("🔥 Firebase config loaded successfully");
console.log("✅ API Key:", firebaseConfig.apiKey);
console.log("🗄️ Realtime Database configured for profile storage"); 