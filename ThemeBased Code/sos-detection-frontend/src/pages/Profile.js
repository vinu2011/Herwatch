import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Avatar,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { motion } from 'framer-motion';

const MotionPaper = motion(Paper);
const MotionCard = motion(Card);

const Profile = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Profile Overview */}
        <Grid item xs={12} md={4}>
          <MotionPaper
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            elevation={3}
            sx={{ p: 3, textAlign: 'center' }}
          >
            <Avatar
              sx={{
                width: 120,
                height: 120,
                margin: '0 auto 16px',
                backgroundColor: 'primary.main',
              }}
            >
              U
            </Avatar>
            <Typography variant="h5" gutterBottom>
              User Name
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              user@example.com
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Member since: January 2024
            </Typography>
          </MotionPaper>
        </Grid>

        {/* Statistics */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <MotionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Detection Statistics
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Detections: 150
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      SOS Gestures: 25
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Alerts Generated: 30
                    </Typography>
                  </Box>
                </CardContent>
              </MotionCard>
            </Grid>
            <Grid item xs={12} sm={6}>
              <MotionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Activity Summary
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Last Active: 2 hours ago
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Videos Analyzed: 45
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Live Sessions: 20
                    </Typography>
                  </Box>
                </CardContent>
              </MotionCard>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Profile; 