import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Security,
  TrendingUp,
  Psychology,
  Engineering,
  LocationOn,
  Visibility,
  Speed,
  EmojiPeople,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const MotionPaper = motion(Paper);

const About = () => {
  const statistics = [
    { icon: <Visibility />, value: '98%', label: 'Detection Accuracy' },
    { icon: <Speed />, value: '0.5s', label: 'Response Time' },
    { icon: <LocationOn />, value: '1000+', label: 'Areas Monitored' },
    { icon: <EmojiPeople />, value: '50k+', label: 'Women Protected' },
  ];

  const features = [
    {
      title: 'Real-time Threat Detection',
      description: 'Advanced AI algorithms process video feeds in real-time to identify potential threats and suspicious behavior.',
      icon: <Security />,
    },
    {
      title: 'Predictive Analytics',
      description: 'Machine learning models analyze historical data to predict high-risk areas and time periods.',
      icon: <TrendingUp />,
    },
    {
      title: 'Behavioral Analysis',
      description: 'Sophisticated pattern recognition to identify suspicious activities and potential threats.',
      icon: <Psychology />,
    },
    {
      title: 'Technical Implementation',
      description: 'Built using React, Python Flask, TensorFlow, and advanced computer vision algorithms.',
      icon: <Engineering />,
    },
  ];

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.05))',
      py: 6,
    }}>
      <Container maxWidth="lg">
        {/* Header Section */}
        <MotionPaper
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          sx={{
            p: 4,
            mb: 6,
            background: 'linear-gradient(135deg, rgba(25, 25, 112, 0.95) 0%, rgba(138, 43, 226, 0.9) 100%)',
            color: 'white',
            borderRadius: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="h2" component="h1" sx={{ 
            fontWeight: 800,
            mb: 2,
            background: 'linear-gradient(to right, #fff, #f0f0f0)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
          }}>
            About HerWatch
          </Typography>
          <Typography variant="h5" sx={{ mb: 3, maxWidth: 800, mx: 'auto', lineHeight: 1.6 }}>
            Empowering women through technology and innovation. Our mission is to create safer spaces using advanced AI and real-time monitoring.
          </Typography>
        </MotionPaper>

        {/* Statistics Grid */}
        <Grid container spacing={3} sx={{ mb: 6 }}>
          {statistics.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <MotionPaper
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                sx={{ 
                  p: 3,
                  textAlign: 'center',
                  height: '100%',
                  background: 'white',
                  borderRadius: 2,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                }}
              >
                <Box sx={{ color: 'primary.main', mb: 2 }}>
                  {stat.icon}
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  {stat.value}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  {stat.label}
                </Typography>
              </MotionPaper>
            </Grid>
          ))}
        </Grid>

        {/* Features Section */}
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <MotionPaper
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              sx={{ p: 4, height: '100%', borderRadius: 2 }}
            >
              <Typography variant="h4" sx={{ mb: 4, fontWeight: 700, color: 'primary.main' }}>
                How We Keep Women Safe
              </Typography>
              <List>
                {features.map((feature, index) => (
                  <React.Fragment key={index}>
                    <ListItem sx={{ py: 2 }}>
                      <ListItemIcon sx={{ color: 'primary.main' }}>
                        {feature.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="h6" sx={{ mb: 1 }}>
                            {feature.title}
                          </Typography>
                        }
                        secondary={feature.description}
                      />
                    </ListItem>
                    {index < features.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </MotionPaper>
          </Grid>
          <Grid item xs={12} md={6}>
            <MotionPaper
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              sx={{ p: 4, height: '100%', borderRadius: 2 }}
            >
              <Typography variant="h4" sx={{ mb: 4, fontWeight: 700, color: 'primary.main' }}>
                Our Impact
              </Typography>
              <Typography variant="body1" paragraph>
                HerWatch is more than just a security system - it's a commitment to creating safer spaces for women. Our AI-powered platform has been deployed across multiple cities, helping law enforcement and security teams respond faster to potential threats.
              </Typography>
              <Typography variant="body1" paragraph>
                Using advanced machine learning algorithms and real-time video analysis, we can detect suspicious behavior and alert authorities within seconds. Our system has already helped prevent numerous incidents and has become an essential tool in urban safety infrastructure.
              </Typography>
              <Typography variant="body1" paragraph>
                The project combines expertise in:
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Security sx={{ color: 'primary.main' }} />
                  </ListItemIcon>
                  <ListItemText primary="Advanced AI and Computer Vision" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Speed sx={{ color: 'primary.main' }} />
                  </ListItemIcon>
                  <ListItemText primary="Real-time Processing and Alerts" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <LocationOn sx={{ color: 'primary.main' }} />
                  </ListItemIcon>
                  <ListItemText primary="Geographic Information Systems" />
                </ListItem>
              </List>
            </MotionPaper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default About; 