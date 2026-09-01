// server/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const dns = require('dns');
require('dotenv').config();

if (dns.getServers().every((server) => server === '127.0.0.1' || server === '::1')) {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
}

// Log startup configuration
console.log('Server starting with configuration:', {
  nodeEnv: process.env.NODE_ENV,
  adminEmail: process.env.ADMIN_EMAIL ? 'Set' : 'Missing',
  mongoUri: process.env.MONGO_URI ? 'Set' : 'Missing',
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL ? 'Set' : 'Using default'
});

const app = express();
const server = http.createServer(app);

// Socket.io setup with production settings
const io = require('socket.io')(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL,
      'https://silentauctionapp-4ca96.web.app',
      'http://localhost:3000'
    ],
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true,
    transports: ['websocket', 'polling']
  }
});

// Store socket.io instance
app.set('socketio', io);

// Enhanced CORS for Render deployment
app.use(cors({
  origin: [
    process.env.CLIENT_URL,
    'https://silentauctionapp-4ca96.web.app',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection with retry logic
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

connectDB();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected via socket:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Routes
const itemRoutes = require('./routes/items');
app.use('/api/items', itemRoutes);

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    message: "Internal server error",
    error: process.env.NODE_ENV === 'production' ? null : err.message
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
