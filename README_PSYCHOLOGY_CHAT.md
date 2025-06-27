# MindMuseAI Psychology Chat

This feature provides users with an interactive psychological assessment through a chat interface. The AI-powered chat analyzes the conversation and generates a personalized report about the user's mental state.

## Features

- **Interactive Chat**: Engage in a conversation with an AI therapist that asks psychology-focused questions
- **End Chat Button**: When you're ready to conclude the session, click "End Chat" to finalize the conversation
- **Psychological Report**: After ending the chat, click "Check Your Report" to receive a detailed analysis including:
  - Emotional state assessment
  - 10-point summary of key insights about your mindset
  - Personalized advice and precautions

## How to Use

1. Navigate to the Psychology Chat page from the main navigation menu
2. Begin chatting with the AI therapist - be honest and open for the best results
3. When you're ready to end the session, click the "End Chat" button
4. Click "Check Your Report" to view your personalized psychological assessment
5. Review your report which includes your emotional state, conversation summary, and personalized advice
6. Use the "Back to Chat" button to return to the conversation if needed

## Technical Implementation

The Psychology Chat uses the OpenRouter API with the minimax/minimax-m1:extended model to provide intelligent, psychology-focused responses. The conversation history is analyzed to generate a comprehensive report about the user's mental state.

### API Integration

The chat interface makes direct calls to the OpenRouter API with the following components:

- System prompt that instructs the AI to act as a psychology expert
- Conversation history to maintain context
- Report generation using a specialized prompt that analyzes the entire conversation

## Privacy & Security

All conversations remain in your browser and are not stored on our servers. The API calls are made directly from your browser to the OpenRouter API service.

## Feedback

We're continuously improving this feature. If you have suggestions or encounter any issues, please let us know through the contact form on our website.

---

*Note: This feature is intended for educational and self-reflection purposes only. It is not a substitute for professional mental health treatment or diagnosis. If you're experiencing serious mental health issues, please consult with a qualified healthcare professional.* 