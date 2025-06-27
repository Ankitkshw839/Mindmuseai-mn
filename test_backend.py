import requests

def test_backend():
    url = "http://localhost:5000/analyze"
    files = {'audio': open('test_audio.wav', 'rb')}
    
    print("Sending request to backend...")
    response = requests.post(url, files=files)
    
    if response.status_code == 200:
        print("✅ Backend is working!")
        print("Response keys:", response.json().keys())
        print("Detected emotion:", response.json().get('emotion'))
    else:
        print(f"❌ Backend error: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    test_backend()
