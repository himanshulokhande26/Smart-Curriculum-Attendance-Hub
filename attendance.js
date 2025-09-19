// --- Core settings for the Geofencing ---
const CLASSROOM_LOCATION = { latitude: 23.2599, longitude: 77.4126 }; // Bhopal coordinates for demo
const ACCEPTABLE_RADIUS_METERS = 50; // Students must be within 50 meters

// --- TEACHER'S SIDE ---

function initializeTeacherView() {
    // Generate a unique token for the session
    const sessionToken = `ATTENDANCE_TOKEN_${Date.now()}`;
    
    // Generate the QR code
    new QRCode(document.getElementById("qrcode"), {
        text: sessionToken,
        width: 256,
        height: 256,
        colorDark : "#e5e7eb",
        colorLight : "#242132",
        correctLevel : QRCode.CorrectLevel.H
    });

    // Start a countdown timer - Increased to 5 minutes (300 seconds)
    let timeLeft = 300;
    const timerElement = document.getElementById('timer');
    const statusText = document.getElementById('status-text');

    const countdown = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        let seconds = timeLeft % 60;
        seconds = seconds < 10 ? '0' + seconds : seconds; // Add leading zero if needed

        timerElement.textContent = `${minutes}:${seconds}`;
        
        if (timeLeft <= 0) {
            clearInterval(countdown);
            statusText.textContent = "Code has expired.";
            document.getElementById("qrcode").style.display = 'none';
        }
        timeLeft--;
    }, 1000);
}

// --- STUDENT'S SIDE --- (No changes to this part)

function initializeStudentScanner() {
    const video = document.getElementById('scanner-video');
    const resultElement = document.getElementById('scan-result');
    let scanning = false;

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(function(stream) {
            video.srcObject = stream;
            video.setAttribute("playsinline", true);
            video.play();
            requestAnimationFrame(tick);
        })
        .catch(function(err) {
            console.error("Camera access error:", err);
            resultElement.textContent = "Error: Could not access camera.";
            resultElement.style.color = 'var(--danger-color)';
        });

    function tick() {
        if (video.readyState === video.HAVE_ENOUGH_DATA && !scanning) {
            const canvasElement = document.createElement('canvas');
            const canvas = canvasElement.getContext('2d');
            canvasElement.height = video.videoHeight;
            canvasElement.width = video.videoWidth;
            canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
            const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });

            if (code) {
                scanning = true;
                video.srcObject.getTracks().forEach(track => track.stop());
                handleScannedCode(code.data);
            }
        }
        if (!scanning) {
            requestAnimationFrame(tick);
        }
    }
}

function handleScannedCode(qrData) {
    const resultElement = document.getElementById('scan-result');
    resultElement.textContent = 'QR Code detected. Verifying your location...';

    if (!navigator.geolocation) {
        resultElement.textContent = 'Geolocation is not supported by your device.';
        resultElement.style.color = 'var(--danger-color)';
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const studentLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
            verifyAttendance(qrData, studentLocation);
        },
        () => {
            resultElement.textContent = 'Unable to retrieve your location. Please enable location services.';
            resultElement.style.color = 'var(--danger-color)';
        }
    );
}

function verifyAttendance(qrData, studentLocation) {
    const resultElement = document.getElementById('scan-result');
    
    if (!qrData.startsWith('ATTENDANCE_TOKEN')) {
        resultElement.textContent = 'Invalid QR Code. Please scan the correct one.';
        resultElement.style.color = 'var(--danger-color)';
        return;
    }

    const distance = getDistanceFromLatLonInM(
        CLASSROOM_LOCATION.latitude, CLASSROOM_LOCATION.longitude,
        studentLocation.latitude, studentLocation.longitude
    );

    if (distance <= ACCEPTABLE_RADIUS_METERS) {
        resultElement.textContent = `Success! Attendance marked. You are ${distance.toFixed(0)} meters away.`;
        resultElement.style.color = 'var(--success-color)';
    } else {
        resultElement.textContent = `Failed! You are ${distance.toFixed(0)} meters away, which is outside the allowed range of ${ACCEPTABLE_RADIUS_METERS}m.`;
        resultElement.style.color = 'var(--danger-color)';
    }
}

function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}