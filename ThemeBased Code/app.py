from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import cv2
import numpy as np
import base64
from PIL import Image
import io
import os
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
from geopy.exc import GeocoderTimedOut, GeocoderUnavailable
import pandas as pd
import folium
import uuid
import time
from datetime import datetime
from video_processor import process_video_combined
from live_camera_processor import process_live_camera, list_cameras
import json
import threading
import queue
from flask_sock import Sock

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Enable CORS for all routes
sock = Sock(app)

# Create necessary directories
for directory in ['static', 'uploads']:
    if not os.path.exists(directory):
        os.makedirs(directory)
        print(f"Created directory: {directory}")

# Load the dataset once when the server starts
try:
    df = pd.read_csv("women-crimedataset-India.csv", encoding="latin1")
    # Calculate TOTAL_CRIMES if not present
    if "TOTAL_CRIMES" not in df.columns:
        crime_columns = df.columns.tolist()[3:15]
        df["TOTAL_CRIMES"] = df[crime_columns].sum(axis=1)
except Exception as e:
    print(f"Error loading dataset: {str(e)}")
    df = None

# Global variables for camera processing
camera_thread = None
frame_queue = queue.Queue(maxsize=10)
stop_processing = False
detection_results = []

def base64_to_cv2(base64_string):
    """Convert base64 image to cv2 format"""
    try:
        img_data = base64.b64decode(base64_string.split(',')[1])
        img = Image.open(io.BytesIO(img_data))
        return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    except Exception as e:
        print(f"Error converting base64 to image: {str(e)}")
        return None

def geocode_with_retry(location_name, max_retries=3, timeout=10):
    """Geocode location with retry logic"""
    geolocator = Nominatim(user_agent="herwatch", timeout=timeout)
    
    for attempt in range(max_retries):
        try:
            print(f"Geocoding attempt {attempt + 1} for location: {location_name}")
            location = geolocator.geocode(location_name)
            if location:
                return location.latitude, location.longitude
            time.sleep(1)  # Wait between attempts
        except (GeocoderTimedOut, GeocoderUnavailable) as e:
            print(f"Attempt {attempt + 1} failed: {str(e)}")
            if attempt == max_retries - 1:  # Last attempt
                raise
            time.sleep(2)  # Wait longer before retry
    
    return None, None

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify the API is running"""
    return jsonify({"status": "ok", "message": "API is running"}), 200

@app.route('/api/hotspots/analyze', methods=['POST'])
def analyze_hotspots():
    try:
        if df is None:
            return jsonify({"error": "Dataset not loaded"}), 500

        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Get location from request
        if data.get('use_current_location') and data.get('current_location'):
            try:
                user_lat = float(data['current_location']['latitude'])
                user_lon = float(data['current_location']['longitude'])
                print(f"Using current location: {user_lat}, {user_lon}")
            except (ValueError, KeyError) as e:
                return jsonify({"error": f"Invalid current location data: {str(e)}"}), 400
        elif data.get('location'):
            try:
                # Clean up location name
                location_name = f"{data['location'].strip()}, India"
                print(f"Geocoding location: {location_name}")
                
                user_lat, user_lon = geocode_with_retry(location_name)
                if user_lat is None or user_lon is None:
                    return jsonify({"error": f"Location not found: {data['location']}"}), 404
                
                print(f"Found coordinates: {user_lat}, {user_lon}")
            except Exception as e:
                print(f"Geocoding error: {str(e)}")
                return jsonify({"error": "Unable to find location. Please try again or use a different location name."}), 500
        else:
            return jsonify({"error": "No location provided"}), 400

        # Calculate distances
        print("Calculating distances...")
        df_copy = df.copy()
        df_copy["distance"] = df_copy.apply(
            lambda row: geodesic((user_lat, user_lon), (row["Latitude"], row["Longitude"])).kilometers
            if not pd.isna(row["Latitude"]) and not pd.isna(row["Longitude"])
            else float("inf"),
            axis=1
        )

        # Filter nearby hotspots (within 100km)
        MAX_DISTANCE_KM = 100
        nearby_hotspots = df_copy[df_copy["distance"] <= MAX_DISTANCE_KM].sort_values(by="distance")
        print(f"Found {len(nearby_hotspots)} hotspots within {MAX_DISTANCE_KM}km")

        if nearby_hotspots.empty:
            return jsonify({"error": "No hotspots found in the area"}), 404
        
        # Create map
        print("Creating map...")
        crime_map = folium.Map(location=[user_lat, user_lon], zoom_start=8)

        # Add user location marker
        folium.Marker(
            [user_lat, user_lon],
            popup="Your Location",
            icon=folium.Icon(color="blue")
        ).add_to(crime_map)

        # Add hotspot markers
        for _, row in nearby_hotspots.iterrows():
            if pd.isna(row["Latitude"]) or pd.isna(row["Longitude"]):
                continue

            # Determine risk level and color
            if row["TOTAL_CRIMES"] > 100:
                color = "red"
                risk = "High"
            elif row["TOTAL_CRIMES"] > 50:
                color = "orange"
                risk = "Medium"
            else:
                color = "green"
                risk = "Low"

            folium.CircleMarker(
                location=[row["Latitude"], row["Longitude"]],
                radius=10,
                color=color,
                fill=True,
                fill_color=color,
                fill_opacity=0.6,
                popup=f"{row['DISTRICT']}, {row['STATE/UT']}<br>Risk Level: {risk}<br>Crimes: {row['TOTAL_CRIMES']}<br>Distance: {round(row['distance'], 2)} km"
            ).add_to(crime_map)

        # Generate unique filename and save map
        map_filename = f"map_{uuid.uuid4().hex}.html"
        map_path = os.path.join("static", map_filename)
        crime_map.save(map_path)
        print(f"Map saved as {map_path}")

        # Return hotspots data and map URL
        hotspots_json = nearby_hotspots[["STATE/UT", "DISTRICT", "TOTAL_CRIMES", "distance"]].to_dict('records')
        return jsonify({
            "hotspots": hotspots_json,
            "map_url": f"/static/{map_filename}"
        })

    except Exception as e:
        print(f"Error in analyze_hotspots: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/analyze_video', methods=['POST'])
def analyze_video():
    try:
        if 'video' not in request.files:
            return jsonify({"error": "No video file provided"}), 400
            
        file = request.files['video']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
            
        # Get time from form data or use default
        time_str = request.form.get("time", "22:00")  # default to night
        
        # Save the file
        file_path = os.path.join("uploads", file.filename)
        file.save(file_path)
        print(f"Video saved to: {file_path}")
        
        try:
            # Process the video
            results = process_video_combined(file_path, time_str)
            print(f"Video analysis complete. Found {len(results)} detections")
            
            # Format results for frontend
            formatted_results = []
            for detection in results:
                # Use the type field if available, otherwise determine from event message
                detection_type = detection.get("type", "Lone Woman")
                
                # If type is not provided, determine from event message
                if "type" not in detection:
                    if "SOS" in detection["event"] or "HELP" in detection["event"] or "DISTRESS" in detection["event"] or "EMERGENCY" in detection["event"]:
                        detection_type = "SOS Gesture"
                    elif "MORE MEN" in detection["event"]:
                        detection_type = "More Men"
                
                formatted_detection = {
                    "type": detection_type,
                    "confidence": 0.8,  # Default confidence
                    "frame": detection["frame"],
                    "event": detection["event"]
                }
                
                # Add additional data for More Men detection
                if detection_type == "More Men" and "male_count" in detection and "female_count" in detection:
                    formatted_detection["male_count"] = detection["male_count"]
                    formatted_detection["female_count"] = detection["female_count"]
                
                # Add gesture type information for SOS Gesture detection
                if detection_type == "SOS Gesture" and "gesture_type" in detection:
                    formatted_detection["gesture_type"] = detection["gesture_type"]
                    formatted_detection["gesture_description"] = detection.get("gesture_description", "")
                
                formatted_results.append(formatted_detection)
            
            print(f"Formatted {len(formatted_results)} detections for frontend")
            return jsonify({
                "detections": formatted_results,
                "total_frames": len(results)  # Approximate
            })
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"Error in video processing: {error_details}")
            return jsonify({"error": f"Error processing video: {str(e)}"}), 500
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in video analysis: {error_details}")
        return jsonify({"error": f"Error in video analysis: {str(e)}"}), 500

@sock.route('/ws/camera')
def camera_websocket(ws):
    global stop_processing, detection_results
    
    try:
        stop_processing = False
        detection_results = []
        frame_count = 0
        start_time = time.time()
        
        while not stop_processing:
            try:
                # Receive frame data from client
                frame_data = ws.receive()
                if frame_data is None:
                    continue
                    
                frame_count += 1
                
                # Process frame
                detections = process_frame(frame_data)
                
                if detections:
                    # Send detection results back to client
                    for detection in detections:
                        ws.send(json.dumps({
                            'type': 'detection',
                            'detection': detection
                        }))
                        detection_results.append(detection)
                
                # Send progress update every 10 frames
                if frame_count % 10 == 0:
                    elapsed_time = time.time() - start_time
                    fps = frame_count / elapsed_time if elapsed_time > 0 else 0
                    ws.send(json.dumps({
                        'type': 'progress',
                        'frame_count': frame_count,
                        'fps': fps
                    }))
                    
            except Exception as e:
                print(f"Error in WebSocket loop: {str(e)}")
                continue
                
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
    finally:
        # Send final results
        try:
            ws.send(json.dumps({
                'type': 'analysis_complete',
                'totalFrames': frame_count,
                'sosDetections': len([d for d in detection_results if d['type'] == 'SOS Gesture']),
                'loneWomanDetections': len([d for d in detection_results if d['type'] == 'Lone Woman']),
                'moreMenDetections': len([d for d in detection_results if d['type'] == 'More Men']),
                'detectionRate': len(detection_results) / frame_count if frame_count > 0 else 0
            }))
        except:
            pass

@app.route('/api/live-camera/list', methods=['GET'])
def list_available_cameras():
    """List all available cameras."""
    try:
        cameras = list_cameras()
        return jsonify({
            "cameras": cameras,
            "default": 0 if cameras else None
        })
    except Exception as e:
        print(f"Error listing cameras: {str(e)}")
        return jsonify({"error": "Failed to list cameras"}), 500

@app.route('/api/live-camera/stop', methods=['POST'])
def stop_live_camera():
    """Stop the live camera processing."""
    global stop_processing
    try:
        stop_processing = True
        return jsonify({"message": "Camera processing stopped"})
    except Exception as e:
        print(f"Error stopping camera: {str(e)}")
        return jsonify({"error": "Failed to stop camera"}), 500

@app.route('/static/<path:filename>')
def serve_static(filename):
    """Serve static files from the static directory"""
    try:
        return send_from_directory('static', filename)
    except Exception as e:
        print(f"Error serving static file {filename}: {str(e)}")
        return jsonify({"error": f"File not found: {filename}"}), 404

@app.route('/<path:filename>')
def serve_file(filename):
    """Serve files from the root directory"""
    try:
        return send_from_directory('.', filename)
    except Exception as e:
        print(f"Error serving file {filename}: {str(e)}")
        return jsonify({"error": f"File not found: {filename}"}), 404

@app.route('/')
def index():
    """Serve the index.html file"""
    try:
        return send_from_directory('.', 'index.html')
    except Exception as e:
        print(f"Error serving index.html: {str(e)}")
        return jsonify({"error": "Index file not found"}), 404

def process_frame(frame_data):
    try:
        # Convert base64 to image
        nparr = np.frombuffer(frame_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return None
            
        # Process frame using video_processor
        detections = process_live_camera(frame)
        return detections
    except Exception as e:
        print(f"Error processing frame: {str(e)}")
        return None

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)