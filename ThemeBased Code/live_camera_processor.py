import cv2
import torch
import numpy as np
from ultralytics import YOLO
import torchvision.models as models
import time
import winsound
import mediapipe as mp

# Load models
yolo_model = YOLO("yolov8n.pt")
gender_model = models.mobilenet_v2(pretrained=True)
gender_model.eval()

# Constants
GENDER_LABELS = ["Male", "Female"]
ALERT_COOLDOWN = 5  # Reduced from 30 to 5 seconds for live processing
PERSON_CONFIDENCE_THRESHOLD = 0.2  # Lowered from 0.3 to 0.2
GENDER_CONFIDENCE_THRESHOLD = 0.1  # Lowered from 0.2 to 0.1
FRAME_SKIP = 3  # Process every 3rd frame to maintain real-time performance

# Mediapipe Init
mp_holistic = mp.solutions.holistic
holistic = mp_holistic.Holistic(min_detection_confidence=0.5, min_tracking_confidence=0.5)

# Time Trackers
last_alert_time = 0
last_gesture_time = 0
wave_count = 0
last_wave_time = 0

def play_alert_sound():
    try:
        winsound.PlaySound("SystemExclamation", winsound.SND_ALIAS)
    except Exception as e:
        print(f"Could not play alert sound: {e}")

def show_alert(frame, message):
    cv2.rectangle(frame, (0, 0), (frame.shape[1], frame.shape[0]), (0, 0, 255), 5)
    text = f"\u26a0 {message} \u26a0"
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 1.5
    thickness = 3
    (text_width, text_height), _ = cv2.getTextSize(text, font, font_scale, thickness)
    x = (frame.shape[1] - text_width) // 2
    y = 50
    cv2.rectangle(frame, (x-10, y-text_height-10), (x+text_width+10, y+10), (0, 0, 0), -1)
    cv2.putText(frame, text, (x, y), font, font_scale, (0, 0, 255), thickness)
    return frame

def is_nighttime():
    current_hour = time.localtime().tm_hour
    return current_hour >= 19 or current_hour <= 6

def classify_gender(face_img):
    try:
        face_img = cv2.resize(face_img, (224, 224))
        face_tensor = torch.tensor(face_img, dtype=torch.float32).permute(2, 0, 1).unsqueeze(0) / 255.0
        
        with torch.no_grad():
            output = gender_model(face_tensor)
        
        pred_idx = output.argmax().item()
        confidence = torch.softmax(output, dim=1)[0][pred_idx].item()
        gender = "Female" if pred_idx % 2 == 0 else "Male"
        
        print(f"Gender classification: {gender} with confidence {confidence:.2f}")
        return gender, confidence
    except Exception as e:
        print(f"Error in gender classification: {e}")
        return None, 0.0

def detect_sos_gesture(results):
    global last_gesture_time, wave_count, last_wave_time
    current_time = time.time()
    gestures = []

    def get_landmarks(landmark_type):
        return getattr(results, landmark_type) if hasattr(results, landmark_type) else None

    def detect_raised_hand(landmarks):
        if not landmarks: return False
        wrist = landmarks.landmark[mp_holistic.HandLandmark.WRIST]
        middle_tip = landmarks.landmark[mp_holistic.HandLandmark.MIDDLE_FINGER_TIP]
        return middle_tip.y < wrist.y and wrist.y < 0.5

    def detect_wave(hand_landmarks):
        global last_wave_time, wave_count
        if not hand_landmarks: return False
        wrist = hand_landmarks.landmark[mp_holistic.HandLandmark.WRIST]
        middle_tip = hand_landmarks.landmark[mp_holistic.HandLandmark.MIDDLE_FINGER_TIP]
        horizontal = abs(middle_tip.x - wrist.x)
        vertical = abs(middle_tip.y - wrist.y)
        if vertical > 0.2 and horizontal > 0.1:
            if current_time - last_wave_time > 0.3:
                wave_count += 1
                last_wave_time = current_time
                if wave_count >= 2:
                    return True
        return False
        
    def detect_hand_on_mouth(landmarks):
        if not landmarks: return False
        wrist = landmarks.landmark[mp_holistic.HandLandmark.WRIST]
        nose = landmarks.landmark[mp_holistic.PoseLandmark.NOSE]
        distance = ((wrist.x - nose.x)**2 + (wrist.y - nose.y)**2)**0.5
        return distance < 0.2
        
    def detect_crossed_hands(landmarks_left, landmarks_right):
        if not landmarks_left or not landmarks_right: return False
        left_wrist = landmarks_left.landmark[mp_holistic.HandLandmark.WRIST]
        right_wrist = landmarks_right.landmark[mp_holistic.HandLandmark.WRIST]
        distance = ((left_wrist.x - right_wrist.x)**2 + (left_wrist.y - right_wrist.y)**2)**0.5
        return distance < 0.25
        
    def detect_both_hands_up(landmarks_left, landmarks_right):
        if not landmarks_left or not landmarks_right: return False
        left_wrist = landmarks_left.landmark[mp_holistic.HandLandmark.WRIST]
        right_wrist = landmarks_right.landmark[mp_holistic.HandLandmark.WRIST]
        return left_wrist.y < 0.5 and right_wrist.y < 0.5
        
    def detect_help_sign(landmarks):
        if not landmarks: return False
        thumb_tip = landmarks.landmark[mp_holistic.HandLandmark.THUMB_TIP]
        thumb_ip = landmarks.landmark[mp_holistic.HandLandmark.THUMB_IP]
        return thumb_tip.y < thumb_ip.y and abs(thumb_tip.x - thumb_ip.x) < 0.1

    if 'last_wave_time' not in globals():
        global last_wave_time
        last_wave_time = current_time
        
    if 'wave_count' not in globals():
        global wave_count
        wave_count = 0

    if detect_wave(results.right_hand_landmarks) or detect_wave(results.left_hand_landmarks):
        if current_time - last_gesture_time > 3:
            gestures.append({
                "type": "Waving Hands",
                "message": "HELP NEEDED - WAVING HANDS",
                "description": "Person is waving hands for help"
            })
            last_gesture_time = current_time
            wave_count = 0

    if results.pose_landmarks and (detect_hand_on_mouth(results.right_hand_landmarks) or detect_hand_on_mouth(results.left_hand_landmarks)):
        if current_time - last_gesture_time > 3:
            gestures.append({
                "type": "Hand on Mouth",
                "message": "DISTRESS SIGNAL - HAND ON MOUTH",
                "description": "Person has hand on mouth indicating distress"
            })
            last_gesture_time = current_time

    if detect_crossed_hands(results.left_hand_landmarks, results.right_hand_landmarks):
        if current_time - last_gesture_time > 3:
            gestures.append({
                "type": "Crossed Hands",
                "message": "DISTRESS SIGNAL - CROSSED HANDS",
                "description": "Person has crossed hands indicating distress"
            })
            last_gesture_time = current_time

    if detect_raised_hand(results.left_hand_landmarks) or detect_raised_hand(results.right_hand_landmarks):
        if current_time - last_gesture_time > 3:
            gestures.append({
                "type": "Raised Hand",
                "message": "DISTRESS SIGNAL - RAISED HAND",
                "description": "Person has raised one hand in distress"
            })
            last_gesture_time = current_time

    if detect_both_hands_up(results.left_hand_landmarks, results.right_hand_landmarks):
        if current_time - last_gesture_time > 3:
            gestures.append({
                "type": "Both Hands Up",
                "message": "EMERGENCY ALERT - BOTH HANDS UP",
                "description": "Person has raised both hands in emergency"
            })
            last_gesture_time = current_time
            
    if (results.right_hand_landmarks and detect_help_sign(results.right_hand_landmarks)) or \
       (results.left_hand_landmarks and detect_help_sign(results.left_hand_landmarks)):
        if current_time - last_gesture_time > 3:
            gestures.append({
                "type": "Help Sign",
                "message": "HELP SIGNAL - THUMB UP",
                "description": "Person is showing thumb up for help"
            })
            last_gesture_time = current_time

    return gestures

def list_cameras():
    """List all available cameras."""
    available_cameras = []
    print("Scanning for available cameras...")
    
    # Try different camera backends
    backends = [
        cv2.CAP_DSHOW,  # DirectShow (Windows)
        cv2.CAP_MSMF,   # Media Foundation (Windows)
        cv2.CAP_ANY     # Any available backend
    ]
    
    for backend in backends:
        print(f"Trying backend: {backend}")
        for i in range(10):  # Check first 10 indexes
            try:
                cap = cv2.VideoCapture(i + backend)
                if cap.isOpened():
                    ret, frame = cap.read()
                    if ret and frame is not None:
                        print(f"Found working camera at index {i} with backend {backend}")
                        available_cameras.append(i)
                    cap.release()
            except Exception as e:
                print(f"Error checking camera {i} with backend {backend}: {str(e)}")
                continue
    
    print(f"Found {len(available_cameras)} available cameras: {available_cameras}")
    return available_cameras

def process_live_camera(frame):
    """Process a single frame for live camera analysis."""
    global last_alert_time, wave_count, last_wave_time
    try:
        # Initialize wave_count and last_wave_time if not already set
        if 'wave_count' not in globals():
            wave_count = 0
        if 'last_wave_time' not in globals():
            last_wave_time = time.time()
            
        nighttime = is_nighttime()
        detections = []
        
        # ---- YOLO: Person Detection ----
        results = yolo_model(frame)
        persons = []
        for result in results:
            for box in result.boxes:
                cls = int(box.cls[0])
                conf = float(box.conf[0])
                if cls == 0 and conf > PERSON_CONFIDENCE_THRESHOLD:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    persons.append((x1, y1, x2, y2))

        if len(persons) > 0:
            # Reset gender counts for this frame
            frame_male_count = 0
            frame_female_count = 0
            
            # Classify gender for each person
            for x1, y1, x2, y2 in persons:
                face_height = int((y2 - y1) * 0.4)
                face_img = frame[y1:y1+face_height, x1:x2]
                if face_img.size > 0:
                    gender, confidence = classify_gender(face_img)
                    
                    # Track gender classification
                    if gender and confidence > GENDER_CONFIDENCE_THRESHOLD:
                        if gender == "Male":
                            frame_male_count += 1
                        elif gender == "Female":
                            frame_female_count += 1
            
            # Check if more men than women in this frame
            current_time = time.time()
            if frame_male_count > frame_female_count and frame_male_count > 0:
                if current_time - last_alert_time > ALERT_COOLDOWN:
                    alert_msg = f"MORE MEN THAN WOMEN DETECTED ({frame_male_count} men, {frame_female_count} women)"
                    frame = show_alert(frame, alert_msg)
                    play_alert_sound()
                    detections.append({
                        "type": "More Men",
                        "event": alert_msg,
                        "male_count": frame_male_count,
                        "female_count": frame_female_count
                    })
                    last_alert_time = current_time

            # Lone woman detection
            if len(persons) == 1:
                x1, y1, x2, y2 = persons[0]
                face_height = int((y2 - y1) * 0.4)
                face_img = frame[y1:y1+face_height, x1:x2]
                if face_img.size > 0:
                    gender, confidence = classify_gender(face_img)
                    current_time = time.time()
                    
                    if (confidence > GENDER_CONFIDENCE_THRESHOLD and nighttime and 
                        (current_time - last_alert_time >= ALERT_COOLDOWN)):
                        alert_msg = f"PERSON DETECTED AT NIGHT ({gender})"
                        frame = show_alert(frame, alert_msg)
                        play_alert_sound()
                        detections.append({
                            "type": "Lone Woman",
                            "event": alert_msg
                        })
                        last_alert_time = current_time

        # ---- MediaPipe: SOS Gesture Detection ----
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results_mediapipe = holistic.process(rgb_frame)
        gestures = detect_sos_gesture(results_mediapipe)
        
        for gesture in gestures:
            frame = show_alert(frame, gesture["message"])
            play_alert_sound()
            detections.append({
                "type": "SOS Gesture",
                "event": gesture["message"],
                "gesture_type": gesture["type"],
                "gesture_description": gesture["description"]
            })

        return detections
    except Exception as e:
        print(f"Error in process_live_camera: {str(e)}")
        return [] 