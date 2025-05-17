import React, { useState, useRef } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Warning,
  Woman,
  Gesture,
  Group,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const MotionCard = motion(Card);
const MotionPaper = motion(Paper);

const VideoMode = () => {
  const videoRef = useRef(null);
  const [videoFile, setVideoFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [selectedTime, setSelectedTime] = useState('19:00');
  const [detections, setDetections] = useState([]);
  const [analysisResults, setAnalysisResults] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setError(null);
      setAnalysisResults(null);
      setDetections([]);
      const url = URL.createObjectURL(file);
      videoRef.current.src = url;
    } else {
      setError('Please select a valid video file');
    }
  };

  const analyzeVideo = async () => {
    if (!videoFile) {
      setError('Please select a video file first');
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);
    setDetections([]);
    setAnalysisResults(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('time', selectedTime);

      console.log('Sending video for analysis...');
      const response = await fetch('http://localhost:5000/analyze_video', {
        method: 'POST',
        body: formData,
      });

      console.log('Response received:', response.status);
      const data = await response.json();
      console.log('Data received:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed. Please try again.');
      }

      if (!data.detections || !Array.isArray(data.detections)) {
        console.error('Invalid detections data:', data);
        throw new Error('Invalid response format from server');
      }

      console.log(`Processing ${data.detections.length} detections`);
      
      const formattedDetections = data.detections.map((det, idx) => {
        // Use the type field if available, otherwise determine from event message
        let type = det.type || "Lone Woman";
        if (!det.type && det.event) {
          if (
            det.event.includes("SOS") || 
            det.event.includes("HELP") || 
            det.event.includes("DISTRESS") || 
            det.event.includes("EMERGENCY")
          ) {
            type = "SOS Gesture";
          } else if (det.event.includes("MORE MEN")) {
            type = "More Men";
          }
        }
        
        // Determine icon and color based on detection type
        let icon = 'woman';
        let color = 'warning';
        
        if (type === 'SOS Gesture') {
          icon = 'gesture';
          color = 'error';
        } else if (type === 'More Men') {
          icon = 'group';
          color = 'info';
        }
        
        return {
          type: type,
          confidence: det.confidence || 0.8,
          timestamp: new Date().toLocaleTimeString(),
          icon: icon,
          color: color,
          event: det.event || type,
          male_count: det.male_count,
          female_count: det.female_count,
          gesture_type: det.gesture_type,
          gesture_description: det.gesture_description
        };
      });

      console.log('Formatted detections:', formattedDetections);
      
      setDetections(formattedDetections);
      
      // Calculate statistics
      const totalFrames = data.total_frames || formattedDetections.length;
      const sosDetections = formattedDetections.filter(d => d.type === 'SOS Gesture').length;
      const loneWomanDetections = formattedDetections.filter(d => d.type === 'Lone Woman').length;
      const moreMenDetections = formattedDetections.filter(d => d.type === 'More Men').length;
      
      setAnalysisResults({
        totalFrames: totalFrames,
        sosDetections: sosDetections,
        loneWomanDetections: loneWomanDetections,
        moreMenDetections: moreMenDetections,
        detectionRate: (formattedDetections.length / (totalFrames || 1)),
      });
      
      console.log('Analysis complete, detections displayed');
    } catch (err) {
      console.error('Error during video analysis:', err);
      setError(err.message || 'An unknown error occurred during video analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setProgress(100);
    }
  };

  const getDetectionIcon = (icon) => {
    switch (icon) {
      case 'gesture':
        return <Gesture color="error" />;
      case 'woman':
        return <Woman color="warning" />;
      case 'group':
        return <Group color="info" />;
      default:
        return <Warning color="error" />;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <MotionCard initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <CardContent sx={{ p: 0 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <Box sx={{ position: 'relative', width: '100%', paddingTop: '56.25%', backgroundColor: '#000' }}>
                <video
                  ref={videoRef}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  controls
                />
                {isAnalyzing && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <CircularProgress />
                    <Typography variant="caption" color="white">Analyzing...</Typography>
                  </Box>
                )}
              </Box>
              {isAnalyzing && (
                <Box sx={{ width: '100%', mt: 2 }}>
                  <LinearProgress variant="determinate" value={progress} />
                  <Typography variant="caption">Progress: {Math.round(progress)}%</Typography>
                </Box>
              )}
            </CardContent>
          </MotionCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <MotionCard initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <CardContent>
              <Typography variant="h5" sx={{ mb: 3 }}>Video Analysis</Typography>
              <Button
                variant="contained"
                component="label"
                startIcon={<UploadIcon />}
                fullWidth
                sx={{ mb: 2 }}
              >
                Upload Video
                <input type="file" hidden accept="video/*" onChange={handleFileChange} />
              </Button>
              {videoFile && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Selected: {videoFile.name}
                </Typography>
              )}

              <Typography variant="subtitle1" sx={{ mb: 1 }}>Select Video Time</Typography>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  marginBottom: '12px',
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Used for determining night time for lone woman detection.
              </Typography>

              <Button
                variant="contained"
                color="primary"
                onClick={analyzeVideo}
                disabled={!videoFile || isAnalyzing}
                fullWidth
                sx={{ mt: 3 }}
              >
                {isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
              </Button>

              {analysisResults && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>Analysis Summary</Typography>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="body2">Total Frames: {analysisResults.totalFrames}</Typography>
                    <Typography variant="body2">SOS Detections: {analysisResults.sosDetections}</Typography>
                    <Typography variant="body2">Lone Woman Detections: {analysisResults.loneWomanDetections}</Typography>
                    <Typography variant="body2">More Men Detections: {analysisResults.moreMenDetections}</Typography>
                    <Typography variant="body2">
                      Detection Rate: {(analysisResults.detectionRate * 100).toFixed(2)}%
                    </Typography>
                  </Paper>
                </Box>
              )}

              <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Recent Detections</Typography>
              <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                <AnimatePresence>
                  {detections.map((detection, index) => (
                    <MotionPaper
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      sx={{
                        p: 2,
                        mb: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        backgroundColor: `${detection.color}.light`,
                        border: `1px solid`,
                      }}
                    >
                      {getDetectionIcon(detection.icon)}
                      <Box>
                        <Typography variant="subtitle2" color={`${detection.color}.main`}>
                          {detection.type}
                        </Typography>
                        {detection.gesture_type && (
                          <Typography variant="body2" color="text.primary">
                            Gesture: {detection.gesture_type}
                          </Typography>
                        )}
                        {detection.gesture_description && (
                          <Typography variant="caption" color="text.secondary">
                            {detection.gesture_description}
                          </Typography>
                        )}
                        {detection.male_count !== undefined && detection.female_count !== undefined && (
                          <Typography variant="caption" color="text.secondary">
                            Men: {detection.male_count}, Women: {detection.female_count}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          Time: {detection.timestamp}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Confidence: {(detection.confidence * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                    </MotionPaper>
                  ))}
                </AnimatePresence>
              </Box>
            </CardContent>
          </MotionCard>
        </Grid>
      </Grid>
    </Container>
  );
};

export default VideoMode;
