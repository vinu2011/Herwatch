# HerWatch:Women Safety Analytics System 🚨

A real-time video analytics and surveillance system designed to enhance women's safety using deep learning, computer vision, and geospatial crime data visualization.

## 🌟 Features

- 🔍 **SOS Gesture Detection**: Detects distress gestures like hand-waving using YOLOv8 and MediaPipe.
- 🌃 **Lone Woman Detection at Night**: Alerts when a woman is found alone during nighttime using person detection + gender classification.
- 📍 **Crime Hotspot Mapping**: Visualizes regions with high women-related crime rates using interactive maps powered by Folium.
- 📹 **Dual Mode Analysis**:
  - **Live Camera Mode**: Processes real-time video for immediate safety alerts.
  - **Video Mode**: Upload and analyze recorded videos for threats.
- 👥 **Gender Distribution Analysis**: Counts men and women in a scene for contextual awareness.
- 🌐 **User Interface**: React-based frontend with alert display, hotspot visualization, and detection highlights.

## 🛠️ Tech Stack

- **Frontend**: React.js, Framer Motion, Material UI
- **Backend**: Flask, OpenCV, YOLOv8, MediaPipe, Pandas, MobileNetV2
- **Geospatial Visualization**: Folium, Leaflet.js
- **Others**: HTML, CSS, Bootstrap, JavaScript

## 📊 Dataset

- CSV dataset of women-related crimes in India from government/public sources.
- Used for identifying and plotting high-crime zones on an interactive map.

## 🧠 AI Models

- **YOLOv8**: For real-time object (person) detection.
- **MediaPipe Hands**: For gesture (hand raise/wave) detection.
- **MobileNetV2**: For gender classification.
  
## 🚦 How It Works

1. **User chooses mode (Live / Video).**
2. **System detects persons and classifies gender.**
3. **Alerts triggered on:**
   - Lone woman at night
   - SOS gestures
   - Presence in crime hotspot zones
4. **Frontend displays live alerts, detection frames, and map overlays.**

## 📷 Screenshots

![WhatsApp Image 2025-04-18 at 17 36 05_c667eebe](https://github.com/user-attachments/assets/4694faf4-abc6-418d-a6e4-79d9b421356d)
![WhatsApp Image 2025-04-18 at 17 36 24_3c906635](https://github.com/user-attachments/assets/67872029-db55-40c7-8fe4-ad64fb42118d)
![WhatsApp Image 2025-04-18 at 17 42 35_147eecf0](https://github.com/user-attachments/assets/e2be36ec-4e97-4e4d-a4ed-4c29f8ad0158)
![WhatsApp Image 2025-04-18 at 17 43 05_e3bfa9ed](https://github.com/user-attachments/assets/6123cd10-c0af-4948-b09c-aa457e0c5e67)



## 🚀 Installation

### Backend Setup

```bash
git clone https://github.com/your-username/women-safety-analytics.git
cd backend
pip install -r requirements.txt
python app.py
