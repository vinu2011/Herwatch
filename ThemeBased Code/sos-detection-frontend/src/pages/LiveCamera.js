import React, { useState, useRef, useEffect } from 'react';
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Camera as CameraIcon,
  Warning,
  Woman,
  Gesture,
  Group,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const MotionCard = motion(Card);
const MotionPaper = motion(Paper);

const LiveCamera = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [detections, setDetections] = useState([]);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(0);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const wsRef = useRef(null);
  const frameIntervalRef = useRef(null);

  useEffect(() => {
    fetchAvailableCameras();
    return () => {
      stopCamera();
    };
  }, []);

  const fetchAvailableCameras = async () => {
    try {
      console.log('Fetching available cameras...');
      const response = await fetch('http://localhost:5000/api/live-camera/list');
      const data = await response.json();
      console.log('Available cameras:', data);
      
      if (data.cameras && Array.isArray(data.cameras)) {
        setAvailableCameras(data.cameras);
        if (data.cameras.length > 0) {
          setSelectedCamera(data.cameras[0]);
        }
      } else {
        console.error('Invalid camera data received:', data);
        setError('Could not fetch available cameras');
      }
    } catch (err) {
      console.error('Error fetching cameras:', err);
      setError('Could not fetch available cameras');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    setIsCameraActive(false);
    setIsAnalyzing(false);
  };

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      console.log('Starting camera with device ID:', selectedCamera);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            resolve();
          };
        });
      }
      setIsCameraActive(true);
      setError(null);
      console.log('Camera started successfully');
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Could not access camera. Please ensure camera permissions are granted.');
      setIsCameraActive(false);
    }
  };

  const analyzeLiveCamera = async () => {
    if (!isCameraActive) {
      setError('Please start the camera first');
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);
    setDetections([]);
    setAnalysisResults(null);
    setError(null);

    try {
      // Initialize WebSocket connection
      wsRef.current = new WebSocket('ws://localhost:5000/ws/camera');
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connection established');
        // Start sending frames
        frameIntervalRef.current = setInterval(() => {
          if (videoRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0);
            canvas.toBlob((blob) => {
              wsRef.current.send(blob);
            }, 'image/jpeg', 0.8);
          }
        }, 100); // Send frame every 100ms
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'detection') {
          setDetections(prev => [{
            ...data.detection,
            timestamp: new Date().toISOString()
          }, ...prev].slice(0, 50)); // Keep last 50 detections
          
          // Update progress
          setProgress(prev => Math.min(prev + 1, 100));
        } else if (data.type === 'analysis_complete') {
          setAnalysisResults({
            totalFrames: data.totalFrames,
            sosDetections: data.sosDetections,
            loneWomanDetections: data.loneWomanDetections,
            moreMenDetections: data.moreMenDetections,
            detectionRate: data.detectionRate
          });
          setIsAnalyzing(false);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error occurred');
        stopCamera();
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket connection closed');
        if (frameIntervalRef.current) {
          clearInterval(frameIntervalRef.current);
          frameIntervalRef.current = null;
        }
        setIsAnalyzing(false);
      };

    } catch (err) {
      console.error('Error during live camera analysis:', err);
      setError(err.message || 'An unknown error occurred during live camera analysis. Please try again.');
      stopCamera();
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
                  autoPlay
                  playsInline
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
              <Typography variant="h5" sx={{ mb: 3 }}>Live Camera Analysis</Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Camera</InputLabel>
                <Select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  disabled={isCameraActive}
                >
                  {availableCameras.map((index) => (
                    <MenuItem key={index} value={index}>
                      Camera {index}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="contained"
                startIcon={<CameraIcon />}
                onClick={startCamera}
                fullWidth
                sx={{ mb: 2 }}
                disabled={isAnalyzing}
              >
                Start Camera
              </Button>
                <Button
                  variant="contained"
                color="primary"
                onClick={analyzeLiveCamera}
                disabled={!isCameraActive || isAnalyzing}
                  fullWidth
                sx={{ mb: 2 }}
                >
                {isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
                </Button>
                <Button
                  variant="outlined"
                color="secondary"
                onClick={stopCamera}
                disabled={!isCameraActive || isAnalyzing}
                fullWidth
              >
                Stop Camera
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

export default LiveCamera; 