# MindMuseAI - Enhanced Mental Health Companion v2.0

A deeply compassionate AI-powered mental health companion designed to provide emotionally intelligent support, guidance, and therapeutic conversations using advanced language models with secure Firebase Realtime Database integration.

## 🚀 Latest Updates (v2.0)

### ✅ **Security Enhancements**
- **Removed API Key Exposure**: Eliminated all client-side API key visibility
- **Server-Side Proxy**: Implemented secure Express.js backend for API requests
- **Environment Variables**: API keys now stored securely in `.env` files
- **Removed Insecure Files**: Deleted `update-key.html` and related insecure components

### 💙 **Enhanced Emotional Intelligence**
- **Deeply Empathetic Responses**: AI now provides more emotional and sympathetic responses
- **Enhanced System Prompts**: Updated to show genuine empathy and emotional validation
- **Improved Fallback Responses**: More caring and supportive offline responses
- **Emotional Keyword Detection**: Better recognition of emotional states in user messages

### 🔥 **Firebase Realtime Database Integration**
- **Profile Data Storage**: User profiles now stored in Firebase Realtime Database
- **Real-time Synchronization**: Live updates across devices
- **Mood Tracking**: Enhanced mood tracking with Firebase backend
- **Offline Support**: Local storage fallbacks when offline
- **Database URL**: `https://mindfulapp-ad0fa-default-rtdb.firebaseio.com/`

## Features

- **🤖 AI-Powered Conversations**: Emotionally intelligent conversations with enhanced empathy
- **🔐 Secure Authentication**: Firebase-based user authentication system
- **📊 Mood Tracking**: Track and visualize your emotional journey with Firebase storage
- **📈 Progress Monitoring**: Monitor your mental health progress with detailed analytics
- **📚 Resource Library**: Access curated mental health resources and exercises
- **📅 Appointment Scheduling**: Schedule sessions with mental health professionals
- **📱 Responsive Design**: Works seamlessly across desktop and mobile devices
- **🔄 Real-time Sync**: Profile and mood data synced across all devices
- **💾 Offline Support**: Local storage fallbacks for offline functionality

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js with Express.js (API proxy)
- **Database**: Firebase Realtime Database
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage
- **AI Integration**: OpenRouter API with Meta Llama 3.1 8B Instruct (Free)
- **Charts**: Chart.js for mood visualization
- **Icons**: Font Awesome
- **Fonts**: Google Fonts (Inter, Nunito)

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Modern web browser with JavaScript enabled
- OpenRouter API key for AI functionality
- Firebase project with Realtime Database enabled

### Quick Installation

1. **Clone and Install**:
```bash
git clone https://github.com/yourusername/mindmuseai.git
cd mindmuseai
npm install
```

2. **Start the Application**:
```bash
npm start
```

3. **Access the App**:
   - Open your browser to `http://localhost:3000`
   - No additional API key setup required (configured server-side)

### Manual Setup

1. **Firebase Configuration**:
   - Project already configured with Realtime Database
   - Database URL: `https://mindfulapp-ad0fa-default-rtdb.firebaseio.com/`
   - Authentication and Storage enabled

2. **API Configuration**:
   - OpenRouter API key: `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`
   - Model: `meta-llama/llama-3.1-8b-instruct:free`
   - Configured server-side for security

## 🔧 New File Structure

```
mindmuseai/
├── server.js                    # Express.js backend server (NEW)
├── .env                        # Environment variables (NEW)
├── profile-manager.js          # Firebase Realtime DB manager (NEW)
├── firebase-realtime-test.html # Database testing interface (NEW)
├── package.json               # Node.js dependencies (UPDATED)
├── index.html                 # Landing page
├── app.html                   # Main application interface (UPDATED)
├── login.html                 # Authentication page
├── profile.html               # User profile management (UPDATED)
├── settings.html              # Application settings (UPDATED)
├── styles.css                 # Main stylesheet
├── script.js                  # Core JavaScript functionality (UPDATED)
├── chat.js                    # Chat interface logic (UPDATED)
├── firebase-config.js         # Firebase configuration (UPDATED)
├── auth.js                    # Authentication logic
├── mood-tracker.js            # Mood tracking functionality (UPDATED)
├── install.bat                # Windows installation script (NEW)
├── start.bat                  # Windows start script (NEW)
└── SECURITY.md                # Security implementation guide (NEW)
```

## 🔒 Security Features

- ✅ **No Client-Side API Key Exposure**
- ✅ **Server-Side API Proxy Protection**
- ✅ **Environment Variable Configuration**
- ✅ **Secure Firebase Realtime Database**
- ✅ **Proper .gitignore Exclusions**
- ✅ **HTTPS Enforcement Ready**

## 💙 Enhanced Emotional Intelligence

### AI Personality
The AI companion now features:
- **Genuine Empathy**: "I can really hear the pain in your words"
- **Emotional Validation**: "Your feelings are completely valid"
- **Warm Support**: "You're not alone in this - I'm here with you"
- **Hope & Encouragement**: "You've shown such strength by reaching out"
- **Caring Presence**: "I really want to help you through this"

### Fallback Responses
Enhanced offline responses with emotional intelligence:
- **Sadness**: Validates feelings and offers gentle support
- **Anxiety**: Acknowledges bravery and offers breathing exercises
- **Stress**: Recognizes strength and suggests self-care
- **Loneliness**: Provides comfort and reassurance
- **Anger**: Validates emotions and creates safe space

## 🔥 Firebase Realtime Database Features

### Profile Management
```javascript
// Save user profile
await saveUserProfile(userId, profileData);

// Get user profile
const profile = await getUserProfile(userId);

// Listen to real-time changes
listenToProfileChanges(userId, (data) => {
    console.log('Profile updated:', data);
});
```

### Mood Tracking
```javascript
// Save mood entry
await saveMoodEntry(userId, {
    mood: 'happy',
    intensity: 8,
    notes: 'Great day today!'
});

// Get mood history
const history = await getMoodHistory(userId, 30);
```

## 🧪 Testing

### Firebase Realtime Database Test
Access the test interface at: `http://localhost:3000/firebase-realtime-test.html`

Features:
- ✅ Connection testing
- ✅ Profile data save/load
- ✅ Mood tracking
- ✅ Real-time updates
- ✅ Error handling

## 📱 Usage

1. **Start the Server**: Run `npm start` or use `start.bat`
2. **Access the App**: Open `http://localhost:3000`
3. **Sign Up/Login**: Create account or login
4. **Complete Profile**: Profile data saved to Firebase Realtime Database
5. **Start Chatting**: Experience enhanced emotional AI responses
6. **Track Mood**: Mood data synced across devices
7. **Real-time Sync**: Changes appear instantly on all devices

## 🔧 Configuration

### Environment Variables (.env)
```env
# OpenRouter API Configuration
OPENROUTER_API_KEY=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
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
SITE_URL=https://mindmuseai.app
SITE_NAME=MindMuseAI

# AI Model Configuration
DEFAULT_MODEL=meta-llama/llama-3.1-8b-instruct:free
```

### Firebase Configuration
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyCV4kBxBlDt8MAeU2bxhJbkhbtFzCjsQMw",
    authDomain: "mindfulapp-ad0fa.firebaseapp.com",
    databaseURL: "https://mindfulapp-ad0fa-default-rtdb.firebaseio.com/",
    projectId: "mindfulapp-ad0fa",
    storageBucket: "mindfulapp-ad0fa.firebasestorage.app",
    messagingSenderId: "1089965307078",
    appId: "1:1089965307078:web:406ba4d91fac87331593c7"
};
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 💙 Privacy & Ethics

MindMuseAI is designed with privacy and ethical considerations:

- ✅ All conversations encrypted and stored securely
- ✅ Firebase Realtime Database with proper security rules
- ✅ No personal data shared without consent
- ✅ AI provides supportive guidance, not medical advice
- ✅ Users encouraged to seek professional help when needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support:
- 📧 Email: support@mindmuseai.com
- 🐛 Issues: Create an issue in this repository
- 📖 Documentation: Check `SECURITY.md` for implementation details

## ⚠️ Disclaimer

MindMuseAI provides supportive conversations and mental health resources. It is not intended to replace professional medical advice, diagnosis, or treatment. Always seek qualified health providers for mental health concerns.

---

**🔥 Ready to experience the enhanced MindMuseAI with secure Firebase integration and deeply empathetic AI responses!**