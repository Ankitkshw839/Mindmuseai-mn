"""Simple Flask API exposing the VoiceAnalyzer pipeline.

Run:
    pip install flask flask-cors
    python voice_api.py

Endpoints:
    POST /analyze
        form-data:  audio  (file, required)
                    user_id (string, optional) – if provided and Firebase is configured, results are saved.

Returns JSON with the analysis results produced by VoiceAnalyzer.analyze_audio.
"""

import os
import tempfile
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Initialize analyzer when the app starts
analyzer = None
try:
    from voice_analysis import VoiceAnalyzer
    analyzer = VoiceAnalyzer()
    logger.info("VoiceAnalyzer initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize VoiceAnalyzer: {str(e)}")
    analyzer = None

@app.route("/analyze", methods=["POST"])
def analyze():
    if not analyzer:
        return jsonify({"error": "Backend analyzer not initialized"}), 500
        
    if "audio" not in request.files:
        return jsonify({"error": "Missing audio file"}), 400

    audio_file = request.files["audio"]
    if not audio_file or audio_file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    # Validate file type
    if not audio_file.filename.lower().endswith(('.wav', '.mp3', '.ogg', '.flac')):
        return jsonify({"error": "Invalid file type. Please upload a WAV, MP3, or OGG file."}), 400

    # Save to temp file
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio_file.filename)[1]) as tmp:
            audio_path = tmp.name
            audio_file.save(audio_path)
            logger.info(f"Saved audio to temporary file: {audio_path}")

        # Analyze the audio
        results = analyzer.analyze_audio(audio_path)
        if results is None:
            return jsonify({"error": "Analysis failed - invalid audio file or processing error"}), 400

        # Optional Firebase save
        user_id = request.form.get("user_id")
        if user_id:
            try:
                analyzer.save_to_firebase(user_id, results)
                logger.info(f"Saved analysis to Firebase for user {user_id}")
            except Exception as e:
                logger.error(f"Failed to save to Firebase: {str(e)}")
                # Continue even if Firebase save fails

        return jsonify(results)
    
    except Exception as e:
        logger.error(f"Error processing audio: {str(e)}")
        return jsonify({"error": f"Error processing audio: {str(e)}"}), 500
        
    finally:
        # Clean up temp file
        try:
            if 'audio_path' in locals() and os.path.exists(audio_path):
                os.remove(audio_path)
                logger.info(f"Removed temporary file: {audio_path}")
        except Exception as e:
            logger.error(f"Error removing temp file: {str(e)}")

@app.route("/health")
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy" if analyzer else "error",
        "message": "Voice analysis service" + ("" if analyzer else " (analyzer not initialized)")
    })

if __name__ == "__main__":
    if analyzer:
        logger.info("Starting voice analysis API on http://0.0.0.0:5000")
        app.run(host="0.0.0.0", port=5000, threaded=True, debug=True)
    else:
        logger.error("Failed to start API: VoiceAnalyzer not initialized")
