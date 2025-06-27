// Profile Manager - Handles Firebase Realtime Database integration for profile data
import { 
    getCurrentUser, 
    saveUserProfile, 
    getUserProfile, 
    updateUserProfile, 
    listenToProfileChanges,
    saveMoodEntry,
    getMoodHistory
} from './firebase-config.js';

class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.profileListener = null;
        this.init();
    }

    async init() {
        try {
            // Get current user
            this.currentUser = await getCurrentUser();
            if (this.currentUser) {
                console.log("Profile Manager initialized for user:", this.currentUser.uid);
                await this.loadUserProfile();
                this.setupProfileListener();
            } else {
                console.log("No user logged in - Profile Manager in guest mode");
            }
        } catch (error) {
            console.error("Error initializing Profile Manager:", error);
        }
    }

    // Load user profile from Firebase Realtime Database
    async loadUserProfile() {
        if (!this.currentUser) return null;

        try {
            const profileData = await getUserProfile(this.currentUser.uid);
            if (profileData) {
                console.log("Profile data loaded:", profileData);
                this.populateProfileForm(profileData);
                return profileData;
            } else {
                console.log("No existing profile data found");
                return null;
            }
        } catch (error) {
            console.error("Error loading profile:", error);
            return null;
        }
    }

    // Save profile data to Firebase Realtime Database
    async saveProfile(profileData) {
        if (!this.currentUser) {
            throw new Error("User must be logged in to save profile");
        }

        try {
            await saveUserProfile(this.currentUser.uid, profileData);
            console.log("Profile saved successfully");
            this.showSuccessMessage("Profile saved successfully!");
            return true;
        } catch (error) {
            console.error("Error saving profile:", error);
            this.showErrorMessage("Failed to save profile. Please try again.");
            throw error;
        }
    }

    // Update specific profile fields
    async updateProfile(updates) {
        if (!this.currentUser) {
            throw new Error("User must be logged in to update profile");
        }

        try {
            await updateUserProfile(this.currentUser.uid, updates);
            console.log("Profile updated successfully");
            return true;
        } catch (error) {
            console.error("Error updating profile:", error);
            throw error;
        }
    }

    // Set up real-time listener for profile changes
    setupProfileListener() {
        if (!this.currentUser) return;

        this.profileListener = listenToProfileChanges(this.currentUser.uid, (profileData) => {
            if (profileData) {
                console.log("Profile data updated in real-time:", profileData);
                this.populateProfileForm(profileData);
            }
        });
    }

    // Populate form fields with profile data
    populateProfileForm(profileData) {
        const fields = [
            'fullName', 'email', 'phone', 'dateOfBirth', 'gender',
            'emergencyContact', 'emergencyPhone', 'preferredTherapist',
            'mentalHealthGoals', 'currentMedications', 'allergies',
            'previousTherapy', 'stressLevel', 'sleepHours', 'exerciseFrequency'
        ];

        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element && profileData[field]) {
                if (element.type === 'checkbox') {
                    element.checked = profileData[field];
                } else {
                    element.value = profileData[field];
                }
            }
        });

        // Handle profile picture
        if (profileData.profilePicture) {
            const profileImg = document.querySelector('.profile-picture img');
            if (profileImg) {
                profileImg.src = profileData.profilePicture;
            }
        }
    }

    // Collect form data
    collectFormData() {
        const formData = {};
        const fields = [
            'fullName', 'email', 'phone', 'dateOfBirth', 'gender',
            'emergencyContact', 'emergencyPhone', 'preferredTherapist',
            'mentalHealthGoals', 'currentMedications', 'allergies',
            'previousTherapy', 'stressLevel', 'sleepHours', 'exerciseFrequency'
        ];

        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                if (element.type === 'checkbox') {
                    formData[field] = element.checked;
                } else {
                    formData[field] = element.value;
                }
            }
        });

        return formData;
    }

    // Save mood entry
    async saveMood(moodData) {
        if (!this.currentUser) {
            throw new Error("User must be logged in to save mood data");
        }

        try {
            await saveMoodEntry(this.currentUser.uid, moodData);
            console.log("Mood entry saved successfully");
            return true;
        } catch (error) {
            console.error("Error saving mood entry:", error);
            throw error;
        }
    }

    // Get mood history
    async getMoodHistory(limit = 30) {
        if (!this.currentUser) {
            return [];
        }

        try {
            const moodHistory = await getMoodHistory(this.currentUser.uid, limit);
            console.log("Mood history retrieved:", moodHistory.length, "entries");
            return moodHistory;
        } catch (error) {
            console.error("Error getting mood history:", error);
            return [];
        }
    }

    // Show success message
    showSuccessMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'success-message';
        messageDiv.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(messageDiv);
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    // Show error message
    showErrorMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'error-message';
        messageDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        `;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #dc3545, #c82333);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(messageDiv);
        setTimeout(() => {
            messageDiv.remove();
        }, 4000);
    }

    // Cleanup
    destroy() {
        if (this.profileListener) {
            this.profileListener();
        }
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Export for use in other files
window.ProfileManager = ProfileManager;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.profileManager = new ProfileManager();
});

console.log("🔧 Profile Manager loaded successfully");