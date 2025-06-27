"""
Create a test audio file for voice analysis testing.
"""
import numpy as np
import soundfile as sf
import os

def create_test_audio(filename, duration=5, sample_rate=16000):
    """Create a simple test audio file with a sine wave."""
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    # Generate a 440 Hz sine wave
    tone = np.sin(2 * np.pi * 440 * t) * 0.5
    
    # Add some amplitude modulation to simulate speech-like characteristics
    tone *= (0.5 + 0.5 * np.sin(2 * np.pi * 2 * t))  # 2 Hz modulation
    
    # Convert to 16-bit PCM format
    audio_int16 = (tone * 32767).astype(np.int16)
    
    # Save as WAV file
    sf.write(filename, audio_int16, sample_rate, format='WAV')
    print(f"Created test audio file: {os.path.abspath(filename)}")
    return os.path.abspath(filename)

if __name__ == "__main__":
    test_file = "test_audio.wav"
    create_test_audio(test_file, duration=10)  # 10 second test file
