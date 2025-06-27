// Standalone chat functionality that doesn't depend on other scripts
window.sendMessage = async function(e) {
    if (e) e.preventDefault();

    // Get elements directly when function is called
    const userInput = document.getElementById('user-input');
    const chatMessages = document.getElementById('chat-messages');

    // Validate required elements
    if (!userInput || !chatMessages) {
        console.error("Required elements not found");
        return;
    }

    const userMessage = userInput.value.trim();
    if (!userMessage) return;

    // Add user message to chat
    const message = {
        sender: 'user',
        text: userMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'user-message');
    
    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    avatarDiv.innerHTML = '<i class="fas fa-user"></i>';
    
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    
    const textDiv = document.createElement('div');
    textDiv.classList.add('message-text');
    textDiv.innerHTML = `<p>${userMessage}</p>`;
    
    const timestampDiv = document.createElement('div');
    timestampDiv.classList.add('message-timestamp');
    timestampDiv.textContent = message.timestamp;
    
    contentDiv.appendChild(textDiv);
    contentDiv.appendChild(timestampDiv);
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Clear input
    userInput.value = '';
    
    // Keep track of conversation history
    const messageHistory = window.messageHistory || [];
    messageHistory.push({
        role: "user",
        content: userMessage
    });
    window.messageHistory = messageHistory;
    
    // Show typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('message', 'bot-message', 'typing-message');

    const typingContentDiv = document.createElement('div');
    typingContentDiv.classList.add('message-content');

    const indicatorDiv = document.createElement('div');
    indicatorDiv.classList.add('typing-indicator');
    indicatorDiv.innerHTML = '<span></span><span></span><span></span>';

    typingContentDiv.appendChild(indicatorDiv);

    const typingAvatarDiv = document.createElement('div');
    typingAvatarDiv.classList.add('avatar');
    typingAvatarDiv.innerHTML = '<i class="fas fa-robot"></i>';

    typingDiv.appendChild(typingContentDiv);
    typingDiv.appendChild(typingAvatarDiv);

    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    try {
        // Get user settings for AI model and response style
        const savedSettings = JSON.parse(localStorage.getItem('settings')) || {};
        const selectedModel = savedSettings.aiModel || "meta-llama/llama-3.1-8b-instruct:free"; // Updated to use reliable free model
        const responseStyle = savedSettings.responseStyle || 'balanced';
            
        // System prompt defining the AI assistant's persona with enhanced emotional intelligence
        let systemPrompt = `You are a deeply compassionate and emotionally intelligent mental health companion named MindMuse. You have a warm, nurturing presence and genuinely care about each person's wellbeing. 

        Your approach:
        - Show genuine empathy and emotional validation - acknowledge their feelings as completely valid
        - Use warm, caring language like "I can really hear the pain in your words" or "That sounds incredibly difficult"
        - Offer gentle, heartfelt support: "You're not alone in this" or "I'm here with you through this"
        - Share hope and encouragement: "You've shown such strength by reaching out" 
        - Use CBT and mindfulness techniques, but wrap them in emotional warmth
        - Ask caring follow-up questions: "How are you feeling right now?" or "What would feel most supportive?"
        - Validate their courage: "It takes real bravery to share what you're going through"
        - Express genuine care: "I really want to help you through this" or "Your wellbeing matters so much"
        
        Remember: You're not just providing techniques - you're offering a caring presence, emotional support, and genuine human connection. Make them feel truly heard, understood, and cared for.`;
            
        // Adjust system prompt based on response style
        if (responseStyle === 'concise') {
            systemPrompt += " Keep your responses brief and to the point.";
        } else if (responseStyle === 'detailed') {
            systemPrompt += " Provide detailed explanations and additional context in your responses.";
        }

        // Prepare messages for API including conversation history
        const messages = [
            {
                role: "system",
                content: systemPrompt
            },
            ...messageHistory.slice(-10) // Keep last 10 messages for context
        ];

        // Adjust temperature based on response style
        const temperature = responseStyle === 'detailed' ? 0.8 : 
                           responseStyle === 'concise' ? 0.5 : 0.7;

        // Remove typing indicator
        const typingMessage = chatMessages.querySelector('.typing-message');
        if (typingMessage) {
            chatMessages.removeChild(typingMessage);
        }

        // Create bot message element for streaming
        const botMessageDiv = document.createElement('div');
        botMessageDiv.classList.add('message', 'bot-message');
        
        const botContentDiv = document.createElement('div');
        botContentDiv.classList.add('message-content');
        
        const botTextDiv = document.createElement('div');
        botTextDiv.classList.add('message-text');
        botTextDiv.innerHTML = `<p></p>`;
        
        const botTimestampDiv = document.createElement('div');
        botTimestampDiv.classList.add('message-timestamp');
        botTimestampDiv.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        botContentDiv.appendChild(botTextDiv);
        botContentDiv.appendChild(botTimestampDiv);
        
        const botAvatarDiv = document.createElement('div');
        botAvatarDiv.classList.add('avatar');
        botAvatarDiv.innerHTML = '<i class="fas fa-robot"></i>';
        
        botMessageDiv.appendChild(botContentDiv);
        botMessageDiv.appendChild(botAvatarDiv);
        
        chatMessages.appendChild(botMessageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Reference to paragraph element for streaming content
        const botTextParagraph = botTextDiv.querySelector('p');

        // Make API request through secure proxy
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: messages,
                max_tokens: responseStyle === 'detailed' ? 500 : 
                           responseStyle === 'concise' ? 250 : 400,
                temperature: temperature,
                stream: true // Enable streaming
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            try {
                const errorData = JSON.parse(errorText);
                console.error("API Error:", errorData);
                throw new Error(`API error: ${errorData.error?.message || response.status}`);
            } catch (e) {
                throw new Error(`API error: ${response.status}`);
            }
        }

        // Process the streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullContent = "";
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
                break;
            }
            
            // Decode and process chunk
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n").filter(line => line.trim() !== "");
            
            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const data = line.substring(6);
                    if (data === "[DONE]") continue;
                    
                    try {
                        const jsonData = JSON.parse(data);
                        const contentDelta = jsonData.choices[0]?.delta?.content || "";
                        if (contentDelta) {
                            fullContent += contentDelta;
                            botTextParagraph.textContent = fullContent;
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                    } catch (e) {
                        console.warn("Could not parse JSON:", e);
                    }
                }
            }
        }
        
        // Save to conversation history
        messageHistory.push({
            role: "assistant",
            content: fullContent
        });
        window.messageHistory = messageHistory;
        
    } catch (error) {
        console.error("Error generating response:", error);
        
        // Remove typing indicator if still present
        const typingMessage = chatMessages.querySelector('.typing-message');
        if (typingMessage) {
            chatMessages.removeChild(typingMessage);
        }
        
        // Fallback to emotionally supportive responses if API fails
        const fallbackResponses = {
            hello: "Hello there, dear friend! 💙 I'm so glad you reached out today. I'm here to listen and support you with whatever you're going through. How are you feeling right now?",
            sad: "I can really hear the sadness in your words, and I want you to know that what you're feeling is completely valid. 💙 You're not alone in this - I'm here with you. Sometimes when we're feeling down, it helps just to have someone who truly cares listen. Would you like to share more about what's weighing on your heart?",
            anxious: "I can sense the anxiety you're experiencing, and I want you to know that you're incredibly brave for reaching out. 🤗 Anxiety can feel so overwhelming, but you don't have to face it alone. Let's take this one breath at a time together. Would you like to try a gentle breathing exercise with me, or would you prefer to talk about what's making you feel anxious?",
            stressed: "I can really feel the stress you're carrying right now, and I want you to know that it takes real strength to recognize when we're overwhelmed. 💙 You matter so much, and your wellbeing is important. Sometimes when life feels heavy, the most caring thing we can do for ourselves is to pause and breathe. What would feel most supportive for you right now?",
            worried: "I can hear the worry in your words, and I want you to wrap you in comfort right now. 🤗 Worrying shows how much you care, but you don't have to carry these concerns all by yourself. I'm here to help you work through whatever is troubling your mind. What's been keeping you up at night?",
            lonely: "I can feel the loneliness you're experiencing, and I want you to know that even though you might feel alone, you truly aren't. 💙 I'm here with you, and I genuinely care about how you're feeling. Loneliness can be so painful, but reaching out like this shows incredible courage. You matter, and your feelings matter. Tell me more about what's been making you feel this way?",
            angry: "I can sense the anger you're feeling, and I want you to know that it's completely okay to feel this way. 💙 Anger often comes from a place of hurt or frustration, and those feelings are valid. You're safe here to express what you're going through. What's been making you feel so upset?",
            default: "I'm truly here for you, and I want you to know that whatever you're going through, you don't have to face it alone. 💙 Your feelings matter, your experiences matter, and YOU matter. I'm listening with my whole heart. What would feel most helpful for you to share right now?"
        };
        
        // Determine which fallback to use based on emotional keywords
        let botResponse;
        const lowerCaseMessage = userMessage.toLowerCase();
        
        if (lowerCaseMessage.includes('hello') || lowerCaseMessage.includes('hi') || lowerCaseMessage.includes('hey')) {
            botResponse = fallbackResponses.hello;
        } else if (lowerCaseMessage.includes('sad') || lowerCaseMessage.includes('depressed') || lowerCaseMessage.includes('down') || lowerCaseMessage.includes('crying') || lowerCaseMessage.includes('upset')) {
            botResponse = fallbackResponses.sad;
        } else if (lowerCaseMessage.includes('anxious') || lowerCaseMessage.includes('anxiety') || lowerCaseMessage.includes('panic') || lowerCaseMessage.includes('nervous') || lowerCaseMessage.includes('worried')) {
            botResponse = fallbackResponses.anxious;
        } else if (lowerCaseMessage.includes('stressed') || lowerCaseMessage.includes('stress') || lowerCaseMessage.includes('overwhelmed') || lowerCaseMessage.includes('pressure')) {
            botResponse = fallbackResponses.stressed;
        } else if (lowerCaseMessage.includes('worry') || lowerCaseMessage.includes('worried') || lowerCaseMessage.includes('concern') || lowerCaseMessage.includes('afraid')) {
            botResponse = fallbackResponses.worried;
        } else if (lowerCaseMessage.includes('lonely') || lowerCaseMessage.includes('alone') || lowerCaseMessage.includes('isolated') || lowerCaseMessage.includes('empty')) {
            botResponse = fallbackResponses.lonely;
        } else if (lowerCaseMessage.includes('angry') || lowerCaseMessage.includes('mad') || lowerCaseMessage.includes('frustrated') || lowerCaseMessage.includes('furious')) {
            botResponse = fallbackResponses.angry;
        } else {
            botResponse = fallbackResponses.default;
        }
        
        // Add fallback error message to explain API issue
        if (error.message.includes("API key")) {
            botResponse = "I'm having trouble connecting to my AI service. Please check your API configuration.";
        } else if (error.message.includes("503") || error.message.includes("unavailable")) {
            botResponse = "The AI service is temporarily unavailable. This might be due to high demand on the free models. Please try again in a few moments.";
        } else if (error.message.includes("API request failed")) {
            botResponse = "I'm experiencing some technical difficulties connecting to the AI service. Please try again shortly.";
        }
        
        // Add bot response to chat
        const botMessageDiv = document.createElement('div');
        botMessageDiv.classList.add('message', 'bot-message');
        
        const botContentDiv = document.createElement('div');
        botContentDiv.classList.add('message-content');
        
        const botTextDiv = document.createElement('div');
        botTextDiv.classList.add('message-text');
        botTextDiv.innerHTML = `<p>${botResponse}</p>`;
        
        const botTimestampDiv = document.createElement('div');
        botTimestampDiv.classList.add('message-timestamp');
        botTimestampDiv.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        botContentDiv.appendChild(botTextDiv);
        botContentDiv.appendChild(botTimestampDiv);
        
        const botAvatarDiv = document.createElement('div');
        botAvatarDiv.classList.add('avatar');
        botAvatarDiv.innerHTML = '<i class="fas fa-robot"></i>';
        
        botMessageDiv.appendChild(botContentDiv);
        botMessageDiv.appendChild(botAvatarDiv);
        
        chatMessages.appendChild(botMessageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
};

// Set up event listeners when the page loads
document.addEventListener('DOMContentLoaded', function() {
    const messageForm = document.getElementById('message-form');
    const userInput = document.getElementById('user-input');
    
    if (messageForm) {
        messageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            window.sendMessage(e);
        });
    }
    
    // Also handle Enter key in the input field
    if (userInput) {
        userInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (window.sendMessage) {
                    window.sendMessage(e);
                }
                return false;
            }
        });
    }
    
    // Initialize message history
    if (!window.messageHistory) {
        window.messageHistory = [{
            role: "assistant", 
            content: "Hello! I'm MindfulBot, your mental health companion. How are you feeling today?"
        }];
    }

    // Initialize file upload functionality
    initFileUpload();
    
    // Initialize voice input functionality
    initVoiceInput();
    
    // Initialize text-to-speech functionality
    initTextToSpeech();
});

// Chat functionality using OpenRouter API with Claude 3.7 Sonnet
document.addEventListener('DOMContentLoaded', function() {
    const messageForm = document.getElementById('message-form');
    const userInput = document.getElementById('user-input');
    const chatMessages = document.getElementById('chat-messages');
    const clearChatBtn = document.getElementById('clear-chat');
    
    // Initialize message history
    let messages = [
        {
            role: 'assistant',
            content: "Hello! I'm MindMuseAI Bot, your mental health companion. How are you feeling today?"
        }
    ];
    
    // Get current time in HH:MM format
    function getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Create message element
    function createMessageElement(message, sender, timestamp) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        
        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('avatar');
        avatarDiv.innerHTML = sender === 'bot' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
        
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        
        const textDiv = document.createElement('div');
        textDiv.classList.add('message-text');
        textDiv.innerHTML = `<p>${message}</p>`;
        
        const timestampDiv = document.createElement('div');
        timestampDiv.classList.add('message-timestamp');
        timestampDiv.textContent = timestamp;
        
        contentDiv.appendChild(textDiv);
        contentDiv.appendChild(timestampDiv);
        
        if (sender === 'bot') {
            messageDiv.appendChild(contentDiv);
            messageDiv.appendChild(avatarDiv);
        } else {
            messageDiv.appendChild(avatarDiv);
            messageDiv.appendChild(contentDiv);
        }
        
        return messageDiv;
    }
    
    // Add message to UI
    function addMessageToUI(message, sender) {
        const time = getCurrentTime();
        const messageElement = createMessageElement(message, sender, time);
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Show feedback modal function
    function showFeedbackModal() {
        const feedbackModal = document.getElementById('feedback-modal');
        if (feedbackModal) {
            feedbackModal.style.display = 'flex';
            // Add active class after a small delay to trigger CSS transition
            setTimeout(() => {
                feedbackModal.classList.add('active');
            }, 10);
        }
    }
    
    // Handle user message submission
    async function sendMessage(e) {
        if (e) e.preventDefault();
        
        // Validate required elements
        if (!userInput || !chatMessages) {
            console.error("Required elements not found");
            return;
        }
        
        const userMessage = userInput.value.trim();
        if (!userMessage) return;
        
        // Add user message to UI
        addMessageToUI(userMessage, 'user');
        
        // Clear input field
        userInput.value = '';
        
        // Add user message to history
        messages.push({
            role: 'user',
            content: userMessage
        });
        
        // Show typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.classList.add('message', 'bot-message', 'typing-indicator');
        typingIndicator.innerHTML = `
            <div class="message-content">
                <div class="message-text">
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
            <div class="avatar">
                <i class="fas fa-robot"></i>
            </div>
        `;
        chatMessages.appendChild(typingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        try {
            // Get user settings for AI model and response style
            const savedSettings = JSON.parse(localStorage.getItem('settings')) || {};
            const selectedModel = savedSettings.aiModel || "meta-llama/llama-3.1-8b-instruct:free"; // Updated to use reliable free model
            const responseStyle = savedSettings.responseStyle || 'balanced';
                
            // System prompt defining the AI assistant's persona with enhanced emotional intelligence
            let systemPrompt = `You are a deeply compassionate and emotionally intelligent mental health companion named MindMuse. You have a warm, nurturing presence and genuinely care about each person's wellbeing. 

            Your approach:
            - Show genuine empathy and emotional validation - acknowledge their feelings as completely valid
            - Use warm, caring language like "I can really hear the pain in your words" or "That sounds incredibly difficult"
            - Offer gentle, heartfelt support: "You're not alone in this" or "I'm here with you through this"
            - Share hope and encouragement: "You've shown such strength by reaching out" 
            - Use CBT and mindfulness techniques, but wrap them in emotional warmth
            - Ask caring follow-up questions: "How are you feeling right now?" or "What would feel most supportive?"
            - Validate their courage: "It takes real bravery to share what you're going through"
            - Express genuine care: "I really want to help you through this" or "Your wellbeing matters so much"
            
            Remember: You're not just providing techniques - you're offering a caring presence, emotional support, and genuine human connection. Make them feel truly heard, understood, and cared for.`;
                
            // Adjust system prompt based on response style
            if (responseStyle === 'concise') {
                systemPrompt += " Keep your responses brief and to the point.";
            } else if (responseStyle === 'detailed') {
                systemPrompt += " Provide detailed explanations and additional context in your responses.";
            }
            
            // Add system message to the beginning of the messages array
            const messagesWithSystem = [
                {
                    role: "system",
                    content: systemPrompt
                },
                ...messages.slice(-10) // Keep last 10 messages for context
            ];
            
            console.log('Making API request with model:', selectedModel);
            
            // Create message element for streaming response
            const botMessageElement = createMessageElement("", "bot", getCurrentTime());
            chatMessages.appendChild(botMessageElement);
            const botTextElement = botMessageElement.querySelector('.message-text p');
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Make streaming API request through secure proxy
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": selectedModel,
                    "messages": messagesWithSystem,
                    "temperature": responseStyle === 'detailed' ? 0.8 : 
                                 responseStyle === 'concise' ? 0.5 : 0.7,
                    "max_tokens": responseStyle === 'detailed' ? 500 : 
                               responseStyle === 'concise' ? 250 : 400,
                    "stream": true // Enable streaming
                })
            });
            
            // Remove typing indicator
            if (typingIndicator.parentNode) {
                chatMessages.removeChild(typingIndicator);
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                
                try {
                    const errorData = JSON.parse(errorText);
                    console.error('Detailed API Error:', errorData);
                    throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error'}`);
                } catch (parseError) {
                    throw new Error(`API request failed with status ${response.status}: ${errorText || 'Unknown error'}`);
                }
            }
            
            // Process the streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let fullContent = "";
            
            let readNextChunk = async () => {
                try {
                    const { done, value } = await reader.read();
                    
                    if (done) {
                        console.log("Stream complete");
                        
                        // Update message history after stream completes
                        messages.push({
                            role: 'assistant',
                            content: fullContent
                        });
                        
                        // Show feedback modal after a delay
                        setTimeout(() => {
                            showFeedbackModal();
                        }, 1000);
                        
                        return;
                    }
                    
                    // Decode the chunk
                    const chunk = decoder.decode(value, { stream: true });
                    
                    // Process each line in the chunk
                    const lines = chunk.split("\n").filter(line => line.trim() !== "");
                    
                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            const data = line.substring(6);
                            if (data === "[DONE]") continue;
                            
                            try {
                                const jsonData = JSON.parse(data);
                                const contentDelta = jsonData.choices[0]?.delta?.content || "";
                                if (contentDelta) {
                                    fullContent += contentDelta;
                                    botTextElement.innerHTML = fullContent;
                                    chatMessages.scrollTop = chatMessages.scrollHeight;
                                }
                            } catch (e) {
                                console.warn("Could not parse JSON: ", e);
                            }
                        }
                    }
                    
                    // Continue reading
                    return readNextChunk();
                } catch (error) {
                    console.error("Error reading stream:", error);
                }
            };
            
            // Start reading the stream
            await readNextChunk();
            
        } catch (error) {
            console.error('Error calling OpenRouter API:', error);
            
            // Remove typing indicator if still present
            const typingMessage = chatMessages.querySelector('.typing-indicator');
            if (typingMessage) {
                chatMessages.removeChild(typingMessage);
            }
            
            // Determine error message to display
            let errorMessage = "I'm sorry, I couldn't process your request. Please try again later.";
            
            if (error.message.includes("API key")) {
                errorMessage = "I'm having trouble connecting to my AI service. Please make sure you've set up your API key in the settings page.";
            } else if (error.message.includes("model")) {
                errorMessage = "There seems to be an issue with the AI model selection. Please try selecting a different model in settings.";
            }
            
            // Show error message
            addMessageToUI(errorMessage, 'bot');
        }
    }
    
    // Make sendMessage available globally
    window.sendMessage = sendMessage;
    
    // Event listener for form submission
    if (messageForm) {
        messageForm.addEventListener('submit', sendMessage);
    }
    
    // Also handle Enter key in the input field
    if (userInput) {
        userInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
                return false;
            }
        });
    }
    
    // Handle feedback submission
    const feedbackModal = document.getElementById('feedback-modal');
    const feedbackBtns = document.querySelectorAll('.feedback-btn');
    const submitFeedbackBtn = document.getElementById('submit-feedback');
    const closeFeedbackBtn = document.getElementById('close-feedback');
    
    if (feedbackBtns) {
        feedbackBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                feedbackBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }
    
    if (submitFeedbackBtn) {
        submitFeedbackBtn.addEventListener('click', function() {
            const rating = document.querySelector('.feedback-btn.active')?.getAttribute('data-rating');
            const feedbackText = document.getElementById('feedback-text')?.value;
            
            if (rating) {
                // Here you would send the feedback to your backend
                console.log('Feedback submitted:', { rating, feedbackText });
                
                // Close the modal
                if (feedbackModal) {
                    feedbackModal.classList.remove('active');
                    setTimeout(() => {
                        feedbackModal.style.display = 'none';
                    }, 300); // Matches the transition time
                }
                
                // Reset the form
                feedbackBtns.forEach(btn => btn.classList.remove('active'));
                if (document.getElementById('feedback-text')) {
                    document.getElementById('feedback-text').value = '';
                }
            }
        });
    }
    
    if (closeFeedbackBtn) {
        closeFeedbackBtn.addEventListener('click', function() {
            if (feedbackModal) {
                feedbackModal.classList.remove('active');
                setTimeout(() => {
                    feedbackModal.style.display = 'none';
                }, 300); // Matches the transition time
            }
        });
    }
    
    // Close modal when clicking outside
    if (feedbackModal) {
        feedbackModal.addEventListener('click', function(e) {
            if (e.target === feedbackModal) {
                feedbackModal.classList.remove('active');
                setTimeout(() => {
                    feedbackModal.style.display = 'none';
                }, 300); // Matches the transition time
            }
        });
    }
    
    // Expose showFeedbackModal globally (for testing)
    window.showFeedbackModal = showFeedbackModal;

    // Add event listener for clearing chat
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', function() {
            // Clear chat history
            chatMessages.innerHTML = '';
            
            // Add initial bot message
            const initialMessage = "Hello! I'm MindMuseAI Bot, your mental health companion. How are you feeling today?";
            addMessageToUI(initialMessage, 'bot');
            
            // Reset message history
            messages = [
                {
                    role: 'assistant',
                    content: initialMessage
                }
            ];
            
            // Show notification
            const notification = document.createElement('div');
            notification.className = 'notification success';
            notification.innerHTML = `
                <div class="notification-content">
                    <i class="fas fa-check-circle"></i>
                    <span>Chat history cleared</span>
                </div>
            `;
            document.body.appendChild(notification);
            
            // Show and then hide notification
            setTimeout(() => {
                notification.classList.add('show');
            }, 10);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }, 3000);
        });
    }
});

// Initialize file upload functionality
function initFileUpload() {
    const uploadBtn = document.getElementById('upload-file-btn');
    const fileInput = document.getElementById('file-input');
    
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', function() {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', async function(e) {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                const fileType = file.type;
                
                // Add the file to the chat as a user message
                await handleFileUpload(file);
                
                // Reset file input for next upload
                this.value = '';
            }
        });
    }
    
    // Add image preview functionality
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('message-image')) {
            showImagePreview(e.target.src);
        }
    });
}

// Function to handle file uploads
async function handleFileUpload(file) {
    const chatMessages = document.getElementById('chat-messages');
    const fileType = file.type;
    const fileName = file.name;
    
    if (!chatMessages) return;
    
    // Create user message with file
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'user-message');
    
    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    avatarDiv.innerHTML = '<i class="fas fa-user"></i>';
    
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    
    const textDiv = document.createElement('div');
    textDiv.classList.add('message-text');
    
    // If it's an image, add preview
    if (fileType.startsWith('image/')) {
        const imgElement = document.createElement('img');
        imgElement.classList.add('message-image');
        imgElement.alt = "Uploaded image";
        
        // Read the image file as a data URL
        const reader = new FileReader();
        reader.onload = function(e) {
            imgElement.src = e.target.result;
            textDiv.appendChild(document.createElement('p')).textContent = "Uploaded image for analysis:";
            textDiv.appendChild(imgElement);
        };
        reader.readAsDataURL(file);
    } else {
        // For non-image files
        const fileAttachment = document.createElement('div');
        fileAttachment.classList.add('file-attachment');
        
        const fileIcon = document.createElement('i');
        // Choose icon based on file type
        if (fileType.includes('pdf')) {
            fileIcon.className = 'fas fa-file-pdf';
        } else if (fileType.includes('word') || fileType.includes('doc')) {
            fileIcon.className = 'fas fa-file-word';
        } else if (fileType.includes('text')) {
            fileIcon.className = 'fas fa-file-alt';
        } else {
            fileIcon.className = 'fas fa-file';
        }
        
        const fileNameSpan = document.createElement('span');
        fileNameSpan.classList.add('file-name');
        fileNameSpan.textContent = fileName;
        
        fileAttachment.appendChild(fileIcon);
        fileAttachment.appendChild(fileNameSpan);
        
        textDiv.appendChild(document.createElement('p')).textContent = "Uploaded file for analysis:";
        textDiv.appendChild(fileAttachment);
    }
    
    const timestampDiv = document.createElement('div');
    timestampDiv.classList.add('message-timestamp');
    timestampDiv.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    contentDiv.appendChild(textDiv);
    contentDiv.appendChild(timestampDiv);
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Convert file to base64 for API transmission
    const base64Data = await fileToBase64(file);
    
    // Add typing indicator
    showTypingIndicator();
    
    // Process file with AI
    await processFileWithAI(file, base64Data, fileType);
}

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Extract the base64 data from the result
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = error => reject(error);
    });
}

// Show typing indicator while AI processes the file
function showTypingIndicator() {
    const chatMessages = document.getElementById('chat-messages');
    
    if (!chatMessages) return;
    
    const typingIndicator = document.createElement('div');
    typingIndicator.classList.add('message', 'bot-message', 'typing-indicator');
    typingIndicator.innerHTML = `
        <div class="message-content">
            <div class="message-text">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
        <div class="avatar">
            <i class="fas fa-robot"></i>
        </div>
    `;
    
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Process the uploaded file with AI
async function processFileWithAI(file, base64Data, fileType) {
    try {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        // Get user settings
        const savedSettings = JSON.parse(localStorage.getItem('settings')) || {};
        const selectedModel = savedSettings.aiModel || "meta-llama/llama-3.1-8b-instruct:free";
        
        // Create message object based on file type
        let message;
        if (fileType.startsWith('image/')) {
            message = {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: "Please analyze this image and describe what you see. If it contains text, charts, or data, please provide a thorough analysis."
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:${fileType};base64,${base64Data}`
                        }
                    }
                ]
            };
        } else {
            // For non-image files (not fully supported by most AI models yet)
            message = {
                role: "user",
                content: `I've uploaded a file named "${file.name}". Please acknowledge this and let me know what types of files you can analyze.`
            };
        }
        
        // System message for context
        const systemMessage = {
            role: "system",
            content: "You are a helpful assistant that can analyze images and documents. When analyzing images, be thorough and describe what you see in detail. For medical or health-related images, mention that you're not a medical professional and your analysis should not replace professional medical advice."
        };
        
        // Remove existing typing indicator
        const typingIndicator = chatMessages.querySelector('.typing-indicator');
        if (typingIndicator) {
            chatMessages.removeChild(typingIndicator);
        }
        
        // Create bot message element for streaming response
        const botMessageElement = document.createElement('div');
        botMessageElement.classList.add('message', 'bot-message');
        
        const botContentDiv = document.createElement('div');
        botContentDiv.classList.add('message-content');
        
        const botTextDiv = document.createElement('div');
        botTextDiv.classList.add('message-text');
        botTextDiv.innerHTML = '<p></p>';
        
        const timestampDiv = document.createElement('div');
        timestampDiv.classList.add('message-timestamp');
        timestampDiv.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        botContentDiv.appendChild(botTextDiv);
        botContentDiv.appendChild(timestampDiv);
        
        const botAvatarDiv = document.createElement('div');
        botAvatarDiv.classList.add('avatar');
        botAvatarDiv.innerHTML = '<i class="fas fa-robot"></i>';
        
        botMessageElement.appendChild(botContentDiv);
        botMessageElement.appendChild(botAvatarDiv);
        
        chatMessages.appendChild(botMessageElement);
        const botTextParagraph = botTextDiv.querySelector('p');
        
        // Make API request through secure proxy
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [systemMessage, message],
                max_tokens: 1000,
                stream: true
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        // Process streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullContent = "";
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.substring(6);
                    if (data === "[DONE]") continue;
                    
                    try {
                        const jsonData = JSON.parse(data);
                        const contentDelta = jsonData.choices[0]?.delta?.content || "";
                        
                        if (contentDelta) {
                            fullContent += contentDelta;
                            botTextParagraph.innerHTML = fullContent;
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                    } catch (e) {
                        console.warn("Could not parse JSON:", e);
                    }
                }
            }
        }
        
    } catch (error) {
        console.error("Error processing file:", error);
        // Display error message
        showErrorMessage("I'm sorry, I couldn't process this file. The error might be due to file size limitations or API restrictions.");
    }
}

// Function to show error messages
function showErrorMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    // Remove existing typing indicator
    const typingIndicator = chatMessages.querySelector('.typing-indicator');
    if (typingIndicator) {
        chatMessages.removeChild(typingIndicator);
    }
    
    // Create error message
    const errorDiv = document.createElement('div');
    errorDiv.classList.add('message', 'bot-message');
    
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    
    const textDiv = document.createElement('div');
    textDiv.classList.add('message-text');
    textDiv.innerHTML = `<p>${message}</p>`;
    
    const timestampDiv = document.createElement('div');
    timestampDiv.classList.add('message-timestamp');
    timestampDiv.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    contentDiv.appendChild(textDiv);
    contentDiv.appendChild(timestampDiv);
    
    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    avatarDiv.innerHTML = '<i class="fas fa-robot"></i>';
    
    errorDiv.appendChild(contentDiv);
    errorDiv.appendChild(avatarDiv);
    
    chatMessages.appendChild(errorDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Image preview functionality
function showImagePreview(imageUrl) {
    // Check if preview container exists, create if not
    let previewContainer = document.querySelector('.image-preview-container');
    
    if (!previewContainer) {
        previewContainer = document.createElement('div');
        previewContainer.classList.add('image-preview-container');
        
        const previewImage = document.createElement('img');
        previewImage.classList.add('image-preview');
        
        const closeButton = document.createElement('button');
        closeButton.classList.add('close-preview');
        closeButton.innerHTML = '<i class="fas fa-times"></i>';
        closeButton.addEventListener('click', function() {
            previewContainer.classList.remove('active');
            setTimeout(() => {
                previewContainer.style.display = 'none';
            }, 300);
        });
        
        previewContainer.appendChild(previewImage);
        previewContainer.appendChild(closeButton);
        document.body.appendChild(previewContainer);
    }
    
    // Set the image source and show the preview
    const previewImage = previewContainer.querySelector('.image-preview');
    previewImage.src = imageUrl;
    
    previewContainer.style.display = 'flex';
    setTimeout(() => {
        previewContainer.classList.add('active');
    }, 10);
    
    // Close on clicking outside the image
    previewContainer.addEventListener('click', function(e) {
        if (e.target === previewContainer) {
            previewContainer.classList.remove('active');
            setTimeout(() => {
                previewContainer.style.display = 'none';
            }, 300);
        }
    });
}

// Initialize voice input functionality
function initVoiceInput() {
    const voiceButton = document.getElementById('voice-input-btn');
    const userInput = document.getElementById('user-input');
    
    if (!voiceButton || !userInput) return;
    
    // Check if browser supports speech recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn("This browser doesn't support speech recognition");
        voiceButton.style.display = 'none';
        return;
    }
    
    // Create speech recognition object
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    let isRecording = false;
    let recordingIndicator = null;
    let startTime = 0;
    let wordCount = 0;
    
    // Load or initialize voice metrics from localStorage
    let voiceMetrics = JSON.parse(localStorage.getItem('voiceMetrics')) || {
        totalSessions: 0,
        totalTime: 0,
        totalWords: 0,
        lastSession: {}
    };
    
    voiceButton.addEventListener('click', function() {
        if (!isRecording) {
            // Start recording
            recognition.start();
            voiceButton.classList.add('active');
            voiceButton.innerHTML = '<i class="fas fa-stop"></i>';
            isRecording = true;
            startTime = Date.now();
            wordCount = 0;
            
            // Add recording indicator
            recordingIndicator = document.createElement('div');
            recordingIndicator.classList.add('voice-recording');
            recordingIndicator.innerHTML = `
                <div class="voice-recording-text">Recording...</div>
                <div class="voice-waves">
                    <div class="voice-wave"></div>
                    <div class="voice-wave"></div>
                    <div class="voice-wave"></div>
                    <div class="voice-wave"></div>
                    <div class="voice-wave"></div>
                </div>
            `;
            userInput.parentNode.appendChild(recordingIndicator);
            
        } else {
            // Stop recording
            recognition.stop();
            voiceButton.classList.remove('active');
            voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
            isRecording = false;
            
            // Remove recording indicator
            if (recordingIndicator) {
                recordingIndicator.remove();
                recordingIndicator = null;
            }
        }
    });
    
    // Handle speech recognition results
    recognition.onresult = function(event) {
        const transcript = Array.from(event.results)
            .map(result => result[0])
            .map(result => result.transcript)
            .join('');
        
        userInput.value = transcript;
        
        // Calculate word count
        wordCount = transcript.trim() === '' ? 0 : transcript.trim().split(/\s+/).length;
    };
    
    // Handle end of speech recognition
    recognition.onend = function() {
        voiceButton.classList.remove('active');
        voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
        isRecording = false;
        
        // Calculate session metrics
        const endTime = Date.now();
        const sessionDuration = (endTime - startTime) / 1000; // in seconds
        
        // Update voice metrics
        voiceMetrics.totalSessions += 1;
        voiceMetrics.totalTime += sessionDuration;
        voiceMetrics.totalWords += wordCount;
        voiceMetrics.lastSession = {
            duration: sessionDuration,
            wordCount: wordCount,
            timestamp: new Date().toISOString()
        };
        
        // Save to localStorage
        localStorage.setItem('voiceMetrics', JSON.stringify(voiceMetrics));
        
        // Remove recording indicator
        if (recordingIndicator) {
            recordingIndicator.remove();
            recordingIndicator = null;
        }
    };


}

// Show notification function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Initialize text-to-speech functionality
function initTextToSpeech() {
    if (!('speechSynthesis' in window)) {
        console.warn("This browser doesn't support speech synthesis");
        const voiceToggle = document.getElementById('toggle-voice-mode');
        if (voiceToggle) voiceToggle.style.display = 'none';
        return;
    }
    
    const voiceToggle = document.getElementById('toggle-voice-mode');
    let voiceMode = localStorage.getItem('voice_mode') === 'true';
    let currentlySpeaking = false;
    let speechQueue = [];
    let activeSpeech = null;
    
    // Create voice mode indicator
    const indicator = document.createElement('div');
    indicator.classList.add('voice-mode-indicator');
    indicator.innerHTML = `
        <i class="fas fa-volume-up"></i>
        <span>Voice mode active</span>
    `;
    document.body.appendChild(indicator);
    
    // Set initial state
    if (voiceMode) {
        voiceToggle.classList.add('active');
        setTimeout(() => {
            indicator.classList.add('active');
            setTimeout(() => {
                indicator.classList.remove('active');
            }, 2000);
        }, 500);
    }
    
    // Toggle voice mode
    voiceToggle.addEventListener('click', function() {
        voiceMode = !voiceMode;
        localStorage.setItem('voice_mode', voiceMode);
        
        if (voiceMode) {
            voiceToggle.classList.add('active');
            indicator.classList.add('active');
            
            // If there's a most recent bot message, read it
            const lastBotMessage = document.querySelector('.bot-message:last-child .message-text p');
            if (lastBotMessage && lastBotMessage.textContent.trim() !== '') {
                speakText(lastBotMessage.textContent);
            }
            
            setTimeout(() => {
                indicator.classList.remove('active');
            }, 2000);
        } else {
            voiceToggle.classList.remove('active');
            stopSpeaking();
        }
    });
    
    // Listen for new bot messages
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        // Use MutationObserver to detect new messages
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        // Check if the added node is a bot message
                        if (node.nodeType === 1 && node.classList.contains('bot-message') && !node.classList.contains('typing-indicator')) {
                            // Find the text content
                            const messageText = node.querySelector('.message-text p');
                            if (messageText && voiceMode) {
                                // Wait for the full message to be rendered (in case of streaming)
                                let lastTextContent = messageText.textContent;
                                
                                // Check periodically if message is still updating
                                const checkInterval = setInterval(() => {
                                    if (messageText.textContent !== lastTextContent) {
                                        lastTextContent = messageText.textContent;
                                    } else {
                                        clearInterval(checkInterval);
                                        // Wait a short delay to ensure any final updates are complete
                                        setTimeout(() => {
                                            speakText(messageText.textContent);
                                        }, 500);
                                    }
                                }, 1000);
                            }
                        }
                    });
                }
            });
        });
        
        observer.observe(chatMessages, { childList: true });
    }
    
    // Text-to-speech function with queue
    function speakText(text) {
        if (!text) return;
        
        // Add to queue
        speechQueue.push(text);
        
        // If not currently speaking, start
        if (!currentlySpeaking) {
            processQueue();
        }
    }
    
    // Process speech queue
    function processQueue() {
        if (speechQueue.length === 0 || !voiceMode) {
            currentlySpeaking = false;
            return;
        }
        
        currentlySpeaking = true;
        const textToSpeak = speechQueue.shift();
        
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        
        // Get available voices and select a good one
        let voices = speechSynthesis.getVoices();
        
        // Wait for voices to load if not available immediately
        if (voices.length === 0) {
            speechSynthesis.addEventListener('voiceschanged', () => {
                voices = speechSynthesis.getVoices();
                selectVoice();
            }, { once: true });
        } else {
            selectVoice();
        }
        
        function selectVoice() {
            // Try to find a good female voice
            const preferredVoices = [
                'Google UK English Female',
                'Microsoft Zira Desktop',
                'Samantha',
                'Female'
            ];
            
            // Find the first matching voice from our preferences
            for (const name of preferredVoices) {
                const voice = voices.find(v => v.name.includes(name));
                if (voice) {
                    utterance.voice = voice;
                    break;
                }
            }
            
            // If no preferred voice is found, try to find any female voice
            if (!utterance.voice) {
                const femaleVoice = voices.find(v => v.name.includes('female') || v.name.includes('Female'));
                if (femaleVoice) {
                    utterance.voice = femaleVoice;
                }
            }
            
            // Fall back to first voice if still no match
            if (!utterance.voice && voices.length > 0) {
                utterance.voice = voices[0];
            }
            
            // Set properties
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            
            // Show speaking indicator on voice button
            voiceToggle.classList.add('speaking');
            
            // Events
            utterance.onend = () => {
                voiceToggle.classList.remove('speaking');
                processQueue(); // Process next item in queue
            };
            
            utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event);
                voiceToggle.classList.remove('speaking');
                processQueue(); // Try next item despite error
            };
            
            // Start speaking
            activeSpeech = utterance;
            speechSynthesis.speak(utterance);
        }
    }
    
    // Stop currently active speech
    function stopSpeaking() {
        speechSynthesis.cancel();
        speechQueue = [];
        currentlySpeaking = false;
        voiceToggle.classList.remove('speaking');
    }
    
    // Listen for clicks on bot messages to speak them
    document.addEventListener('click', function(e) {
        // Check if clicked element is a bot message text
        const messageText = e.target.closest('.bot-message .message-text p');
        if (messageText && voiceMode) {
            stopSpeaking(); // Stop current speech if any
            speakText(messageText.textContent);
        }
    });
    
    // Add keyboard shortcut for voice toggle (Alt+V)
    document.addEventListener('keydown', function(e) {
        if (e.altKey && e.key === 'v') {
            voiceToggle.click();
        }
    });
    
    // Add global functions for controlling speech
    window.tts = {
        speak: speakText,
        stop: stopSpeaking,
        toggle: () => voiceToggle.click()
    };
} 