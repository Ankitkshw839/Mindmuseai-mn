import os
import json
import numpy as np
import torch
import torchaudio
import librosa
import webrtcvad
import logging
from sklearn.cluster import KMeans
import firebase_admin
from firebase_admin import credentials, db
from firebase_admin.exceptions import FirebaseError
from datetime import datetime
import hashlib
import tempfile
import warnings
from scipy import signal

# Suppress specific warnings
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure offline mode for transformers
os.environ['TRANSFORMERS_OFFLINE'] = '1'
os.environ['HF_DATASETS_OFFLINE'] = '1'

# Import required transformers components
try:
    from transformers import (
        Wav2Vec2ForCTC,
        Wav2Vec2Processor,
        Wav2Vec2FeatureExtractor,
        Wav2Vec2Model,
        Wav2Vec2ForSequenceClassification,
        pipeline
    )
    TRANSFORMERS_AVAILABLE = True
except ImportError as e:
    logger.error(f"Failed to import transformers: {str(e)}")
    TRANSFORMERS_AVAILABLE = False

try:
    import noisereduce as nr
except ImportError:
    nr = None

# Initialize Firebase (optional)
try:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://mindfulapp-ad0fa-default-rtdb.firebaseio.com/'
    })
except FileNotFoundError:
    print("Firebase credential not found – skipping Firebase initialization")
except Exception as e:
    print(f"Firebase initialization error: {e}")

class VoiceAnalyzer:
    def __init__(self, use_safetensors=False):
        """Initialize the VoiceAnalyzer with optional safetensors support.
        
        Args:
            use_safetensors (bool): Whether to use safetensors format for model loading.
                                   Set to False if you encounter model loading issues.
        """
        self.vad = webrtcvad.Vad(3)  # Aggressiveness mode (0-3)
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        logger.info(f"Using device: {self.device}")
        
        # Emotion classification model (small but effective)
        self.model_name = "superb/wav2vec2-base-superb-er"
        
        # Initialize models as None first
        self.model = None
        self.embedding_model = None
        self.processor = None
        self.embedding_processor = None
        
        # Try to load models with local files first
        local_model_path = os.path.join(os.path.dirname(__file__), "models", "wav2vec2-base-superb-er")
        local_embedding_path = os.path.join(os.path.dirname(__file__), "models", "wav2vec2-large-960h")
        
        # Create models directory if it doesn't exist
        os.makedirs(os.path.dirname(local_model_path), exist_ok=True)
        
        # Load emotion classification model
        try:
            if os.path.exists(local_model_path):
                logger.info(f"Loading emotion model from local: {local_model_path}")
                self.processor = Wav2Vec2FeatureExtractor.from_pretrained(local_model_path)
                self.model = Wav2Vec2ForSequenceClassification.from_pretrained(
                    local_model_path,
                    local_files_only=True
                ).to(self.device)
                self.model.eval()
            else:
                logger.warning("Local emotion model not found. Some features will be disabled.")
        except Exception as e:
            logger.error(f"Failed to load local emotion model: {str(e)}")
            
        # Load embedding model
        try:
            if os.path.exists(local_embedding_path):
                logger.info(f"Loading embedding model from local: {local_embedding_path}")
                self.embedding_processor = Wav2Vec2FeatureExtractor.from_pretrained(local_embedding_path)
                self.embedding_model = Wav2Vec2Model.from_pretrained(
                    local_embedding_path,
                    local_files_only=True
                ).to(self.device)
                self.embedding_model.eval()
            else:
                logger.warning("Local embedding model not found. Some features will be limited.")
        except Exception as e:
            logger.error(f"Failed to load local embedding model: {str(e)}")
        
        # Analysis parameters
        self.window_s = 1.0  # analysis window length (seconds)
        self.hop_s = 0.05    # hop length (seconds) – 50 ms
        self.use_vad = False  # disable VAD per user request

        try:
            self.asr = pipeline("automatic-speech-recognition", model="facebook/wav2vec2-base-960h", device=0 if self.device == 'cuda' else -1)
        except Exception as e:
            print("ASR pipeline init failed:", e)
            self.asr = None

        self.emotion_labels = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']

        self.MIN_AUDIO_LENGTH = 2.0
        self.MIN_SPEECH_RATIO = 0.2
        self.MIN_ENERGY_THRESHOLD = 0.01
        self.MAX_BREATH_RATE = 60
        self.MIN_PITCH_HZ = 75
        self.MAX_PITCH_HZ = 400

        np.random.seed(0)
        torch.manual_seed(0)
        torch.backends.cudnn.deterministic = True
        torch.use_deterministic_algorithms(True, warn_only=True)

        self.cache_path = "voice_cache.json"
        if os.path.exists(self.cache_path):
            try:
                with open(self.cache_path, "r", encoding="utf-8") as f:
                    self.cache = json.load(f)
            except Exception:
                self.cache = {}
        else:
            self.cache = {}

    def load_audio(self, audio_path):
        try:
            y, sr = librosa.load(audio_path, sr=16000)
            return y, sr
        except Exception as e:
            print(f"Error loading audio file: {e}")
            return None, None
            
    def _analyze_basic_audio_features(self, y, sr):
        """Basic audio feature analysis when ML models are not available."""
        try:
            # Calculate basic audio features
            duration = len(y) / sr
            rms = np.sqrt(np.mean(y**2))  # Root mean square (energy)
            
            # Simple pitch estimation
            pitches, magnitudes = librosa.piptrack(y=y, sr=sr, fmin=75, fmax=400)
            pitch_values = pitches[pitches > 0]
            mean_pitch = float(np.mean(pitch_values)) if len(pitch_values) > 0 else 0
            
            # Zero-crossing rate (speech/music discrimination)
            zcr = float(librosa.feature.zero_crossing_rate(y)[0, 0])
            
            # Simple speech rate estimation (peaks in energy)
            energy = np.array([
                np.sum(y[i:i+1024]**2) 
                for i in range(0, len(y), 512)
            ])
            peaks, _ = signal.find_peaks(energy, distance=5)
            speech_rate = len(peaks) / (len(y) / sr) if len(y) > 0 else 0
            
            # Basic emotion estimation based on audio features
            emotion = "neutral"
            confidence = 0.7
            
            if mean_pitch > 200 and rms > 0.1:
                emotion = "excited"
            elif rms < 0.05:
                emotion = "calm"
                
            return {
                "emotion": emotion,
                "emotion_confidence": confidence,
                "duration": duration,
                "features": {
                    "pitch": mean_pitch,
                    "energy": float(rms),
                    "speech_rate": speech_rate,
                    "zero_crossing_rate": zcr
                },
                "emotion_probabilities": {
                    emotion: confidence,
                    "neutral": 1.0 - confidence
                },
                "analysis_method": "basic_audio_features"
            }
            
        except Exception as e:
            logger.error(f"Error in basic audio analysis: {str(e)}")
            return {
                "error": f"Basic analysis failed: {str(e)}",
                "emotion": "unknown",
                "emotion_confidence": 0.0,
                "analysis_method": "error"
            }

    def detect_silence(self, audio, sr, frame_duration=30, threshold=0.01):
        frame_length = int(sr * frame_duration / 1000)
        energy = librosa.feature.rms(y=audio, frame_length=frame_length, hop_length=frame_length)[0]
        silent_frames = energy < threshold
        return silent_frames, energy

    def analyze_pitch(self, audio, sr):
        pitches, magnitudes = librosa.piptrack(y=audio, sr=sr)
        pitch_values = pitches[pitches > 0]
        if len(pitch_values) == 0:
            return {'mean_pitch': 0, 'pitch_std': 0, 'pitch_range': 0}
        return {
            'mean_pitch': np.mean(pitch_values),
            'pitch_std': np.std(pitch_values),
            'pitch_range': np.max(pitch_values) - np.min(pitch_values)
        }

    def analyze_energy(self, audio, sr, frame_length=2048, hop_length=512):
        energy = np.array([
            sum(abs(audio[i:i+frame_length] ** 2))
            for i in range(0, len(audio), hop_length)
        ])
        if np.max(energy) > 0:
            energy = energy / np.max(energy)
        return {
            'mean_energy': float(np.mean(energy)),
            'energy_std': float(np.std(energy)),
            'max_energy': float(np.max(energy)),
            'min_energy': float(np.min(energy))
        }

    def analyze_breathing(self, audio, sr):
        nyquist = 0.5 * sr
        low = 100 / nyquist
        high = 1000 / nyquist
        b, a = signal.butter(4, [low, high], btype='band')
        filtered_audio = signal.filtfilt(b, a, audio)
        envelope = np.abs(signal.hilbert(filtered_audio))
        peaks, _ = signal.find_peaks(envelope, distance=sr//2)
        if len(peaks) < 2:
            return {'breath_rate': 0, 'breath_regularity': 0}
        intervals = np.diff(peaks) / sr
        return {
            'breath_rate': 60 / np.mean(intervals),
            'breath_regularity': np.std(intervals) / np.mean(intervals)
        }

    def detect_emotion(self, audio, sr):
        try:
            if sr != 16000:
                audio = librosa.resample(audio, orig_sr=sr, target_sr=16000)
                sr = 16000
            if np.max(np.abs(audio)) > 0:
                audio = audio / np.max(np.abs(audio))
            with torch.no_grad():
                inputs = self.processor([audio], sampling_rate=sr, return_tensors="pt", padding="longest", truncation=False)
                inputs = {k: v.to(self.device) for k, v in inputs.items()}
                logits = self.model(**inputs).logits.squeeze(0)
                probs = torch.softmax(logits, dim=-1).cpu().numpy()
            probabilities = {label: float(prob) for label, prob in zip(self.emotion_labels, probs)}
            top_idx = int(np.argmax(probs))
            return {
                'emotion': self.emotion_labels[top_idx],
                'confidence': float(probs[top_idx]),
                'probabilities': probabilities
            }
        except Exception as e:
            print(f"Error in emotion detection: {e}")
            return {'emotion': 'unknown', 'confidence': 0, 'probabilities': {}}

    def _chunk_audio(self, audio, sr, frame_ms=30):
        frame_len = int(sr * frame_ms / 1000)
        speech_frames = []
        chunks = []
        for i in range(0, len(audio), frame_len):
            frame = audio[i:i+frame_len]
            if len(frame) < frame_len:
                break
            is_speech = self.vad.is_speech((frame*32767).astype(np.int16).tobytes(), sr)
            if is_speech:
                speech_frames.append(frame)
            else:
                if speech_frames:
                    chunks.append(np.concatenate(speech_frames))
                    speech_frames = []
        if speech_frames:
            chunks.append(np.concatenate(speech_frames))
        return chunks

    def _select_significant_chunk(self, chunks, sr):
        if not chunks:
            return None
        if self.asr is None:
            return max(chunks, key=lambda x: len(x))
        max_words = 0
        best_chunk = chunks[0]
        for ch in chunks:
            try:
                text = self.asr(ch, sampling_rate=sr, chunk_length_s=None)["text"]
                word_count = len(text.strip().split())
                if word_count > max_words:
                    max_words = word_count
                    best_chunk = ch
            except:
                continue
        return best_chunk

    def analyze_audio(self, audio_path):
        try:
            y, sr = self.load_audio(audio_path)
            if y is None:
                return None
                
            # Basic audio features analysis
            if self.model is None or self.embedding_model is None:
                return self._analyze_basic_audio_features(y, sr)
                
            if nr is not None:
                y = nr.reduce_noise(y=y, sr=sr)
            # Normalise
            if np.max(np.abs(y)) > 0:
                y = y / np.max(np.abs(y))

            audio_hash = hashlib.sha1(y.tobytes()).hexdigest()
            if audio_hash in self.cache:
                return self.cache[audio_hash]

            # Silence ratio (but keep silence in processing)
            silent_frames, _ = self.detect_silence(y, sr)
            silence_ratio = float(np.mean(silent_frames))

            # Overall analyses (pitch, energy, breathing) on full audio
            pitch_analysis = self.analyze_pitch(y, sr)
            energy_analysis = self.analyze_energy(y, sr)
            breathing_analysis = self.analyze_breathing(y, sr)

            # Windowed analysis every 50 ms
            win_len = int(self.window_s * sr)
            hop_len = int(self.hop_s * sr)

            window_emotions, confidences, pressures, embeddings = [], [], [], []

            for start in range(0, len(y) - win_len + 1, hop_len):
                window = y[start:start + win_len]
                if len(window) < win_len * 0.5:
                    continue  # skip too-short tail window

                # Emotion classification
                emo_res = self.detect_emotion(window, sr)
                window_emotions.append(emo_res['emotion'])
                confidences.append(emo_res['confidence'])

                # Vocal pressure
                rms = np.sqrt(np.mean(window ** 2))
                words = 1
                if self.asr:
                    try:
                        text = self.asr(window, sampling_rate=sr)["text"]
                        words = max(1, len(text.split()))
                    except:
                        pass
                pressures.append(float(rms) / words)

                # Embedding extraction (mean pooled last hidden state)
                with torch.no_grad():
                    inputs = self.embedding_processor(window, sampling_rate=sr, return_tensors="pt", padding=True).to(self.device)
                    hidden = self.embedding_model(**inputs).last_hidden_state.squeeze(0)  # [time, feat]
                    emb = hidden.mean(dim=0).cpu().numpy()
                    embeddings.append(emb)

            # Aggregate emotion
            emotion_scores = defaultdict(float)
            for emo, conf in zip(window_emotions, confidences):
                emotion_scores[emo] += conf
            final_emotion = max(emotion_scores.items(), key=lambda x: x[1])[0] if emotion_scores else 'unknown'
            median_conf = float(np.median(confidences)) if confidences else 0.0

            # Embedding clustering
            cluster_labels = []
            if embeddings:
                k = min(3, len(embeddings))
                kmeans = KMeans(n_clusters=k, random_state=0)
                cluster_labels = kmeans.fit_predict(embeddings).tolist()

            duration = len(y) / sr

            results = {
                "emotion": {"label": final_emotion, "confidence": median_conf},
                "features": {
                    'pitch_mean': float(pitch_analysis["mean_pitch"]),
                    "pitch_std": float(pitch_analysis["pitch_std"]),
                    "energy_mean": float(energy_analysis["mean_energy"]),
                    "speech_silence_ratio": float(silence_ratio),
                    "breath_rate": float(breathing_analysis.get("breath_rate", 0)),
                    "vocal_pressure_median": float(np.median(pressures)) if pressures else 0.0
                },
                "timeline": [
                    {
                        "start": float(i * self.hop_s),
                        "emotion": e,
                        "confidence": c,
                        "vocal_pressure": p,
                        "cluster": cluster_labels[idx] if cluster_labels else None
                    }
                    for idx, (i, e, c, p) in enumerate(zip(range(len(window_emotions)), window_emotions, confidences, pressures))
                ],
                "metadata": {
                    "duration": duration,
                    "hash": audio_hash,
                    "window_s": self.window_s,
                    "hop_s": self.hop_s,
                    "embedding_model": self.embedding_model_name
                }
            }

            # Cache and persist
            self.cache[audio_hash] = results
            with open(self.cache_path, "w", encoding="utf-8") as f:
                json.dump(self.cache, f)
            return results
        except Exception as e:
            print(f"Error in analyze_audio: {e}")
            return None

    def save_to_firebase(self, user_id, analysis_results):
        try:
            ref = db.reference(f'users/{user_id}/voice_analyses')
            new_analysis_ref = ref.push()
            new_analysis_ref.set(analysis_results)
            return new_analysis_ref.key
        except Exception as e:
            print(f"Error saving to Firebase: {e}")
            return None

def main():
    analyzer = VoiceAnalyzer()
    audio_path = "example_audio.wav"
    if os.path.exists(audio_path):
        results = analyzer.analyze_audio(audio_path)
        if results:
            print("Analysis Results:")
            print(json.dumps(results, indent=2))
            # Optionally save
            # user_id = "example_user"
            # analyzer.save_to_firebase(user_id, results)
    else:
        print(f"Audio file not found: {audio_path}")

def test_voice_analysis(audio_path):
    """Test the voice analysis with a sample audio file."""
    if not os.path.exists(audio_path):
        print(f"Error: Audio file not found: {audio_path}")
        return
        
    print(f"Starting voice analysis on: {audio_path}")
    
    try:
        # Try with safetensors first, fallback to regular if it fails
        try:
            analyzer = VoiceAnalyzer(use_safetensors=True)
            print("Loaded model with safetensors")
        except Exception as e:
            print(f"Could not load with safetensors, falling back to regular loading: {e}")
            analyzer = VoiceAnalyzer(use_safetensors=False)
            
        # Run analysis
        print("Analyzing audio...")
        result = analyzer.analyze_audio(audio_path)
        
        if result:
            print("\n=== Analysis Results ===")
            print(f"Duration: {result.get('duration', 0):.2f} seconds")
            print(f"Dominant Emotion: {result.get('emotion', 'N/A')} "
                  f"(Confidence: {result.get('emotion_confidence', 0)*100:.1f}%)")
            
            # Print feature analysis
            features = result.get('features', {})
            if features:
                print("\n=== Feature Analysis ===")
                for key, value in features.items():
                    if isinstance(value, dict):
                        print(f"{key}:")
                        for k, v in value.items():
                            print(f"  {k}: {v}")
                    else:
                        print(f"{key}: {value}")
            
            # Print emotion probabilities
            probs = result.get('emotion_probabilities', {})
            if probs:
                print("\n=== Emotion Probabilities ===")
                for emotion, prob in sorted(probs.items(), key=lambda x: x[1], reverse=True):
                    print(f"{emotion}: {prob*100:.1f}%")
        else:
            print("Analysis failed - no results returned")
            
    except Exception as e:
        print(f"Error during analysis: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Run voice emotion analysis on an audio file')
    parser.add_argument('audio_file', type=str, nargs='?', default='test_audio.wav',
                       help='Path to the audio file to analyze (WAV, MP3, etc.)')
    args = parser.parse_args()
    
    # Run the test with the specified or default audio file
    test_voice_analysis(args.audio_file)
