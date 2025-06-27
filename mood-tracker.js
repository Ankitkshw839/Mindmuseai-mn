// Mood Tracker Integration with Firebase Realtime Database
// Handles storing mood data in Firebase Realtime Database

import { 
    auth, 
    realtimeDb,
    saveMoodEntry as saveToRealtimeDb,
    getMoodHistory as getFromRealtimeDb
} from './firebase-config.js';

// Declare local cache of mood history
let moodHistory = [];
let listeners = [];

// Function to save mood entry to Firebase Realtime Database
export async function saveMoodEntry(mood, notes = '', intensity = 5) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const user = auth.currentUser;
        
        if (!user) {
            console.warn("Not logged in. Mood data will not be saved to Firebase.");
            // Save to local storage as fallback
            saveMoodToLocalStorage({ mood, notes, intensity, date: today });
            return { success: false, error: "User not logged in" };
        }
        
        console.log(`Saving mood '${mood}' for user ${user.uid} on ${today}`);
        
        // Create a new mood entry
        const moodEntry = {
            date: today,
            mood: mood,
            notes: notes,
            intensity: intensity,
            timestamp: new Date().toISOString()
        };
        
        // Save to Firebase Realtime Database
        await saveToRealtimeDb(user.uid, moodEntry);
        
        // Also save to local cache
        moodHistory.unshift(moodEntry);
        
        // Save to local storage as backup
        saveMoodToLocalStorage(moodEntry);
        
        console.log("Mood data saved successfully to Firebase Realtime Database");
        return { success: true };
    } catch (error) {
        console.error("Error saving mood data:", error);
        // Fallback to local storage if Firebase fails
        saveMoodToLocalStorage({ mood, notes, intensity, date: today });
        return { success: false, error: error.message };
    }
}

// Local storage fallback functions
function saveMoodToLocalStorage(moodEntry) {
    try {
        const existingMoods = JSON.parse(localStorage.getItem('mindmuse_moods') || '[]');
        existingMoods.unshift(moodEntry);
        // Keep only last 100 entries to prevent storage overflow
        const limitedMoods = existingMoods.slice(0, 100);
        localStorage.setItem('mindmuse_moods', JSON.stringify(limitedMoods));
        console.log('Mood saved to local storage as backup');
    } catch (error) {
        console.error('Error saving mood to local storage:', error);
    }
}

function getMoodFromLocalStorage() {
    try {
        return JSON.parse(localStorage.getItem('mindmuse_moods') || '[]');
    } catch (error) {
        console.error('Error getting mood from local storage:', error);
        return [];
    }
}

// Function to load mood history from Firebase Realtime Database
export async function loadMoodHistory() {
    try {
        const user = auth.currentUser;
        
        if (!user) {
            console.warn("Not logged in. Loading mood history from local storage.");
            const localMoods = getMoodFromLocalStorage();
            return { success: false, error: "User not logged in", data: localMoods };
        }
        
        console.log(`Loading mood history for user ${user.uid}`);
        
        // Get mood history from Firebase Realtime Database
        const moodData = await getFromRealtimeDb(user.uid, 50); // Get last 50 entries
        
        if (moodData && moodData.length > 0) {
            // Update local cache
            moodHistory = moodData;
            
            console.log("Loaded mood history from Firebase Realtime Database:", moodHistory.length, "entries");
            return { success: true, data: moodHistory };
        } else {
            console.log("No mood entries found in Firebase, checking local storage");
            const localMoods = getMoodFromLocalStorage();
            return { success: true, data: localMoods };
        }
    } catch (error) {
        console.error("Error loading mood history:", error);
        return { success: false, error: error.message, data: [] };
    }
}

// Function to get mood history for a specific time period
export async function getMoodHistoryForPeriod(period) {
    try {
        const result = await loadMoodHistory();
        
        if (!result.success) {
            return result;
        }
        
        const entries = result.data;
        
        // Filter entries based on period
        const now = new Date();
        let filteredEntries = [];
        
        switch (period) {
            case 'week':
                // Last 7 days
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                filteredEntries = entries.filter(entry => new Date(entry.date) >= weekAgo);
                break;
            case 'month':
                // Last 30 days
                const monthAgo = new Date();
                monthAgo.setDate(monthAgo.getDate() - 30);
                filteredEntries = entries.filter(entry => new Date(entry.date) >= monthAgo);
                break;
            case 'year':
                // Last 365 days
                const yearAgo = new Date();
                yearAgo.setDate(yearAgo.getDate() - 365);
                filteredEntries = entries.filter(entry => new Date(entry.date) >= yearAgo);
                break;
            default:
                // Return all entries
                filteredEntries = entries;
                break;
        }
        
        return { success: true, data: filteredEntries };
    } catch (error) {
        console.error(`Error getting mood history for period ${period}:`, error);
        return { success: false, error: error.message, data: [] };
    }
}

// Function to subscribe to mood data updates
export function subscribeToMoodUpdates(callback) {
    try {
        const user = auth.currentUser;
        
        if (!user) {
            console.warn("Not logged in. Cannot subscribe to mood updates.");
            return { success: false, error: "User not logged in" };
        }
        
        console.log(`Setting up mood updates subscription for user ${user.uid}`);
        
        // Reference to user's mood data document
        const userMoodRef = doc(db, "userMoods", user.uid);
        
        // Set up snapshot listener
        const unsubscribe = onSnapshot(userMoodRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const userData = docSnapshot.data();
                
                if (userData.entries && userData.entries.length > 0) {
                    // Sort entries by date
                    const sortedEntries = [...userData.entries].sort((a, b) => {
                        return new Date(b.date) - new Date(a.date);
                    });
                    
                    // Update local cache
                    moodHistory = sortedEntries;
                    
                    // Call callback with new data
                    callback({ success: true, data: moodHistory });
                } else {
                    callback({ success: true, data: [] });
                }
            } else {
                callback({ success: true, data: [] });
            }
        }, (error) => {
            console.error("Error listening to mood updates:", error);
            callback({ success: false, error: error.message, data: [] });
        });
        
        // Add to listeners array
        listeners.push(unsubscribe);
        
        return { success: true, unsubscribe };
    } catch (error) {
        console.error("Error setting up mood updates subscription:", error);
        return { success: false, error: error.message };
    }
}

// Function to unsubscribe from all listeners
export function unsubscribeFromMoodUpdates() {
    try {
        console.log(`Unsubscribing from ${listeners.length} mood update listeners`);
        
        // Call each unsubscribe function
        listeners.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        
        // Clear listeners array
        listeners = [];
        
        return { success: true };
    } catch (error) {
        console.error("Error unsubscribing from mood updates:", error);
        return { success: false, error: error.message };
    }
}

// Function to get mood statistics
export async function getMoodStatistics() {
    try {
        const result = await loadMoodHistory();
        
        if (!result.success) {
            return result;
        }
        
        const entries = result.data;
        
        if (entries.length === 0) {
            return { 
                success: true, 
                data: {
                    totalEntries: 0,
                    mostFrequentMood: null,
                    moodFrequency: {},
                    averageMood: null,
                    streak: 0
                }
            };
        }
        
        // Calculate mood frequency
        const moodFrequency = {};
        entries.forEach(entry => {
            moodFrequency[entry.mood] = (moodFrequency[entry.mood] || 0) + 1;
        });
        
        // Find most frequent mood
        let mostFrequentMood = null;
        let maxCount = 0;
        
        Object.keys(moodFrequency).forEach(mood => {
            if (moodFrequency[mood] > maxCount) {
                mostFrequentMood = mood;
                maxCount = moodFrequency[mood];
            }
        });
        
        // Calculate mood streak
        let streak = 1;
        const sortedByDate = [...entries].sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });
        
        const today = new Date().toISOString().split('T')[0];
        
        // Check if there's an entry for today
        if (sortedByDate.length > 0 && sortedByDate[0].date === today) {
            let currentDate = new Date(today);
            
            for (let i = 1; i < sortedByDate.length; i++) {
                // Calculate expected previous date
                currentDate.setDate(currentDate.getDate() - 1);
                const expectedPrevDate = currentDate.toISOString().split('T')[0];
                
                // If we found the expected previous date, increase streak
                if (sortedByDate[i].date === expectedPrevDate) {
                    streak++;
                } else {
                    break;
                }
            }
        } else {
            streak = 0; // No entry for today means streak is broken
        }
        
        // Prepare the statistics object
        const statistics = {
            totalEntries: entries.length,
            mostFrequentMood,
            moodFrequency,
            streak
        };
        
        return { success: true, data: statistics };
    } catch (error) {
        console.error("Error getting mood statistics:", error);
        return { success: false, error: error.message, data: null };
    }
}

// Export local mood history
export const getMoodHistory = () => moodHistory;

// Initialize mood tracker when the module is loaded
export async function initMoodTracker() {
    try {
        console.log("Initializing mood tracker");
        
        // Check if user is logged in
        const user = auth.currentUser;
        
        if (user) {
            // Load mood history
            await loadMoodHistory();
            console.log("Mood tracker initialized successfully");
        } else {
            console.log("User not logged in. Mood tracker will use local data only.");
        }
        
        return { success: true };
    } catch (error) {
        console.error("Error initializing mood tracker:", error);
        return { success: false, error: error.message };
    }
}

// Listen for auth state changes
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log("User logged in. Loading mood data from Firebase.");
        await loadMoodHistory();
    } else {
        console.log("User logged out. Clearing mood data.");
        moodHistory = [];
        unsubscribeFromMoodUpdates();
    }
});

// Initialize when module loads
initMoodTracker(); 