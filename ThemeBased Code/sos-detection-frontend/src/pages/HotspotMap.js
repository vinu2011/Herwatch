import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  useTheme,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
} from '@mui/material';
import { LocationOn, Warning, Security, MyLocation, WomanOutlined, Shield } from '@mui/icons-material';
import { motion } from 'framer-motion';

const MotionCard = motion(Card);
const MotionPaper = motion(Paper);

const API_BASE_URL = 'http://localhost:5000'; // Can be changed based on environment

const HotspotMap = () => {
  const theme = useTheme();
  const [location, setLocation] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showLocationDialog, setShowLocationDialog] = useState(true);
  const [hotspots, setHotspots] = useState([]);
  const [mapUrl, setMapUrl] = useState(null);
  const [apiStatus, setApiStatus] = useState('unknown');

  useEffect(() => {
    // Check if API is running
    const checkApiStatus = async () => {
      try {
        console.log(`Checking API status at ${API_BASE_URL}/api/health`);
        const response = await fetch(`${API_BASE_URL}/api/health`);
        console.log('API health check response:', response.status);
        if (response.ok) {
          setApiStatus('running');
          console.log('API is running');
        } else {
          setApiStatus('error');
          console.error('API health check failed with status:', response.status);
        }
      } catch (err) {
        console.error('API health check failed:', err);
        setApiStatus('error');
      }
    };
    
    checkApiStatus();
    
    // Set up a periodic check every 30 seconds
    const intervalId = setInterval(checkApiStatus, 30000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  const handleLocationSubmit = async () => {
    if (!location && !currentLocation) {
      setError('Please enter a location or use current location');
      return;
    }

    if (apiStatus !== 'running') {
      setError('API server is not running. Please check your backend connection.');
      return;
    }

    setLoading(true);
    setError(null);
    setMapUrl(null);
    setHotspots([]);

    try {
      const response = await fetch(`${API_BASE_URL}/api/hotspots/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: location,
          use_current_location: !!currentLocation,
          current_location: currentLocation
        }),
      });

      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze hotspots');
      }

      if (!data.hotspots) {
        throw new Error('No hotspot data received');
      }

      setHotspots(data.hotspots);
      setMapUrl(`${API_BASE_URL}${data.map_url}`);
      setShowLocationDialog(false);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Failed to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    setLoading(true);
    setError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocation('');
          setLoading(false);
        },
        (error) => {
          setError('Error getting current location: ' + error.message);
          setLoading(false);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
    }
  };

  const reopenLocationDialog = () => {
    setShowLocationDialog(true);
  };

  // Location Dialog
  const LocationDialog = () => (
    <Dialog 
      open={showLocationDialog} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
        }
      }}
    >
      <DialogTitle sx={{ 
        textAlign: 'center', 
        fontWeight: 600,
        background: theme.palette.primary.main,
        color: 'white',
        py: 2
      }}>
        Select Location
      </DialogTitle>
      <DialogContent sx={{ mt: 2, p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {apiStatus === 'error' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Cannot connect to the API server. Please make sure the backend is running.
          </Alert>
        )}
        <TextField
          fullWidth
          label="Enter Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={loading || !!currentLocation}
          sx={{ mb: 2 }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          - OR -
        </Typography>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<MyLocation />}
          onClick={getCurrentLocation}
          disabled={loading}
          sx={{ mb: 2 }}
        >
          Use Current Location
        </Button>
        {currentLocation && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Current location obtained: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button
          fullWidth
          variant="contained"
          onClick={handleLocationSubmit}
          disabled={loading || (!location && !currentLocation) || apiStatus === 'error'}
          sx={{ py: 1 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Analyze Safety'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.05))',
      pt: 4,
      pb: 4,
    }}>
      <Container maxWidth="lg">
        {/* API Status Indicator */}
        {apiStatus === 'error' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Cannot connect to the API server. Please make sure the backend is running at {API_BASE_URL}.
          </Alert>
        )}
        
        {/* Enhanced Header Section */}
        <MotionPaper
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          sx={{
            p: 4,
            mb: 4,
            background: `linear-gradient(135deg, rgba(25, 25, 112, 0.95) 0%, rgba(138, 43, 226, 0.9) 100%)`,
            backgroundImage: `linear-gradient(135deg, rgba(25, 25, 112, 0.95) 0%, rgba(138, 43, 226, 0.9) 100%), url('/images/safety-bg.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: 'white',
            borderRadius: 3,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(156, 39, 176, 0.3)',
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ 
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 30px rgba(255,255,255,0.2)',
              border: '2px solid rgba(255,255,255,0.2)',
            }}>
              <WomanOutlined sx={{ fontSize: 60, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
            </Box>
            <Box>
              <Typography variant="h2" component="h1" sx={{ 
                fontWeight: 800,
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                mb: 1,
                background: 'linear-gradient(to right, #fff, #f0f0f0)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              }}>
                HerWatch
              </Typography>
              <Typography variant="h4" sx={{ 
                fontWeight: 600,
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                mb: 2,
                color: '#f0f0f0',
              }}>
                Safety Map & Risk Analysis
              </Typography>
              <Typography variant="h6" sx={{ 
                opacity: 0.95,
                maxWidth: 600,
                lineHeight: 1.4,
                textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
              }}>
                Empowering women with real-time safety information and location-based risk awareness
              </Typography>
            </Box>
          </Box>

          {/* Stats Section */}
          <Box sx={{ mt: 4, display: 'flex', gap: 3 }}>
            <Box sx={{ 
              flex: 1,
              p: 2,
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 4px 30px rgba(0,0,0,0.1)',
            }}>
              <Shield sx={{ 
                fontSize: 40,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
              }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Safety First</Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>Real-time risk assessment</Typography>
              </Box>
            </Box>
            <Box sx={{ 
              flex: 1,
              p: 2,
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 4px 30px rgba(0,0,0,0.1)',
            }}>
              <LocationOn sx={{ 
                fontSize: 40,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
              }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Location Aware</Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>Precise area analysis</Typography>
              </Box>
            </Box>
          </Box>
        </MotionPaper>

        <Grid container spacing={3}>
          {/* Map Section with Enhanced Styling */}
          <Grid item xs={12} md={8}>
            <MotionCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              sx={{ 
                height: '100%',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                borderRadius: 3,
                background: 'white',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <CardContent sx={{ p: 0, height: '100%' }}>
                <Box
                  sx={{
                    height: 500,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {mapUrl ? (
                    <iframe
                      src={mapUrl}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                      }}
                      title="Safety Map"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  ) : (
                    <Box
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: theme.palette.grey[100],
                      }}
                    >
                      <LocationOn sx={{ fontSize: 60, color: theme.palette.grey[400], mb: 2 }} />
                      <Typography variant="h6" color="textSecondary">
                        Select a location to view the safety map
                      </Typography>
                      {!showLocationDialog && (
                        <Button 
                          variant="outlined" 
                          onClick={reopenLocationDialog} 
                          sx={{ mt: 2 }}
                        >
                          Change Location
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>
              </CardContent>
            </MotionCard>
          </Grid>

          {/* Hotspot List */}
          <Grid item xs={12} md={4}>
            <Box sx={{ position: 'sticky', top: 20 }}>
              <Typography variant="h6" gutterBottom sx={{ 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: theme.palette.primary.dark,
                background: 'white',
                p: 2,
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}>
                <Warning />
                Risk Assessment Areas
              </Typography>
              {hotspots.length > 0 ? (
                hotspots.map((hotspot, index) => (
                  <MotionCard
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    sx={{ 
                      mb: 2,
                      borderLeft: 6,
                      borderColor: hotspot.TOTAL_CRIMES > 100 ? 'error.main' : 
                                  hotspot.TOTAL_CRIMES > 50 ? 'warning.main' : 'success.main',
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <LocationOn sx={{ color: 'primary.main', mr: 1 }} />
                        <Typography variant="h6" component="h3">
                          {hotspot.DISTRICT}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {hotspot['STATE/UT']}
                      </Typography>
                      <Box sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        mb: 1,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'rgba(0,0,0,0.03)',
                      }}>
                        <Warning
                          sx={{
                            color: hotspot.TOTAL_CRIMES > 100 ? 'error.main' : 
                                  hotspot.TOTAL_CRIMES > 50 ? 'warning.main' : 'success.main',
                            mr: 1,
                          }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          Risk Level: {
                            hotspot.TOTAL_CRIMES > 100 ? 'High' :
                            hotspot.TOTAL_CRIMES > 50 ? 'Medium' : 'Low'
                          }
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Reported Cases: {hotspot.TOTAL_CRIMES}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {hotspot.distance.toFixed(2)} km away
                        </Typography>
                      </Box>
                    </CardContent>
                  </MotionCard>
                ))
              ) : (
                <MotionPaper
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  sx={{ 
                    p: 3,
                    textAlign: 'center',
                    bgcolor: 'rgba(0,0,0,0.02)',
                    borderRadius: 2,
                  }}
                >
                  <Security sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
                  <Typography variant="body1" sx={{ mt: 2 }}>
                    {mapUrl ? "No risk areas found nearby" : "Select a location to view safety analysis"}
                  </Typography>
                  {!showLocationDialog && !mapUrl && (
                    <Button 
                      variant="outlined" 
                      onClick={reopenLocationDialog} 
                      sx={{ mt: 2 }}
                    >
                      Select Location
                    </Button>
                  )}
                </MotionPaper>
              )}
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Location Selection Dialog */}
      <LocationDialog />
    </Box>
  );
};

export default HotspotMap;