// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD6vJ9ZJQJQJQJQJQJQJQJQJQJQJQJQJQ",
    authDomain: "mindfulapp-ad0fa.firebaseapp.com",
    databaseURL: "https://mindfulapp-ad0fa-default-rtdb.firebaseio.com/",
    projectId: "mindfulapp-ad0fa",
    storageBucket: "mindfulapp-ad0fa.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();
// Local backend API endpoint for analysis
const API_URL = "http://localhost:5000/analyze";

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('audioFile');
const browseBtn = document.getElementById('browseBtn');
const recordBtn = document.getElementById('recordBtn');
const recordingIndicator = document.getElementById('recordingIndicator');
const recordingTime = document.getElementById('recordingTime');
const analyzeBtn = document.getElementById('analyzeBtn');
const changeFileBtn = document.getElementById('changeFile');
const uploadContent = document.getElementById('uploadContent');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const loading = document.getElementById('loading');
const resultSection = document.getElementById('resultSection');
const audioPlayer = document.getElementById('audioPlayer');

// Audio recording variables
let mediaRecorder;
let audioChunks = [];
let recordingStartTime;
let recordingTimer;
let isRecording = false;

// Global variables
let selectedFile = null;

// Event Listeners
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    
    if (e.dataTransfer.files.length) {
        handleFileSelect(e.dataTransfer.files[0]);
    }
});

browseBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleFileSelect(e.target.files[0]);
    }
});

analyzeBtn.addEventListener('click', analyzeAudio);
changeFileBtn.addEventListener('click', resetFileSelection);

// Functions
function handleFileSelect(file) {
    // Check if file is an audio file
    if (!file.type.match('audio.*')) {
        alert('Please select an audio file (WAV, MP3, OGG)');
        return;
    }

    selectedFile = file;
    
    // Update UI
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    uploadContent.classList.add('d-none');
    fileInfo.classList.remove('d-none');
    
    // Set up audio player
    const audioURL = URL.createObjectURL(file);
    audioPlayer.src = audioURL;
    
    // Hide results if changing file
    resultSection.style.display = 'none';
}

function resetFileSelection() {
    selectedFile = null;
    fileInput.value = '';
    uploadContent.classList.remove('d-none');
    fileInfo.classList.add('d-none');
    audioPlayer.src = '';
    resultSection.style.display = 'none';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function analyzeAudio() {
    if (!selectedFile) return;

    loading.classList.remove('d-none');
    fileInfo.classList.add('d-none');

    const formData = new FormData();
    formData.append('audio', selectedFile);

    let analysisResults;
    try {
        // Attempt real backend call
        const resp = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });
        if (!resp.ok) throw new Error(`Backend error: ${resp.status}`);
        analysisResults = await resp.json();
    } catch (err) {
        console.warn('Backend unavailable, falling back to demo analysis:', err);
        analysisResults = await simulateAnalysis(selectedFile);
    }

    try {
        displayAnalysisResults(analysisResults);
        await saveAnalysisToFirebase(analysisResults);
    } catch (err) {
        console.error('Error displaying/saving results:', err);
        alert('An error occurred while processing the analysis results.');
    } finally {
        loading.classList.add('d-none');
        resultSection.style.display = 'block';
    }
}

function displayAnalysisResults(results) {
    // Update emotion with confidence
    const emotionText = document.getElementById('emotionText');
    const emotionConfidence = document.getElementById('emotionConfidence');
    const emotionResult = document.getElementById('emotionResult');
    
    // Format emotion text (capitalize first letter)
    const emotion = results.emotion.charAt(0).toUpperCase() + results.emotion.slice(1);
    const confidence = Math.round((results.emotion_confidence || results.confidence || 0) * 100);
    
    emotionText.textContent = emotion;
    emotionConfidence.textContent = `${confidence}% confidence`;
    emotionResult.style.backgroundColor = getEmotionColor(results.emotion);
    
    // Update confidence meter
    updateConfidenceMeter(confidence);
    
    // Update progress bars with quality indicators
    updateProgressBar('speechRate', results.features.speechRate, results.analysis?.confidence?.speech);
    updateProgressBar('pitchStability', results.features.pitchStability, results.analysis?.confidence?.pitch);
    updateProgressBar('pause', results.features.pauseDuration, results.analysis?.confidence?.pause);
    updateProgressBar('energy', results.features.energy, results.analysis?.confidence?.energy);
    updateProgressBar('breathing', results.features.breathingPattern, results.analysis?.confidence?.breathing);
    
    // Display emotion probabilities if available
    const emotionProbabilities = results.emotion_probabilities || results.probabilities || {};
    const emotionChart = document.getElementById('emotionProbabilitiesChart');
    if (emotionChart) {
        renderEmotionChart(emotionProbabilities);
    }
    
    // Update detailed analysis with quality indicators
    const details = document.getElementById('analysisDetails');
    details.innerHTML = `
        <div class="analysis-section">
            <h5><i class="bi bi-graph-up"></i> Speech Analysis</h5>
            <div class="analysis-card">
                <div class="analysis-icon">
                    <i class="bi bi-speedometer2"></i>
                </div>
                <div class="analysis-content">
                    <h6>Speech Rate</h6>
                    <p>${getSpeechRateAnalysis(results.features.speechRate)}</p>
                    <div class="confidence-badge">
                        <span class="badge bg-${getConfidenceBadgeClass(results.analysis?.confidence?.speech || 0.7)}">
                            ${Math.round((results.analysis?.confidence?.speech || 0.7) * 100)}% confidence
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="analysis-card">
                <div class="analysis-icon">
                    <i class="bi bi-soundwave"></i>
                </div>
                <div class="analysis-content">
                    <h6>Pitch Stability</h6>
                    <p>${getPitchAnalysis(results.features.pitchStability)}</p>
                    <div class="confidence-badge">
                        <span class="badge bg-${getConfidenceBadgeClass(results.analysis?.confidence?.pitch || 0.7)}">
                            ${Math.round((results.analysis?.confidence?.pitch || 0.7) * 100)}% confidence
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="analysis-card">
                <div class="analysis-icon">
                    <i class="bi bi-pause-circle"></i>
                </div>
                <div class="analysis-content">
                    <h6>Pause Pattern</h6>
                    <p>${getPauseAnalysis(results.features.pauseDuration)}</p>
                    <div class="confidence-badge">
                        <span class="badge bg-${getConfidenceBadgeClass(results.analysis?.confidence?.pause || 0.7)}">
                            ${Math.round((results.analysis?.confidence?.pause || 0.7) * 100)}% confidence
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="analysis-card">
                <div class="analysis-icon">
                    <i class="bi"></i>
                </div>
                <div class="analysis-content">
                    <h6>Voice Energy</h6>
                    <p>${getEnergyAnalysis(results.features.energy)}</p>
                    <div class="confidence-badge">
                        <span class="badge bg-${getConfidenceBadgeClass(results.analysis?.confidence?.energy || 0.7)}">
                            ${Math.round((results.analysis?.confidence?.energy || 0.7) * 100)}% confidence
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="analysis-card">
                <div class="analysis-icon">
                    <i class="bi"></i>
                </div>
                <div class="analysis-content">
                    <h6>Breathing Pattern</h6>
                    <p>${getBreathingAnalysis(results.features.breathingPattern)}</p>
                    <div class="confidence-badge">
                        <span class="badge bg-${getConfidenceBadgeClass(results.analysis?.confidence?.breathing || 0.7)}">
                            ${Math.round((results.analysis?.confidence?.breathing || 0.7) * 100)}% confidence
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Display audio quality score if available
    if (results.analysis?.quality_score !== undefined) {
        const qualityScore = Math.round(results.analysis.quality_score * 100);
        const qualitySection = document.createElement('div');
        qualitySection.className = 'alert alert-info mt-3';
        qualitySection.innerHTML = `
            <h6><i class="bi bi-graph-up"></i> Analysis Quality</h6>
            <div class="d-flex align-items-center mt-2">
                <div class="progress flex-grow-1 me-3" style="height: 10px;">
                    <div class="progress-bar bg-success" role="progressbar" 
                         style="width: ${qualityScore}%" 
                         aria-valuenow="${qualityScore}" 
                         aria-valuemin="0" 
                         aria-valuemax="100"></div>
                </div>
                <span class="fw-bold">${qualityScore}%</span>
            </div>
            ${results.analysis.quality_issues && results.analysis.quality_issues.length > 0 ? 
                `<div class="mt-2">
                    <small class="text-muted">
                        <i class="bi bi-info-circle"></i> 
                        ${results.analysis.quality_issues.join('. ')}.
                    </small>
                </div>` : ''}
        `;
        details.appendChild(qualitySection);
    }
}

function updateProgressBar(feature, value, confidence = 0.8) {
    const element = document.getElementById(`${feature}Bar`);
    const valueElement = document.getElementById(`${feature}Value`);
    const container = element?.closest('.progress');
    
    if (element && valueElement && container) {
        // For some features, we might want to invert the scale (e.g., higher pause duration is worse)
        const displayValue = feature === 'pause' || feature === 'breathing' 
            ? 100 - (value * 100) 
            : value * 100;
            
        element.style.width = `${displayValue}%`;
        valueElement.textContent = `${Math.round(displayValue)}%`;
        
        // Update progress bar color based on confidence
        const confidenceClass = getConfidenceBadgeClass(confidence);
        element.className = `progress-bar bg-${confidenceClass}`;
        
        // Add tooltip for confidence
        element.setAttribute('data-bs-toggle', 'tooltip');
        element.setAttribute('title', `Confidence: ${Math.round(confidence * 100)}%`);
        
        // Initialize tooltips if Bootstrap is available
        if (typeof bootstrap !== 'undefined') {
            new bootstrap.Tooltip(element);
        }
    }
}

function getEmotionColor(emotion) {
    const colors = {
        'happy': '#d4edda',
        'sad': '#cce5ff',
        'angry': '#f8d7da',
        'fearful': '#e2e3e5',
        'neutral': '#f8f9fa',
        'surprised': '#fff3cd',
        'disgusted': '#e2e3e5'
    };
    return colors[emotion.toLowerCase()] || '#f8f9fa';
}

// Helper functions for analysis interpretation
function getSpeechRateAnalysis(value) {
    if (value > 0.7) return "Your speech rate is fast, indicating excitement or nervousness.";
    if (value < 0.3) return "Your speech rate is slow, which might indicate thoughtfulness or sadness.";
    return "Your speech rate is within a normal range.";
}

function getPitchAnalysis(value) {
    if (value > 0.7) return "Your pitch is very stable, which is common in neutral or confident speech.";
    if (value < 0.3) return "Your pitch shows significant variation, which can indicate strong emotions.";
    return "Your pitch variation is within a normal range.";
}

function getPauseAnalysis(value) {
    if (value > 0.7) return "You have frequent or long pauses, which might indicate uncertainty or deep thought.";
    if (value < 0.3) return "Your speech flows smoothly with minimal pauses.";
    return "Your pause patterns are within a normal range.";
}

function getEnergyAnalysis(value) {
    if (value > 0.7) return "Your voice has high energy, which can indicate excitement or stress.";
    if (value < 0.3) return "Your voice has low energy, which might indicate tiredness or sadness.";
    return "Your voice energy is balanced.";
}

function getBreathingAnalysis(value) {
    if (value > 0.7) return "Your breathing pattern suggests calm and controlled speech.";
    if (value < 0.3) return "Your breathing pattern suggests some tension or quick breaths.";
    return "Your breathing pattern is normal.";
}

// This function will now only be called if the backend is unreachable
async function simulateAnalysis(file) {
    return new Promise((_, reject) => {
        reject(new Error('Backend service is required for voice analysis. Please ensure the backend server is running and accessible.'));
    });
}

// Save analysis to Firebase
async function saveAnalysisToFirebase(analysis) {
    try {
        const userId = 'anonymous'; // In a real app, you would get this from authentication
        const analysisRef = database.ref(`users/${userId}/voiceAnalyses`).push();
        await analysisRef.set({
            ...analysis,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        console.log('Analysis saved to Firebase');
    } catch (error) {
        console.error('Error saving to Firebase:', error);
        // Don't show error to user, as the analysis was still successful
    }
}

// Helper function to update confidence meter
function updateConfidenceMeter(confidence) {
    const meter = document.getElementById('confidenceMeter');
    if (meter) {
        meter.style.width = `${confidence}%`;
        meter.setAttribute('aria-valuenow', confidence);
        
        // Update color based on confidence level
        if (confidence >= 75) {
            meter.className = 'progress-bar bg-success';
        } else if (confidence >= 50) {
            meter.className = 'progress-bar bg-warning';
        } else {
            meter.className = 'progress-bar bg-danger';
        }
    }
}

// Helper function to get confidence badge class
function getConfidenceBadgeClass(confidence) {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.5) return 'warning';
    return 'danger';
}

// Function to render emotion probabilities chart
function renderEmotionChart(probabilities) {
    const ctx = document.getElementById('emotionProbabilitiesChart');
    if (!ctx) return;
    
    const labels = Object.keys(probabilities);
    const data = Object.values(probabilities).map(p => (p * 100).toFixed(1));
    const backgroundColors = labels.map(emotion => getEmotionColor(emotion));
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(c => c.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Probability (%)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y}%`;
                        }
                    }
                }
            }
        }
    });
}

// Toggle recording state
function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

// Start audio recording
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Create a file object from the blob
            const recordedFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
            
            // Handle the recorded file like an uploaded file
            handleFileSelect(recordedFile);
            
            // Stop all tracks in the stream
            stream.getTracks().forEach(track => track.stop());
            
            // Reset recording state
            clearInterval(recordingTimer);
            recordingIndicator.classList.add('d-none');
            recordBtn.innerHTML = '<i class="bi bi-mic me-1"></i> Start Recording';
            recordBtn.classList.remove('recording');
            isRecording = false;
        };
        
        // Start recording
        mediaRecorder.start();
        isRecording = true;
        recordBtn.innerHTML = '<i class="bi bi-stop-fill me-1"></i> Stop Recording';
        recordBtn.classList.add('recording');
        recordingIndicator.classList.remove('d-none');
        
        // Start recording timer
        recordingStartTime = Date.now();
        updateRecordingTimer();
        recordingTimer = setInterval(updateRecordingTimer, 1000);
        
    } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Could not access microphone. Please ensure you have granted microphone permissions and try again.');
        isRecording = false;
    }
}

// Stop audio recording
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
}

// Update recording timer
function updateRecordingTimer() {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    recordingTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Handle file selection from recording
function handleRecordedAudio(audioBlob) {
    const audioUrl = URL.createObjectURL(audioBlob);
    audioPlayer.src = audioUrl;
    
    // Create a file object from the blob
    const recordedFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
    
    // Handle the recorded file like an uploaded file
    handleFileSelect(recordedFile);
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    console.log('Voice Analysis page loaded');
    
    // Add event listener for record button
    if (recordBtn) {
        recordBtn.addEventListener('click', toggleRecording);
    }
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});
