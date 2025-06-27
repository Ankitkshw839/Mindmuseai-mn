"""Simple CLI wrapper to run voice sentiment analysis and save results.

Usage:
    python analyze_audio.py --audio C:\path\to\file.wav [--out results.json] [--user-id USER123]

If --out is omitted, a JSON file with the same base name as the audio file will
be created in the current directory (e.g. file.wav -> file_analysis.json).

If --user-id is supplied and Firebase is initialised (i.e. serviceAccountKey.json
present), the results will also be pushed to
  users/<USER_ID>/voice_analyses/<auto_id>
under the Realtime Database at https://mindfulapp-ad0fa-default-rtdb.firebaseio.com/.
"""

import argparse
import json
import os
from datetime import datetime

from voice_analysis import VoiceAnalyzer


def main():
    parser = argparse.ArgumentParser(description="Run voice analysis and save results as JSON.")
    parser.add_argument("--audio", required=True, help="Path to the .wav file to analyse")
    parser.add_argument("--out", help="Output JSON path (defaults to <audio>_analysis.json)")
    parser.add_argument("--user-id", help="Firebase user id to store results under (optional)")

    args = parser.parse_args()

    audio_path = args.audio
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    out_path = args.out or os.path.splitext(audio_path)[0] + "_analysis.json"

    analyzer = VoiceAnalyzer()
    results = analyzer.analyze_audio(audio_path)
    if results is None:
        print("Analysis failed – see error messages above.")
        return

    # save locally
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"Analysis JSON saved to {out_path}")

    # optionally push to firebase
    if args.user_id:
        key = analyzer.save_to_firebase(args.user_id, results)
        if key:
            print(f"Results saved to Firebase under key: {key}")
        else:
            print("Failed to save results to Firebase (see logs above).")


if __name__ == "__main__":
    main()
