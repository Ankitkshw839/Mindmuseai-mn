const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Psychology chat page route
app.get('/psychology-chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'psychology-chat.html'));
});

// Secure API proxy endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, model, temperature, max_tokens, stream } = req.body;

        // 1) Concatenate only user-role messages into a single prompt
        const userPrompt = (messages || [])
            .filter(m => m.role === 'user' && m.content)
            .map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content))
            .join('\n');

        // 2) System instruction for emotion inference, 10-point summary, next-step advice
        const systemInstruction = `You are an empathetic mental-health assistant. After reading the user's complete prompt you will:\n` +
            `1. Identify and name their dominant emotional state.\n` +
            `2. Provide a concise chat report in EXACTLY 10 bullet points (each point max 15 words).\n` +
            `3. Offer clear, actionable next-step advice in plain English.\n` +
            `Return the answer in three labelled sections:\n` +
            `Emotion:\nReport:\nAdvice:`;

        // 3) Build new messages array for OpenRouter
        const processedMessages = [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userPrompt || '(no user prompt provided)' }
        ];

        // Get API key from environment variables (secure)
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        // Process messages to handle image content
        const processedMessagesWithImages = processedMessages.map(msg => {
            if (msg.content && Array.isArray(msg.content)) {
                return {
                    role: msg.role,
                    content: msg.content.map(item => {
                        if (item.type === 'image_url') {
                            return {
                                type: 'image_url',
                                image_url: {
                                    url: item.image_url.url
                                }
                            };
                        }
                        return item;
                    })
                };
            }
            return msg;
        });

        // List of fallback models to try if the primary model fails
        const fallbackModels = [
            model || process.env.DEFAULT_MODEL || 'meta-llama/llama-3.1-8b-instruct:free',
            'meta-llama/llama-3.1-8b-instruct:free',
            'microsoft/phi-3-mini-128k-instruct:free',
            'huggingfaceh4/zephyr-7b-beta:free'
        ];

        let response;
        let lastError;

        // Try each model until one works
        for (const tryModel of fallbackModels) {
            try {
                console.log(`Trying model: ${tryModel}`);

                response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': process.env.SITE_URL || 'https://mindmuseai.app',
                        'X-Title': process.env.SITE_NAME || 'MindMuseAI',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: tryModel,
                        messages: processedMessages,
                        temperature: temperature || 0.7,
                        max_tokens: max_tokens || 1000,
                        stream: stream || false
                    })
                });
                if (response.ok) {
                    console.log(`Successfully using model: ${tryModel}`);
                    break;
                } else {
                    const errorText = await response.text();
                    console.log(`Model ${tryModel} failed:`, errorText);
                    lastError = errorText;
                }
            } catch (error) {
                console.log(`Model ${tryModel} error:`, error.message);
                lastError = error.message;
            }
        }

        if (!response || !response.ok) {
            console.error('All models failed. Last error:', lastError);
            return res.status(503).json({
                error: 'All AI models are currently unavailable. Please try again later.',
                details: lastError
            });
        }

        // Handle streaming response
        if (stream) {
            res.setHeader('Content-Type', 'text/plain');
            res.setHeader('Transfer-Encoding', 'chunked');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                res.write(chunk);
            }

            res.end();
        } else {
            const data = await response.json();
            res.json(data);
        }

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 MindMuseAI server running on http://localhost:${PORT}`);
    console.log(`📱 Open your browser and navigate to http://localhost:${PORT}`);
});
module.exports = app;