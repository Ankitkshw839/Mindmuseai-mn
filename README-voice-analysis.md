# Voice Sentiment Analysis System

A comprehensive voice analysis tool that detects emotions and speech characteristics from audio recordings.

## Features

- **Emotion Detection**: Identifies emotions like happy, sad, angry, fearful, neutral, surprised, and disgusted
- **Speech Analysis**: Measures speech rate, pitch stability, and pause patterns
- **Breathing Analysis**: Detects breathing patterns and rate
- **Energy Analysis**: Analyzes voice energy and intensity
- **Real-time Visualization**: Interactive dashboard to view analysis results
- **Firebase Integration**: Saves analysis history to Firebase Realtime Database

## Installation

1. Clone the repository
2. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Set up Firebase:
   - Create a Firebase project at https://console.firebase.google.com/
   - Download your service account key as `serviceAccountKey.json`
   - Update the Firebase configuration in `voice-analysis.js`

## Usage

1. Run the web application:
   ```
   python -m http.server 8000
   ```
2. Open `http://localhost:8000/voice-analysis.html` in your browser
3. Upload an audio file (WAV, MP3, OGG) or record directly from your microphone
4. View the analysis results and emotion detection

## Technical Details

### Backend Analysis

The `voice_analysis.py` script uses the following libraries:
- **Librosa**: For audio feature extraction and analysis
- **WebRTC VAD**: For voice activity detection
- **Wav2Vec2**: For emotion classification
- **Firebase Admin SDK**: For data storage and retrieval

### Frontend

The web interface is built with:
- HTML5, CSS3, and JavaScript
- Bootstrap 5 for responsive design
- Chart.js for data visualization
- Firebase Web SDK for real-time updates

## API Endpoints

### Analyze Audio

```
POST /api/analyze
Content-Type: multipart/form-data

file: [audio file]
```

**Response:**
```json
{
  "emotion": {
    "label": "happy",
    "confidence": 0.87,
    "probabilities": {
      "happy": 0.87,
      "sad": 0.03,
      "angry": 0.02,
      "fearful": 0.01,
      "neutral": 0.05,
      "surprised": 0.01,
      "disgusted": 0.01
    }
  },
  "features": {
    "speech_rate": 0.65,
    "pitch_stability": 0.78,
    "pitch_mean": 220.5,
    "pitch_std": 12.3,
    "energy_mean": 0.45,
    "energy_std": 0.12,
    "pause_duration": 0.25,
    "breath_rate": 12.5,
    "breath_regularity": 0.15
  },
  "analysis": {
    "speech_characteristics": {
      "speech_rate": "normal",
      "pitch_stability": "stable",
      "energy_level": "normal",
      "pause_pattern": "normal",
      "breathing_pattern": "normal"
    }
  }
}
```

## Customization

### Adjusting Analysis Parameters

You can modify the analysis parameters in `voice_analysis.py`:
- `frame_duration`: Duration of each analysis frame in milliseconds
- `silence_threshold`: Energy threshold for silence detection
- `pitch_range`: Expected pitch range for the speaker

### Adding New Features

1. **New Audio Features**: Add new analysis methods to the `VoiceAnalyzer` class
2. **Custom Models**: Replace the emotion detection model with your own trained model
3. **Additional Visualizations**: Extend the dashboard with new charts and metrics

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Librosa](https://librosa.org/)
- [Hugging Face Transformers](https://huggingface.co/transformers/)
- [WebRTC VAD](https://github.com/wiseman/py-webrtcvad)
- [Firebase](https://firebase.google.com/)
- [Chart.js](https://www.chartjs.org/)
