import React from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Button,
  Card,
  CardContent,
  CardMedia,
  useTheme,
} from '@mui/material';
import {
  Gesture,
  Person,
  LocationOn,
  People,
  Security,
  Speed,
  Support,
  Login,
  HowToReg,
  Videocam as VideocamIcon,
  VideoLibrary as VideoLibraryIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const MotionCard = motion(Card);
const MotionButton = motion(Button);

const Home = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const features = [
    {
      title: 'Live Camera Mode',
      description: 'Monitor real-time video feeds for immediate threat detection',
      icon: <VideocamIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      path: '/live-camera',
    },
    {
      title: 'Video Analysis',
      description: 'Upload and analyze recorded videos for threat detection',
      icon: <VideoLibraryIcon sx={{ fontSize: 40, color: 'info.main' }} />,
      path: '/video-mode',
    },
    {
      title: 'Hotspot Map',
      description: 'View and analyze high-risk areas on an interactive map',
      icon: <LocationOn sx={{ fontSize: 40, color: 'warning.main' }} />,
      path: '/hotspot-map',
    },
    {
      title: 'Security Dashboard',
      description: 'Access comprehensive security analytics and reports',
      icon: <Security sx={{ fontSize: 40, color: 'success.main' }} />,
      path: '/dashboard',
    },
  ];

  const benefits = [
    {
      title: 'Real-time Protection',
      description: 'Instant alerts and notifications for potential threats.',
      icon: <Security />,
    },
    {
      title: 'Fast Response',
      description: 'Quick identification and reporting of emergency situations.',
      icon: <Speed />,
    },
    {
      title: '24/7 Support',
      description: 'Round-the-clock monitoring and assistance.',
      icon: <Support />,
    },
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          py: 8,
          mb: 6,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
                  Safety First, Always
                </Typography>
                <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
                  Advanced AI-powered security system for real-time threat detection and emergency response.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <MotionButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    variant="contained"
                    color="secondary"
                    size="large"
                    onClick={() => navigate('/register')}
                  >
                    Get Started
                  </MotionButton>
                  <MotionButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    variant="outlined"
                    color="inherit"
                    size="large"
                    onClick={() => navigate('/about')}
                  >
                    Learn More
                  </MotionButton>
                </Box>
              </motion.div>
            </Grid>
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Box
                  component="img"
                  src="/images/safety-bg.png"
                  alt="Safety System"
                  sx={{
                    width: '100%',
                    maxWidth: 500,
                    borderRadius: 4,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                  }}
                />
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Typography
          variant="h3"
          component="h2"
          align="center"
          gutterBottom
          sx={{ mb: 6, fontWeight: 600 }}
        >
          Key Features
        </Typography>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <MotionCard
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                sx={{ height: '100%' }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Box
                    sx={{
                      color: theme.palette.primary.main,
                      mb: 2,
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </MotionCard>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Benefits Section */}
      <Box sx={{ bgcolor: 'grey.50', py: 8, mb: 8 }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            component="h2"
            align="center"
            gutterBottom
            sx={{ mb: 6, fontWeight: 600 }}
          >
            Why Choose Us?
          </Typography>
          <Grid container spacing={4}>
            {benefits.map((benefit, index) => (
              <Grid item xs={12} md={4} key={index}>
                <MotionCard
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  sx={{ height: '100%' }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Box
                      sx={{
                        color: theme.palette.primary.main,
                        mb: 2,
                      }}
                    >
                      {benefit.icon}
                    </Box>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {benefit.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {benefit.description}
                    </Typography>
                  </CardContent>
                </MotionCard>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Call to Action */}
      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Box
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
            color: 'white',
            borderRadius: 4,
            p: 6,
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
            Ready to Enhance Your Safety?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            Join thousands of users who trust our system for their security.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              variant="contained"
              color="primary"
              size="large"
              startIcon={<Login />}
              onClick={() => navigate('/login')}
            >
              Login
            </MotionButton>
            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              variant="outlined"
              color="inherit"
              size="large"
              startIcon={<HowToReg />}
              onClick={() => navigate('/register')}
            >
              Register
            </MotionButton>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Home; 