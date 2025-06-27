// This file is deprecated and no longer used
// The config has been moved directly into script.js to avoid import issues
// See script.js for the current configuration

// OpenRouter API Configuration
const config = {
    api: {
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: null, // API key handled server-side for security
        defaultHeaders: {
            "HTTP-Referer": "https://mindfulchat.ai", // Replace with your actual site URL
            "X-Title": "MindfulChat", // Your app name for OpenRouter rankings
        }
    },
    models: {
        default: "deepseek/deepseek-r1:free", // Free tier model
        alternatives: [
            "anthropic/claude-3-opus:beta",
            "anthropic/claude-3-sonnet:beta",
            "meta-llama/llama-3-70b-instruct",
            "google/gemini-pro"
        ]
    },
    // System prompt defining the AI assistant's persona
    systemPrompt: "You are MindfulBot, a compassionate mental health companion designed to provide emotional support, mindfulness advice, and wellness guidance. Respond with empathy and care. Your purpose is to help users improve their mental wellbeing through supportive conversation, coping strategies, and self-reflection exercises. You should avoid giving medical diagnoses or replacing professional mental health care."
};

// API configuration is now handled server-side for security
// No client-side API key validation needed

export default config; 