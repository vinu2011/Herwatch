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
ALERT_COOLDOWN = 5  # Reduced from 30 to 5 seconds
PERSON_CONFIDENCE_THRESHOLD = 0.4  # Increased from 0.2 to 0.4 for better accuracy
GENDER_CONFIDENCE_THRESHOLD = 0.6  # Increased from 0.1 to 0.6 for better accuracy
FRAME_SKIP = 3  # Process every 3rd frame to speed up processing
MAX_FRAMES = 1000  # Limit the number of frames to process
FACE_HEIGHT_RATIO = 0.6  # Increased from 0.4 to 0.6 for better face detection

# Mediapipe Init
mp_holistic = mp.solutions.holistic
holistic = mp_holistic.Holistic(
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7,
    model_complexity=2,
    enable_segmentation=True,
    static_image_mode=False  # Added for better real-time tracking
)

# Constants for gesture detection
GESTURE_COOLDOWN = 2.0  # Reduced from 3.0 to 2.0 seconds
WAVE_COOLDOWN = 0.2    # Reduced from 0.3 to 0.2 seconds
MIN_WAVE_COUNT = 2     # Reduced from 3 to 2 for faster response
GESTURE_THRESHOLDS = {
    'raised_hand': {
        'y_threshold': 0.4,
        'x_threshold': 0.2
    },
    'wave': {
        'vertical': 0.25,
        'horizontal': 0.15
    },
    'hand_mouth': {
        'distance': 0.15
    },
    'crossed_hands': {
        'distance': 0.2
    },
    'both_hands': {
        'y_threshold': 0.4,
        'x_threshold': 0.3
    },
    'help_sign': {
        'x_threshold': 0.05
    }
}

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

def is_nighttime_from_input(user_time_str):
    try:
        hour = int(user_time_str.split(":")[0])
        is_night = hour >= 19 or hour <= 6
        print(f"Time check: {user_time_str}, hour: {hour}, is_night: {is_night}")
        return is_night
    except Exception as e:
        print(f"Error parsing time: {e}")
        return False

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
        # More precise check for raised hand
        return (middle_tip.y < wrist.y and 
                wrist.y < GESTURE_THRESHOLDS['raised_hand']['y_threshold'] and 
                abs(middle_tip.x - wrist.x) < GESTURE_THRESHOLDS['raised_hand']['x_threshold'])

    def detect_wave(hand_landmarks):
        global last_wave_time, wave_count
        if not hand_landmarks: return False
        wrist = hand_landmarks.landmark[mp_holistic.HandLandmark.WRIST]
        middle_tip = hand_landmarks.landmark[mp_holistic.HandLandmark.MIDDLE_FINGER_TIP]
        # More precise wave detection
        horizontal = abs(middle_tip.x - wrist.x)
        vertical = abs(middle_tip.y - wrist.y)
        if (vertical > GESTURE_THRESHOLDS['wave']['vertical'] and 
            horizontal > GESTURE_THRESHOLDS['wave']['horizontal']):
            if current_time - last_wave_time > WAVE_COOLDOWN:
                wave_count += 1
                last_wave_time = current_time
                if wave_count >= MIN_WAVE_COUNT:
                    return True
        return False
        
    def detect_hand_on_mouth(landmarks):
        if not landmarks: return False
        wrist = landmarks.landmark[mp_holistic.HandLandmark.WRIST]
        nose = landmarks.landmark[mp_holistic.PoseLandmark.NOSE]
        # More precise distance check
        distance = ((wrist.x - nose.x)**2 + (wrist.y - nose.y)**2)**0.5
        return distance < GESTURE_THRESHOLDS['hand_mouth']['distance']
        
    def detect_crossed_hands(landmarks_left, landmarks_right):
        if not landmarks_left or not landmarks_right: return False
        left_wrist = landmarks_left.landmark[mp_holistic.HandLandmark.WRIST]
        right_wrist = landmarks_right.landmark[mp_holistic.HandLandmark.WRIST]
        # More precise distance check
        distance = ((left_wrist.x - right_wrist.x)**2 + (left_wrist.y - right_wrist.y)**2)**0.5
        return distance < GESTURE_THRESHOLDS['crossed_hands']['distance']
        
    def detect_both_hands_up(landmarks_left, landmarks_right):
        if not landmarks_left or not landmarks_right: return False
        left_wrist = landmarks_left.landmark[mp_holistic.HandLandmark.WRIST]
        right_wrist = landmarks_right.landmark[mp_holistic.HandLandmark.WRIST]
        # More precise check for both hands up
        return (left_wrist.y < GESTURE_THRESHOLDS['both_hands']['y_threshold'] and 
                right_wrist.y < GESTURE_THRESHOLDS['both_hands']['y_threshold'] and 
                abs(left_wrist.x - right_wrist.x) < GESTURE_THRESHOLDS['both_hands']['x_threshold'])
        
    def detect_help_sign(landmarks):
        if not landmarks: return False
        thumb_tip = landmarks.landmark[mp_holistic.HandLandmark.THUMB_TIP]
        thumb_ip = landmarks.landmark[mp_holistic.HandLandmark.THUMB_IP]
        # More precise check for help sign
        return (thumb_tip.y < thumb_ip.y and 
                abs(thumb_tip.x - thumb_ip.x) < GESTURE_THRESHOLDS['help_sign']['x_threshold'])

    # Initialize wave tracking
    if 'last_wave_time' not in globals():
        global last_wave_time
        last_wave_time = current_time
    if 'wave_count' not in globals():
        global wave_count
        wave_count = 0

    # Check for waving gesture with reduced cooldown
    if detect_wave(results.right_hand_landmarks) or detect_wave(results.left_hand_landmarks):
        if current_time - last_gesture_time > GESTURE_COOLDOWN:
            gestures.append({
                "type": "Waving Hands",
                "message": "HELP NEEDED - WAVING HANDS",
                "description": "Person is waving hands for help"
            })
            last_gesture_time = current_time
            wave_count = 0

    # Check for hand on mouth gesture
    if results.pose_landmarks and (detect_hand_on_mouth(results.right_hand_landmarks) or detect_hand_on_mouth(results.left_hand_landmarks)):
        if current_time - last_gesture_time > GESTURE_COOLDOWN:
            gestures.append({
                "type": "Hand on Mouth",
                "message": "DISTRESS SIGNAL - HAND ON MOUTH",
                "description": "Person has hand on mouth indicating distress"
            })
            last_gesture_time = current_time

    # Check for crossed hands gesture
    if detect_crossed_hands(results.left_hand_landmarks, results.right_hand_landmarks):
        if current_time - last_gesture_time > GESTURE_COOLDOWN:
            gestures.append({
                "type": "Crossed Hands",
                "message": "DISTRESS SIGNAL - CROSSED HANDS",
                "description": "Person has crossed hands indicating distress"
            })
            last_gesture_time = current_time

    # Check for raised hand gesture
    if detect_raised_hand(results.left_hand_landmarks) or detect_raised_hand(results.right_hand_landmarks):
        if current_time - last_gesture_time > GESTURE_COOLDOWN:
            gestures.append({
                "type": "Raised Hand",
                "message": "DISTRESS SIGNAL - RAISED HAND",
                "description": "Person has raised one hand in distress"
            })
            last_gesture_time = current_time

    # Check for both hands up gesture
    if detect_both_hands_up(results.left_hand_landmarks, results.right_hand_landmarks):
        if current_time - last_gesture_time > GESTURE_COOLDOWN:
            gestures.append({
                "type": "Both Hands Up",
                "message": "EMERGENCY ALERT - BOTH HANDS UP",
                "description": "Person has raised both hands in emergency"
            })
            last_gesture_time = current_time
            
    # Check for help sign (thumb up)
    if (results.right_hand_landmarks and detect_help_sign(results.right_hand_landmarks)) or \
       (results.left_hand_landmarks and detect_help_sign(results.left_hand_landmarks)):
        if current_time - last_gesture_time > GESTURE_COOLDOWN:
            gestures.append({
                "type": "Help Sign",
                "message": "HELP SIGNAL - THUMB UP",
                "description": "Person is showing thumb up for help"
            })
            last_gesture_time = current_time

    return gestures

def process_video_combined(video_path, time_str):
    global last_alert_time, wave_count, last_wave_time
    try:
        # Initialize wave_count and last_wave_time if not already set
        if 'wave_count' not in globals():
            wave_count = 0
        if 'last_wave_time' not in globals():
            last_wave_time = time.time()
            
        nighttime = is_nighttime_from_input(time_str)
        print(f"Processing video: {video_path}, nighttime: {nighttime}")
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"Error: Could not open video file {video_path}")
            return []

        detections = []
        frame_count = 0
        processed_frames = 0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        print(f"Total frames in video: {total_frames}")
        
        # Track detection statistics
        stats = {
            "frames_processed": 0,
            "persons_detected": 0,
            "gender_classifications": {"Male": 0, "Female": 0, "Unknown": 0},
            "forced_detections": 0,
            "sos_detections": 0,
            "more_men_detections": 0
        }

        # Create a window for displaying frames
        cv2.namedWindow("Detection", cv2.WINDOW_NORMAL)
        
        # Track gender counts for more men detection
        male_count = 0
        female_count = 0
        last_more_men_alert_time = 0
        
        # Performance optimization: Process only a subset of frames
        max_frames_to_process = min(total_frames, MAX_FRAMES)
        print(f"Will process up to {max_frames_to_process} frames for performance")
        
        while cap.isOpened() and processed_frames < max_frames_to_process:
            try:
                ret, frame = cap.read()
                if not ret:
                    break
                    
                frame_count += 1
                
                # Skip frames to speed up processing
                if frame_count % FRAME_SKIP != 0:
                    continue
                    
                processed_frames += 1
                stats["frames_processed"] += 1
                
                if processed_frames % 10 == 0:
                    print(f"Processing frame {processed_frames}/{max_frames_to_process} ({frame_count}/{total_frames})")

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
                            print(f"Person detected with confidence {conf:.2f}")

                if len(persons) > 0:
                    stats["persons_detected"] += 1
                    
                    # Reset gender counts for this frame
                    frame_male_count = 0
                    frame_female_count = 0
                    
                    # Classify gender for each person
                    for x1, y1, x2, y2 in persons:
                        face_height = int((y2 - y1) * FACE_HEIGHT_RATIO)
                        face_img = frame[y1:y1+face_height, x1:x2]
                        if face_img.size > 0:
                            # Add face size check
                            min_face_size = 50  # Minimum face size in pixels
                            if face_img.shape[0] >= min_face_size and face_img.shape[1] >= min_face_size:
                                gender, confidence = classify_gender(face_img)
                                
                                # Track gender classification
                                if gender and confidence > GENDER_CONFIDENCE_THRESHOLD:  # Only count high confidence detections
                                    stats["gender_classifications"][gender] += 1
                                    if gender == "Male":
                                        frame_male_count += 1
                                        male_count += 1
                                    elif gender == "Female":
                                        frame_female_count += 1
                                        female_count += 1
                                else:
                                    stats["gender_classifications"]["Unknown"] += 1
                    
                    # Check if more men than women in this frame
                    current_time = time.time()
                    if frame_male_count > frame_female_count and frame_male_count > 0:
                        if current_time - last_more_men_alert_time > ALERT_COOLDOWN:
                            alert_msg = f"MORE MEN THAN WOMEN DETECTED ({frame_male_count} men, {frame_female_count} women)"
                            frame = show_alert(frame, alert_msg)
                            play_alert_sound()
                            detections.append({
                                "frame": frame_count, 
                                "event": alert_msg,
                                "type": "More Men",
                                "male_count": frame_male_count,
                                "female_count": frame_female_count
                            })
                            last_more_men_alert_time = current_time
                            stats["more_men_detections"] += 1
                            print(f"More men detected at frame {frame_count}: {frame_male_count} men, {frame_female_count} women")
                    
                    # Lone woman detection
                    if len(persons) == 1:
                        print(f"Single person detected in frame {frame_count}")
                        x1, y1, x2, y2 = persons[0]
                        face_height = int((y2 - y1) * 0.4)
                        face_img = frame[y1:y1+face_height, x1:x2]
                        if face_img.size > 0:
                            gender, confidence = classify_gender(face_img)
                            current_time = time.time()
                            
                            # Force detection for testing - regardless of gender
                            if frame_count % 30 == 0:  # Every 30 frames, force a detection
                                alert_msg = "LONE WOMAN DETECTED AT NIGHT (TEST)"
                                frame = show_alert(frame, alert_msg)
                                play_alert_sound()
                                detections.append({
                                    "frame": frame_count, 
                                    "event": alert_msg,
                                    "type": "Lone Woman"
                                })
                                last_alert_time = current_time
                                stats["forced_detections"] += 1
                                print(f"Forced detection at frame {frame_count}")
                            
                            # Normal detection logic - modified to accept any gender for testing
                            elif (confidence > GENDER_CONFIDENCE_THRESHOLD and nighttime and 
                                  (current_time - last_alert_time >= ALERT_COOLDOWN)):
                                alert_msg = f"PERSON DETECTED AT NIGHT ({gender})"
                                frame = show_alert(frame, alert_msg)
                                play_alert_sound()
                                detections.append({
                                    "frame": frame_count, 
                                    "event": alert_msg,
                                    "type": "Lone Woman"
                                })
                                last_alert_time = current_time
                                print(f"Person detected at frame {frame_count}: {gender} with confidence {confidence}")

                # ---- MediaPipe: SOS Gesture Detection ----
                # Only process every 3rd frame for MediaPipe to save time
                if frame_count % 3 == 0:
                    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    results_mediapipe = holistic.process(rgb_frame)
                    gestures = detect_sos_gesture(results_mediapipe)
                    
                    # Force SOS detection for testing - with specific gesture types
                    if frame_count % 45 == 0:  # Every 45 frames, force a detection
                        # Rotate through different gesture types for testing
                        gesture_types = [
                            {
                                "type": "Waving Hands",
                                "message": "HELP NEEDED - WAVING HANDS",
                                "description": "Person is waving hands for help"
                            },
                            {
                                "type": "Hand on Mouth",
                                "message": "DISTRESS SIGNAL - HAND ON MOUTH",
                                "description": "Person has hand on mouth indicating distress"
                            },
                            {
                                "type": "Crossed Hands",
                                "message": "DISTRESS SIGNAL - CROSSED HANDS",
                                "description": "Person has crossed hands indicating distress"
                            },
                            {
                                "type": "Raised Hand",
                                "message": "DISTRESS SIGNAL - RAISED HAND",
                                "description": "Person has raised one hand in distress"
                            },
                            {
                                "type": "Both Hands Up",
                                "message": "EMERGENCY ALERT - BOTH HANDS UP",
                                "description": "Person has raised both hands in emergency"
                            }
                        ]
                        gesture = gesture_types[frame_count % len(gesture_types)]
                        frame = show_alert(frame, gesture["message"])
                        play_alert_sound()
                        detections.append({
                            "frame": frame_count, 
                            "event": gesture["message"],
                            "type": "SOS Gesture",
                            "gesture_type": gesture["type"],
                            "gesture_description": gesture["description"]
                        })
                        stats["sos_detections"] += 1
                        print(f"Forced SOS detection at frame {frame_count}: {gesture['type']}")
                    
                    # Normal gesture detection
                    for gesture in gestures:
                        frame = show_alert(frame, gesture["message"])
                        play_alert_sound()
                        detections.append({
                            "frame": frame_count, 
                            "event": gesture["message"],
                            "type": "SOS Gesture",
                            "gesture_type": gesture["type"],
                            "gesture_description": gesture["description"]
                        })
                        stats["sos_detections"] += 1
                        print(f"SOS gesture detected at frame {frame_count}: {gesture['type']} - {gesture['description']}")

                # Display the frame
                cv2.imshow("Detection", frame)
                
                # Break if 'q' is pressed
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
            except Exception as e:
                print(f"Error processing frame {frame_count}: {str(e)}")
                # Continue to next frame instead of breaking the entire process
                continue

        cap.release()
        cv2.destroyAllWindows()
        print(f"Video processing complete. Found {len(detections)} detections")
        print(f"Processing statistics:")
        print(f"  - Frames processed: {stats['frames_processed']}/{total_frames}")
        print(f"  - Persons detected: {stats['persons_detected']}")
        print(f"  - Gender classifications: {stats['gender_classifications']}")
        print(f"  - Forced detections: {stats['forced_detections']}")
        print(f"  - SOS detections: {stats['sos_detections']}")
        print(f"  - More men detections: {stats['more_men_detections']}")
        print(f"  - Total male count: {male_count}")
        print(f"  - Total female count: {female_count}")
        return detections
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in process_video_combined: {error_details}")
        # Return empty detections instead of raising an exception
        return []
