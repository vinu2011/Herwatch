import React from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import {
  TrendingUp,
  Person,
  Warning,
  LocationOn,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const MotionPaper = motion(Paper);
const MotionCard = motion(Card);

const Dashboard = () => {
  // Sample data for the chart
  const chartData = {
    labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    datasets: [
      {
        label: 'Detections',
        data: [12, 19, 3, 5, 2, 3, 15],
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Weekly Detection Trends',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const stats = [
    {
      title: 'Total Detections',
      value: '150',
      icon: <TrendingUp sx={{ fontSize: 40, color: 'primary.main' }} />,
      color: '#1a237e',
    },
    {
      title: 'People Detected',
      value: '89',
      icon: <Person sx={{ fontSize: 40, color: 'info.main' }} />,
      color: '#0288d1',
    },
    {
      title: 'Alerts Generated',
      value: '23',
      icon: <Warning sx={{ fontSize: 40, color: 'error.main' }} />,
      color: '#d32f2f',
    },
    {
      title: 'High Risk Areas',
      value: '5',
      icon: <LocationOn sx={{ fontSize: 40, color: 'warning.main' }} />,
      color: '#ed6c02',
    },
  ];

  const recentActivity = [
    { type: 'SOS Gesture Detected', location: 'Camera 1', time: '2 minutes ago' },
    { type: 'Person Detected', location: 'Camera 2', time: '5 minutes ago' },
    { type: 'Alert Generated', location: 'Camera 1', time: '10 minutes ago' },
    { type: 'New Hotspot Identified', location: 'Zone B', time: '15 minutes ago' },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Statistics Cards */}
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <MotionCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              sx={{ height: '100%' }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  {stat.icon}
                  <Typography variant="h4" component="div" sx={{ color: stat.color }}>
                    {stat.value}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {stat.title}
                </Typography>
              </CardContent>
            </MotionCard>
          </Grid>
        ))}

        {/* Chart */}
        <Grid item xs={12} md={8}>
          <MotionPaper
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            sx={{ p: 2 }}
          >
            <Line data={chartData} options={chartOptions} />
          </MotionPaper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={4}>
          <MotionPaper
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            sx={{ p: 2 }}
          >
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Box sx={{ mt: 2 }}>
              {recentActivity.map((activity, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 1,
                    mb: 1,
                    borderRadius: 1,
                    bgcolor: 'background.default',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Typography variant="subtitle2">{activity.type}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {activity.location} - {activity.time}
                  </Typography>
                </Box>
              ))}
            </Box>
          </MotionPaper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard; 