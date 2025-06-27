// Psychology Chat Functionality
import { 
    getCurrentUser, 
    getDatabase, 
    dbRef, 
    set, 
    push, 
    onValue,
    get,
    update,
    incrementChatSession
} from "./firebase-config.js";

document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const messageForm = document.getElementById('message-form');
    const endChatBtn = document.getElementById('end-chat-btn');
    const checkReportBtn = document.getElementById('check-report-btn');
    const reportContainer = document.getElementById('report-container');
    const chatContainer = document.querySelector('.chat-container');
    const backToChatBtn = document.getElementById('back-to-chat-btn');
    const viewSessionsBtn = document.getElementById('view-sessions-btn');
    const pastSessionsContainer = document.getElementById('past-sessions-container');
    const sessionsList = document.getElementById('sessions-list');
    const newSessionBtn = document.getElementById('new-session-btn');
    
    // Store conversation history
    let conversationHistory = [];
    let isChatEnded = false;
    let currentUser = null;
    let currentSessionId = null;
    let localSessionData = null; // For storing session data locally before saving to Firebase

    // Check if user is logged in
    async function initializeUser() {
        try {
            currentUser = await getCurrentUser();
            if (currentUser) {
                console.log("User authenticated:", currentUser.uid);
                // Create a new chat session ID but don't store it yet
                currentSessionId = 'temp-' + Date.now();
                console.log("Created temporary session ID:", currentSessionId);
            } else {
                console.log("User not authenticated, continuing as guest");
                // Generate a temporary session ID for guest users
                currentSessionId = 'guest-' + Date.now();
            }
        } catch (error) {
            console.error("Error initializing user:", error);
            // Continue as guest
            currentSessionId = 'guest-' + Date.now();
        }
    }

    // Initialize user authentication
    initializeUser().then(() => {
        // Track psychology chat usage if user is logged in
        if (currentUser) {
            try {
                incrementChatSession(currentUser.uid).catch(error => {
                    console.error("Error tracking psychology chat session:", error);
                    // Continue without tracking
                });
                console.log("Tracked psychology chat session for user");
            } catch (error) {
                console.error("Error tracking psychology chat session:", error);
                // Continue without tracking
            }
        }
        
        // Initial bot message
        setTimeout(() => {
            const initialMessage = "Hello! I'm your psychological assessment specialist. I'll be asking you some questions to understand your current mental state and provide a professional assessment. How are you feeling today?";
            addBotMessage(initialMessage);
            
            // Store the bot message in Firebase if user is logged in
            if (currentUser) {
                saveChatMessage(currentUser.uid, currentSessionId, "assistant", initialMessage);
            }
            
            // Add follow-up questions after a delay
            setTimeout(() => {
                const followUpMessage = "Could you tell me about any specific challenges or stressors you've been experiencing lately? The more details you can share, the more accurate my assessment will be.";
                addBotMessage(followUpMessage);
                
                // Store the bot message in Firebase if user is logged in
                if (currentUser) {
                    saveChatMessage(currentUser.uid, currentSessionId, "assistant", followUpMessage);
                }
            }, 1500);
        }, 800);
    });

    // Create a new chat session in Firebase
    async function createChatSession(userId) {
        try {
            if (!userId) {
                console.log("No user ID provided, using local session only");
                return 'local-' + Date.now();
            }
            
            const db = getDatabase();
            const sessionsRef = dbRef(db, `psychology-chat/${userId}/sessions`);
            const newSessionRef = push(sessionsRef);
            
            await set(newSessionRef, {
                startTime: new Date().toISOString(),
                status: "active"
            });
            
            console.log("Created new chat session:", newSessionRef.key);
            return newSessionRef.key;
        } catch (error) {
            console.error("Error creating chat session:", error);
            return 'error-' + Date.now(); // Fallback session ID
        }
    }

    // Load previous chat history from Firebase
    async function loadChatHistory(userId, sessionId) {
        try {
            if (!userId || !sessionId || sessionId.startsWith('local-') || sessionId.startsWith('error-')) {
                console.log("Skipping chat history load - using local session only");
                return;
            }
            
            const db = getDatabase();
            const messagesRef = dbRef(db, `psychology-chat/${userId}/sessions/${sessionId}/messages`);
            
            const snapshot = await get(messagesRef);
            if (snapshot.exists()) {
                const messages = snapshot.val();
                
                // Convert the object to an array and sort by timestamp
                const messageArray = Object.values(messages).sort((a, b) => 
                    new Date(a.timestamp) - new Date(b.timestamp)
                );
                
                // Restore conversation history
                conversationHistory = messageArray.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));
                
                console.log("Loaded chat history:", conversationHistory.length, "messages");
            }
        } catch (error) {
            console.error("Error loading chat history:", error);
            // Continue with empty conversation history
        }
    }

    // Save chat message to Firebase
    async function saveChatMessage(userId, sessionId, role, content) {
        try {
            if (!userId || !sessionId || sessionId.startsWith('local-') || sessionId.startsWith('error-')) {
                console.log("Skipping message save - using local session only");
                return;
            }
            
            const db = getDatabase();
            const messagesRef = dbRef(db, `psychology-chat/${userId}/sessions/${sessionId}/messages`);
            const newMessageRef = push(messagesRef);
            
            await set(newMessageRef, {
                role: role,
                content: content,
                timestamp: new Date().toISOString()
            });
            
            console.log("Saved chat message to Firebase");
        } catch (error) {
            console.error("Error saving chat message:", error);
            // Continue without saving to Firebase
        }
    }

    // Save assessment report to Firebase with updated fields
    async function saveAssessmentReport(userId, sessionId, emotion, problem, summary, solution) {
        try {
            if (!userId || !sessionId || sessionId.startsWith('local-') || sessionId.startsWith('error-')) {
                console.log("Skipping report save - using local session only");
                return;
            }
            
            const db = getDatabase();
            const reportRef = dbRef(db, `psychology-chat/${userId}/sessions/${sessionId}/report`);
            
            await set(reportRef, {
                emotion: emotion,
                problem: problem,
                summary: summary,
                solution: solution,
                timestamp: new Date().toISOString()
            });
            
            console.log("Saved assessment report to Firebase");
        } catch (error) {
            console.error("Error saving assessment report:", error);
            // Continue without saving to Firebase
        }
    }

    // Update session status in Firebase
    async function updateSessionStatus(userId, sessionId, status) {
        try {
            if (!userId || !sessionId || sessionId.startsWith('local-') || sessionId.startsWith('error-')) {
                console.log("Skipping status update - using local session only");
                return;
            }
            
            const db = getDatabase();
            const sessionRef = dbRef(db, `psychology-chat/${userId}/sessions/${sessionId}`);
            
            // Update the session status and end time
            await update(sessionRef, {
                status: status,
                endTime: new Date().toISOString()
            });
            
            console.log("Updated session status to:", status);
        } catch (error) {
            console.error("Error updating session status:", error);
            // Continue without updating Firebase
        }
    }

    // Handle message submission
    messageForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const message = userInput.value.trim();
        if (!message) return; // No empty messages allowed

        // Add user message to chat
        addUserMessage(message);
        
        // Store in conversation history
        conversationHistory.push({
            role: "user",
            content: message
        });

        // Save message to Firebase if user is logged in
        if (currentUser && currentSessionId) {
            saveChatMessage(currentUser.uid, currentSessionId, "user", message);
        }

        // Clear input
        userInput.value = '';

        if (!isChatEnded) {
            // Show typing indicator
            showTypingIndicator();

            try {
                // Direct API call without using the server proxy
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": "Bearer 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",
                        "HTTP-Referer": window.location.href || "https://mindmuseai.app",
                        "X-Title": "MindMuseAI",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "model": "mistralai/devstral-small:free",
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a professional psychologist conducting a clinical assessment. Ask insightful, open-ended questions about the user's feelings, thoughts, behaviors, and experiences. Focus on one question at a time, using professional but accessible language. Be empathetic and non-judgmental. Your goal is to understand their mental state and emotional wellbeing through conversation. Ask follow-up questions based on their responses to dig deeper. Include questions about stress, coping mechanisms, sleep patterns, social connections, and recent life changes. Use evidence-based approaches in your questioning. Maintain a professional tone while being supportive."
                            },
                            ...conversationHistory.slice(-10)
                        ],
                        "temperature": 0.7,
                        "max_tokens": 500
                    })
                });

                // Remove typing indicator
                removeTypingIndicator();

                if (response.ok) {
                    const data = await response.json();
                    console.log("API Response:", data); // Debug logging
                    
                    let botReply = "";
                    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
                        botReply = data.choices[0].message.content;
                    } else if (data.error) {
                        console.error("API Error:", data.error);
                        throw new Error(data.error.message || "Unknown API error");
                    } else {
                        console.error("Unexpected API response format:", data);
                        throw new Error("Unexpected API response format");
                    }
                    
                    // Add bot message to chat
                    addBotMessage(botReply);
                    
                    // Store in conversation history
                    conversationHistory.push({
                        role: "assistant",
                        content: botReply
                    });
                    
                    // Save message to Firebase if user is logged in
                    if (currentUser && currentSessionId) {
                        saveChatMessage(currentUser.uid, currentSessionId, "assistant", botReply);
                    }
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    console.error("API Error Response:", errorData);
                    throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
                }
            } catch (error) {
                console.error('Error:', error);
                
                // Remove typing indicator if still present
                removeTypingIndicator();
                
                // Try fallback model if main model fails
                try {
                    console.log("Trying fallback model...");
                    const fallbackResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Authorization": "Bearer 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",
                            "HTTP-Referer": window.location.href || "https://mindmuseai.app",
                            "X-Title": "MindMuseAI",
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            "model": "meta-llama/llama-3-8b-instruct:free",
                            "messages": [
                                {
                                    "role": "system",
                                    "content": "You are a professional psychologist conducting a clinical assessment. Ask insightful, open-ended questions about the user's feelings, thoughts, behaviors, and experiences. Focus on one question at a time, using professional but accessible language. Be empathetic and non-judgmental. Your goal is to understand their mental state and emotional wellbeing through conversation. Ask follow-up questions based on their responses to dig deeper. Include questions about stress, coping mechanisms, sleep patterns, social connections, and recent life changes. Use evidence-based approaches in your questioning. Maintain a professional tone while being supportive."
                                },
                                ...conversationHistory.slice(-10)
                            ],
                            "temperature": 0.7,
                            "max_tokens": 500
                        })
                    });
                    
                    if (fallbackResponse.ok) {
                        const fallbackData = await fallbackResponse.json();
                        const fallbackReply = fallbackData.choices[0].message.content;
                        addBotMessage(fallbackReply);
                        conversationHistory.push({
                            role: "assistant",
                            content: fallbackReply
                        });
                        
                        // Save message to Firebase if user is logged in
                        if (currentUser && currentSessionId) {
                            saveChatMessage(currentUser.uid, currentSessionId, "assistant", fallbackReply);
                        }
                    } else {
                        throw new Error("Fallback model also failed");
                    }
                } catch (fallbackError) {
                    console.error("Fallback model error:", fallbackError);
                    // Add fallback message if both models fail
                    const errorMessage = "I apologize for the technical difficulty. Our secure connection is experiencing an issue. Could you please try again or refresh the page if the problem persists?";
                    addBotMessage(errorMessage);
                    
                    // Save error message to Firebase if user is logged in
                    if (currentUser && currentSessionId) {
                        saveChatMessage(currentUser.uid, currentSessionId, "assistant", errorMessage);
                    }
                }
            }
        }
    });

    // End chat button functionality
    endChatBtn.addEventListener('click', function() {
        // Check if there are any user messages in the conversation
        const hasUserMessages = conversationHistory.some(msg => msg.role === "user");
        if (!hasUserMessages) {
            addBotMessage("Please provide some information about your feelings or challenges before ending the chat. This helps me create a meaningful assessment for you.");
            return;
        }
        
        isChatEnded = true;
        endChatBtn.disabled = true;
        const endMessage = "Thank you for participating in this psychological assessment. I'm now analyzing our conversation to provide you with a comprehensive report. This may take a moment.";
        addBotMessage(endMessage);
        
        // Add end message to conversation history
        conversationHistory.push({
            role: "assistant",
            content: endMessage
        });
        
        // Only now create the actual session in Firebase if user is logged in
        if (currentUser) {
            createAndSaveChatSession(currentUser.uid, conversationHistory)
                .then(sessionId => {
                    currentSessionId = sessionId;
                    console.log("Chat session saved with ID:", sessionId);
                })
                .catch(error => {
                    console.error("Error saving chat session:", error);
                });
        } else {
            // For guest users, store data locally
            localSessionData = {
                messages: [...conversationHistory],
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                status: "ended"
            };
        }
        
        // Show the check report button
        checkReportBtn.style.display = 'flex';
    });

    // Create and save a chat session to Firebase
    async function createAndSaveChatSession(userId, messages) {
        try {
            const db = getDatabase();
            const sessionsRef = dbRef(db, `psychology-chat/${userId}/sessions`);
            const newSessionRef = push(sessionsRef);
            
            // Save the session with all messages at once
            await set(newSessionRef, {
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                status: "ended",
                messages: messages.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                    timestamp: new Date().toISOString()
                }))
            });
            
            console.log("Created and saved chat session:", newSessionRef.key);
            return newSessionRef.key;
        } catch (error) {
            console.error("Error creating chat session:", error);
            return 'error-' + Date.now(); // Fallback session ID
        }
    }

    // Check report button functionality
    checkReportBtn.addEventListener('click', async function() {
        checkReportBtn.disabled = true;
        checkReportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating Report...';
        
        try {
            // Check if there are any user messages in the conversation
            const hasUserMessages = conversationHistory.some(msg => msg.role === "user");
            if (!hasUserMessages) {
                throw new Error("No user input detected in the conversation");
            }
            
            // Prepare the full conversation as a prompt for analysis
            const fullConversation = conversationHistory.map(msg => 
                `${msg.role}: ${msg.content}`
            ).join('\n\n');
            
            // Call the OpenRouter API for analysis
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": "Bearer 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",
                    "HTTP-Referer": window.location.href || "https://mindmuseai.app",
                    "X-Title": "MindMuseAI",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "mistralai/devstral-small:free",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a clinical psychologist analyzing a conversation. Based on the conversation, provide: 1) A professional assessment of the user's emotional state and mood using clinical terminology, 2) A concise problem summary identifying the main issues or challenges the user is facing, 3) A 10-point bullet list summary of key insights about their mindset and mental state with evidence-based observations, and 4) Some helpful evidence-based recommendations and solutions tailored to their situation. Format your response in four clearly labeled sections: 'EMOTION:', 'PROBLEM:', 'SUMMARY:', and 'SOLUTION:'"
                        },
                        {
                            "role": "user",
                            "content": fullConversation
                        }
                    ],
                    "temperature": 0.7,
                    "max_tokens": 1000
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Report API Response:", data); // Debug logging
                
                let analysis = "";
                if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
                    analysis = data.choices[0].message.content;
                } else {
                    throw new Error("Unexpected API response format for report generation");
                }
                
                // Parse the analysis
                const emotionMatch = analysis.match(/EMOTION:(.*?)(?=PROBLEM:|$)/s);
                const problemMatch = analysis.match(/PROBLEM:(.*?)(?=SUMMARY:|$)/s);
                const summaryMatch = analysis.match(/SUMMARY:(.*?)(?=SOLUTION:|$)/s);
                const solutionMatch = analysis.match(/SOLUTION:(.*?)$/s);
                
                const emotion = emotionMatch ? emotionMatch[1].trim() : "Unable to determine emotional state";
                const problem = problemMatch ? problemMatch[1].trim() : "Unable to identify main problems";
                const summary = summaryMatch ? summaryMatch[1].trim() : "Unable to generate summary";
                const solution = solutionMatch ? solutionMatch[1].trim() : "Unable to provide solutions";
                
                // Update the report sections
                document.getElementById('emotion-result').textContent = emotion;
                
                // Display the problem section
                document.getElementById('problem-result').textContent = problem;
                
                // Process summary into bullet points
                const summaryPoints = summary.split('\n')
                    .filter(point => point.trim().length > 0)
                    .map(point => point.replace(/^-\s*/, '').trim());
                
                const summaryHTML = summaryPoints.map(point => `<li>${point}</li>`).join('');
                document.getElementById('report-summary').innerHTML = summaryHTML || "<li>No significant patterns detected in conversation.</li>";
                
                document.getElementById('solution-content').textContent = solution;
                
                // Save report to Firebase if user is logged in
                if (currentUser && currentSessionId && !currentSessionId.startsWith('temp-')) {
                    saveAssessmentReport(currentUser.uid, currentSessionId, emotion, problem, summary, solution);
                    updateSessionStatus(currentUser.uid, currentSessionId, "completed");
                } else if (currentUser && currentSessionId.startsWith('temp-')) {
                    // If we have a temporary session ID but the user is logged in, update the report in the already saved session
                    if (localSessionData) {
                        localSessionData.report = { emotion, problem, summary, solution };
                    }
                } else {
                    // For guest users, store report locally
                    if (localSessionData) {
                        localSessionData.report = { emotion, problem, summary, solution };
                    }
                }
                
                // Add download records button
                const recordsBtn = document.createElement('button');
                recordsBtn.id = 'download-records-btn';
                recordsBtn.className = 'action-button download-records-btn';
                recordsBtn.innerHTML = '<i class="fas fa-download"></i> Download Records';
                recordsBtn.addEventListener('click', function() {
                    downloadSessionRecords(emotion, problem, summary, solution);
                });
                
                // Add the button to the report container
                const reportActionsDiv = document.querySelector('.report-actions') || 
                    document.createElement('div');
                
                if (!document.querySelector('.report-actions')) {
                    reportActionsDiv.className = 'report-actions';
                    reportContainer.appendChild(reportActionsDiv);
                }
                
                // Check if button already exists
                if (!document.getElementById('download-records-btn')) {
                    reportActionsDiv.appendChild(recordsBtn);
                }
                
                // Show the report
                chatContainer.style.display = 'none';
                reportContainer.style.display = 'block';
                checkReportBtn.style.display = 'none';
            } else {
                throw new Error('API request failed for report generation');
            }
        } catch (error) {
            console.error('Error generating report:', error);
            checkReportBtn.disabled = false;
            checkReportBtn.innerHTML = '<i class="fas fa-file-medical-alt"></i> Check Your Report';
            const errorMessage = "I apologize, but I'm having difficulty generating your report. Please try again or contact support if the issue persists.";
            addBotMessage(errorMessage);
            
            // Add error message to conversation history
            conversationHistory.push({
                role: "assistant",
                content: errorMessage
            });
        }
    });

    // Back to chat button
    backToChatBtn.addEventListener('click', function() {
        reportContainer.style.display = 'none';
        pastSessionsContainer.style.display = 'none';
        chatContainer.style.display = 'block';
        checkReportBtn.disabled = false;
        checkReportBtn.innerHTML = '<i class="fas fa-file-medical-alt"></i> Check Your Report';
    });

    // View past sessions button
    viewSessionsBtn.addEventListener('click', async function() {
        if (!currentUser) {
            // Show a more user-friendly message in the chat
            addBotMessage("To view your past sessions, you need to be logged in. This allows us to securely store your conversation history and assessment reports. Please log in or create an account to access this feature.");
            
            // Add a small delay before showing the second message
            setTimeout(() => {
                addBotMessage("Your current session will continue as a guest user, but it won't be saved after you leave this page.");
            }, 1500);
            return;
        }
        
        chatContainer.style.display = 'none';
        reportContainer.style.display = 'none';
        pastSessionsContainer.style.display = 'block';
        
        // Load past sessions
        await loadPastSessions(currentUser.uid);
    });
    
    // New session button
    newSessionBtn.addEventListener('click', async function() {
        // Reset the current session
        conversationHistory = [];
        isChatEnded = false;
        
        // Create a new session in Firebase
        if (currentUser) {
            currentSessionId = await createChatSession(currentUser.uid);
            
            // Track new psychology chat session
            try {
                incrementChatSession(currentUser.uid).catch(error => {
                    console.error("Error tracking new psychology chat session:", error);
                    // Continue without tracking
                });
                console.log("Tracked new psychology chat session for user");
            } catch (error) {
                console.error("Error tracking new psychology chat session:", error);
                // Continue without tracking
            }
        }
        
        // Clear chat messages
        chatMessages.innerHTML = '';
        
        // Show chat container
        pastSessionsContainer.style.display = 'none';
        reportContainer.style.display = 'none';
        chatContainer.style.display = 'block';
        
        // Reset buttons
        endChatBtn.disabled = false;
        checkReportBtn.style.display = 'none';
        
        // Send initial messages
        setTimeout(() => {
            const initialMessage = "Hello! I'm your psychological assessment specialist. I'll be asking you some questions to understand your current mental state and provide a professional assessment. How are you feeling today?";
            addBotMessage(initialMessage);
            
            // Store the bot message in Firebase if user is logged in
            if (currentUser) {
                saveChatMessage(currentUser.uid, currentSessionId, "assistant", initialMessage);
            }
            
            // Add follow-up questions after a delay
            setTimeout(() => {
                const followUpMessage = "Could you tell me about any specific challenges or stressors you've been experiencing lately? The more details you can share, the more accurate my assessment will be.";
                addBotMessage(followUpMessage);
                
                // Store the bot message in Firebase if user is logged in
                if (currentUser) {
                    saveChatMessage(currentUser.uid, currentSessionId, "assistant", followUpMessage);
                }
            }, 1500);
        }, 800);
    });
    
    // Load past sessions from Firebase - updated to show problem and emotion
    async function loadPastSessions(userId) {
        try {
            sessionsList.innerHTML = '<p class="no-sessions-message">Loading sessions...</p>';
            
            const db = getDatabase();
            const sessionsRef = dbRef(db, `psychology-chat/${userId}/sessions`);
            
            const snapshot = await get(sessionsRef);
            if (snapshot.exists()) {
                const sessions = snapshot.val();
                
                if (Object.keys(sessions).length === 0) {
                    sessionsList.innerHTML = '<p class="no-sessions-message">No past sessions found.</p>';
                    return;
                }
                
                // Convert the object to an array and sort by startTime (newest first)
                const sessionArray = Object.entries(sessions).map(([id, data]) => ({
                    id,
                    ...data
                })).sort((a, b) => 
                    new Date(b.startTime) - new Date(a.startTime)
                );
                
                // Generate HTML for each session
                sessionsList.innerHTML = '';
                
                for (const session of sessionArray) {
                    const sessionDate = new Date(session.startTime).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    // Get report summary if available
                    let emotionSummary = '';
                    let problemSummary = '';
                    
                    if (session.status === 'completed' && session.report) {
                        emotionSummary = session.report.emotion || '';
                        problemSummary = session.report.problem || '';
                        
                        // Truncate if too long
                        if (emotionSummary.length > 100) {
                            emotionSummary = emotionSummary.substring(0, 100) + '...';
                        }
                        if (problemSummary.length > 100) {
                            problemSummary = problemSummary.substring(0, 100) + '...';
                        }
                    }
                    
                    // Create session element
                    const sessionEl = document.createElement('div');
                    sessionEl.classList.add('session-item');
                    sessionEl.dataset.sessionId = session.id;
                    
                    let statusLabel = '';
                    switch(session.status) {
                        case 'active':
                            statusLabel = 'Active';
                            break;
                        case 'ended':
                            statusLabel = 'Ended';
                            break;
                        case 'completed':
                            statusLabel = 'Completed';
                            break;
                        default:
                            statusLabel = 'Unknown';
                    }
                    
                    sessionEl.innerHTML = `
                        <div class="session-header">
                            <div class="session-date">${sessionDate}</div>
                            <div class="session-status ${session.status}">${statusLabel}</div>
                        </div>
                        ${emotionSummary ? `
                            <div class="session-emotion">
                                <strong>Emotional State:</strong> ${emotionSummary}
                            </div>
                        ` : ''}
                        ${problemSummary ? `
                            <div class="session-problem">
                                <strong>Problem:</strong> ${problemSummary}
                            </div>
                        ` : ''}
                        <div class="session-actions">
                            <button class="session-action-btn view-session" data-session-id="${session.id}">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="session-action-btn download" data-session-id="${session.id}">
                                <i class="fas fa-download"></i> Records
                            </button>
                            <button class="session-action-btn delete" data-session-id="${session.id}">
                                <i class="fas fa-trash-alt"></i> Delete
                            </button>
                        </div>
                    `;
                    
                    sessionsList.appendChild(sessionEl);
                }
                
                // Add event listeners to session actions
                document.querySelectorAll('.view-session').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const sessionId = btn.dataset.sessionId;
                        viewSession(userId, sessionId);
                    });
                });
                
                document.querySelectorAll('.session-action-btn.download').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const sessionId = btn.dataset.sessionId;
                        downloadSessionById(userId, sessionId);
                    });
                });
                
                document.querySelectorAll('.session-action-btn.delete').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const sessionId = btn.dataset.sessionId;
                        deleteSession(userId, sessionId);
                    });
                });
                
                // Make entire session item clickable
                document.querySelectorAll('.session-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const sessionId = item.dataset.sessionId;
                        viewSession(userId, sessionId);
                    });
                });
            } else {
                sessionsList.innerHTML = '<p class="no-sessions-message">No past sessions found.</p>';
            }
        } catch (error) {
            console.error("Error loading past sessions:", error);
            sessionsList.innerHTML = '<p class="no-sessions-message">Error loading sessions. Please try again.</p>';
        }
    }
    
    // View a specific session
    async function viewSession(userId, sessionId) {
        try {
            // Load session data
            const db = getDatabase();
            
            // Check if session has a report
            const sessionRef = dbRef(db, `psychology-chat/${userId}/sessions/${sessionId}`);
            const sessionSnapshot = await get(sessionRef);
            
            if (!sessionSnapshot.exists()) {
                addBotMessage("Could not load the selected session. It may have been deleted or corrupted.");
                
                // Show the chat container
                pastSessionsContainer.style.display = 'none';
                reportContainer.style.display = 'none';
                chatContainer.style.display = 'block';
                return;
            }
            
            const session = sessionSnapshot.val();
            
            if (session.report) {
                // Session has a report, show it
                const report = session.report;
                
                document.getElementById('emotion-result').textContent = report.emotion || "No emotional assessment available";
                
                document.getElementById('problem-result').textContent = report.problem || "No problem identification available";
                
                // Process summary into bullet points
                if (report.summary) {
                    const summaryPoints = report.summary.split('\n')
                        .filter(point => point.trim().length > 0)
                        .map(point => point.replace(/^-\s*/, '').trim());
                    
                    const summaryHTML = summaryPoints.map(point => `<li>${point}</li>`).join('');
                    document.getElementById('report-summary').innerHTML = summaryHTML || "<li>No significant patterns detected in conversation.</li>";
                } else {
                    document.getElementById('report-summary').innerHTML = "<li>No conversation summary available.</li>";
                }
                
                document.getElementById('solution-content').textContent = report.solution || "No solutions available";
                
                // Show the report container
                pastSessionsContainer.style.display = 'none';
                reportContainer.style.display = 'block';
                
                // Add a "Continue Session" button if the session can be continued
                const reportActions = document.querySelector('.report-actions');
                
                // Remove the continue button if it already exists
                const existingContinueBtn = document.getElementById('continue-session-btn');
                if (existingContinueBtn) {
                    reportActions.removeChild(existingContinueBtn);
                }
                
                // Only add the continue button if the session is completed
                if (session.status === 'completed') {
                    const continueBtn = document.createElement('button');
                    continueBtn.id = 'continue-session-btn';
                    continueBtn.className = 'action-button continue-session-btn';
                    continueBtn.innerHTML = '<i class="fas fa-play-circle"></i> Continue Session';
                    continueBtn.addEventListener('click', function() {
                        continueSession(userId, sessionId, session);
                    });
                    
                    reportActions.appendChild(continueBtn);
                }
            } else {
                // Load chat messages
                const messages = session.messages || [];
                
                if (messages.length === 0) {
                    addBotMessage("This session does not contain any messages.");
                    
                    // Show the chat container
                    pastSessionsContainer.style.display = 'none';
                    reportContainer.style.display = 'none';
                    chatContainer.style.display = 'block';
                    return;
                }
                
                // Clear current chat
                chatMessages.innerHTML = '';
                conversationHistory = [];
                
                // Convert the object to an array and sort by timestamp if needed
                const messageArray = Array.isArray(messages) ? 
                    messages : 
                    Object.values(messages).sort((a, b) => 
                        new Date(a.timestamp || 0) - new Date(b.timestamp || 0)
                    );
                
                // Add messages to chat
                for (const msg of messageArray) {
                    if (msg.role === 'user') {
                        addUserMessage(msg.content);
                    } else {
                        addBotMessage(msg.content);
                    }
                    
                    // Add to conversation history
                    conversationHistory.push({
                        role: msg.role,
                        content: msg.content
                    });
                }
                
                // Update current session
                currentSessionId = sessionId;
                
                // Get session status
                if (session.status) {
                    isChatEnded = session.status !== 'active';
                    
                    // Update UI based on session status
                    if (isChatEnded) {
                        endChatBtn.disabled = true;
                        checkReportBtn.style.display = 'flex';
                    } else {
                        endChatBtn.disabled = false;
                        checkReportBtn.style.display = 'none';
                    }
                }
                
                // Show the chat container
                pastSessionsContainer.style.display = 'none';
                reportContainer.style.display = 'none';
                chatContainer.style.display = 'block';
            }
        } catch (error) {
            console.error("Error viewing session:", error);
            addBotMessage("An error occurred while trying to load the session. Please try again.");
            
            // Show the chat container
            pastSessionsContainer.style.display = 'none';
            reportContainer.style.display = 'none';
            chatContainer.style.display = 'block';
        }
    }
    
    // Continue conversation from a past session
    async function continueSession(userId, sessionId, sessionData) {
        try {
            // Create a new active session that's a continuation of the completed one
            const db = getDatabase();
            const sessionsRef = dbRef(db, `psychology-chat/${userId}/sessions`);
            const newSessionRef = push(sessionsRef);
            
            // Get old messages from session data
            let oldMessages = [];
            if (sessionData.messages) {
                oldMessages = Array.isArray(sessionData.messages) ? 
                    sessionData.messages : 
                    Object.values(sessionData.messages);
            }
            
            // Create the continuation session
            await set(newSessionRef, {
                startTime: new Date().toISOString(),
                status: "active",
                continuesFrom: sessionId,
                messages: oldMessages.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.timestamp || new Date().toISOString()
                }))
            });
            
            console.log("Created continuation session:", newSessionRef.key);
            
            // Set the current session ID to the new session
            currentSessionId = newSessionRef.key;
            
            // Load conversation history
            conversationHistory = oldMessages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            
            // Clear current chat
            chatMessages.innerHTML = '';

            // Get any problems and emotional states from the report if available
            let problemSummary = '';
            let emotionalStateSummary = '';
            
            if (sessionData.report) {
                problemSummary = sessionData.report.problem || '';
                emotionalStateSummary = sessionData.report.emotion || '';
            }
            
            // Create a continuation info element
            const continuationInfoEl = document.createElement('div');
            continuationInfoEl.classList.add('continuation-info');
            continuationInfoEl.innerHTML = `
                <div class="continuation-banner">
                    <i class="fas fa-history"></i> Continuing from previous session
                </div>
            `;
            
            // Add the continuation info to the chat
            chatMessages.appendChild(continuationInfoEl);
            
            // Add a system message summarizing the previous session
            let summaryMessage = "Welcome back. We're continuing from our previous conversation";
            
            if (problemSummary) {
                summaryMessage += ` where we discussed: ${problemSummary}`;
            }
            
            if (emotionalStateSummary) {
                summaryMessage += `. Your emotional state was noted as: ${emotionalStateSummary}`;
            }
            
            summaryMessage += ". Let's pick up where we left off. How are you feeling today?";
            
            // Add the summary message
            addBotMessage(summaryMessage);
            
            // Update conversation history
            conversationHistory.push({
                role: "assistant",
                content: summaryMessage
            });
            
            // Save message to Firebase
            saveChatMessage(userId, currentSessionId, "assistant", summaryMessage);
            
            // Track psychology chat session
            try {
                incrementChatSession(userId).catch(error => {
                    console.error("Error tracking continued psychology chat session:", error);
                });
            } catch (error) {
                console.error("Error tracking continued psychology chat session:", error);
            }
            
            // Reset chat state
            isChatEnded = false;
            endChatBtn.disabled = false;
            checkReportBtn.style.display = 'none';
            
            // Show the chat container
            reportContainer.style.display = 'none';
            chatContainer.style.display = 'block';
            
            // Focus on the input field
            userInput.focus();
            
        } catch (error) {
            console.error("Error continuing session:", error);
            alert("Could not continue the session. Please try again later.");
        }
    }

    // Delete a session
    async function deleteSession(userId, sessionId) {
        try {
            if (confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
                const db = getDatabase();
                const sessionRef = dbRef(db, `psychology-chat/${userId}/sessions/${sessionId}`);
                
                // Remove the session
                await set(sessionRef, null);
                
                // Reload the sessions list
                await loadPastSessions(userId);
            }
        } catch (error) {
            console.error("Error deleting session:", error);
            alert("An error occurred while trying to delete the session. Please try again.");
        }
    }

    // Helper function to add user message
    function addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'user-message');
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text">
                    <p>${text}</p>
                </div>
                <div class="message-timestamp">
                    ${getCurrentTime()}
                </div>
            </div>
            <div class="avatar">
                <i class="fas fa-user"></i>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Helper function to add bot message
    function addBotMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'bot-message');
        
        messageDiv.innerHTML = `
            <div class="avatar">
                <i class="fas fa-user-md"></i>
            </div>
            <div class="message-content">
                <div class="message-text">
                    <p>${text}</p>
                </div>
                <div class="message-timestamp">
                    ${getCurrentTime()}
                </div>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Helper function to show typing indicator
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'bot-message', 'typing-message');

        typingDiv.innerHTML = `
            <div class="avatar">
                <i class="fas fa-user-md"></i>
            </div>
            <div class="message-content">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Helper function to remove typing indicator
    function removeTypingIndicator() {
        const typingMessage = chatMessages.querySelector('.typing-message');
        if (typingMessage) {
            chatMessages.removeChild(typingMessage);
        }
    }

    // Helper function to get current time
    function getCurrentTime() {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Download session records as a formatted text file
    function downloadSessionRecords(emotion, problem, summary, solution) {
        try {
            // Create a formatted text content
            let content = "PSYCHOLOGICAL ASSESSMENT REPORT\n";
            content += "==============================\n\n";
            content += `Date: ${new Date().toLocaleDateString()}\n`;
            content += `Time: ${new Date().toLocaleTimeString()}\n\n`;
            
            content += "EMOTIONAL ASSESSMENT\n";
            content += "--------------------\n";
            content += emotion + "\n\n";
            
            content += "PROBLEM IDENTIFICATION\n";
            content += "----------------------\n";
            content += problem + "\n\n";
            
            content += "SUMMARY OF INSIGHTS\n";
            content += "------------------\n";
            const summaryPoints = summary.split('\n')
                .filter(point => point.trim().length > 0)
                .map(point => point.replace(/^-\s*/, '').trim());
            
            summaryPoints.forEach((point, index) => {
                content += `${index + 1}. ${point}\n`;
            });
            content += "\n";
            
            content += "RECOMMENDATIONS & SOLUTIONS\n";
            content += "--------------------------\n";
            content += solution + "\n\n";
            
            content += "DISCLAIMER\n";
            content += "----------\n";
            content += "This assessment is generated by an AI system and should not replace professional medical or psychological advice. If you are experiencing severe distress or have thoughts of harming yourself or others, please contact emergency services or a mental health professional immediately.\n\n";
            
            content += "Powered by MindMuseAI\n";
            content += "© " + new Date().getFullYear();
            
            // Create a blob and download link
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `psychological-assessment-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
        } catch (error) {
            console.error("Error downloading records:", error);
            alert("There was an error downloading your records. Please try again.");
        }
    }

    // Download session records by ID
    async function downloadSessionById(userId, sessionId) {
        try {
            const db = getDatabase();
            const sessionRef = dbRef(db, `psychology-chat/${userId}/sessions/${sessionId}`);
            const snapshot = await get(sessionRef);
            
            if (snapshot.exists()) {
                const session = snapshot.val();
                
                if (session.report) {
                    const { emotion, problem, summary, solution } = session.report;
                    downloadSessionRecords(emotion, problem, summary, solution);
                } else {
                    alert("No report available for this session.");
                }
            } else {
                alert("Session not found.");
            }
        } catch (error) {
            console.error("Error downloading session:", error);
            alert("Error downloading session records. Please try again.");
        }
    }
}); 