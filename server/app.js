const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const dns = require('dns');

if (process.env.NODE_ENV !== 'test') {
  require('dotenv').config({ quiet: true });
}

function configureDns() {
  if (dns.getServers().every((server) => server === '127.0.0.1' || server === '::1')) {
    dns.setServers(['1.1.1.1', '8.8.8.8']);
  }
}

function getAllowedOrigins() {
  const productionOrigins = [
    process.env.CLIENT_URL,
    ...(process.env.CLIENT_URLS || '').split(','),
  ]
    .map((origin) => origin && origin.trim())
    .filter(Boolean);

  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? productionOrigins
    : [
        ...productionOrigins,
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:8080',
        'http://127.0.0.1:8080',
      ];

  if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
    throw new Error('CLIENT_URL or CLIENT_URLS must be configured in production');
  }

  return allowedOrigins;
}

function createApp() {
  const allowedOrigins = getAllowedOrigins();
  const app = express();

  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const itemRoutes = require('./routes/items');
  app.use('/api/items', itemRoutes);

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
    });
  });

  app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });

  app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'production' ? null : err.message,
    });
  });

  return app;
}

async function connectDB() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI must be configured');
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected successfully');
}

function attachSocket(server, app) {
  const allowedOrigins = getAllowedOrigins();
  const io = require('socket.io')(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      credentials: true,
      transports: ['websocket', 'polling'],
    },
  });

  app.set('socketio', io);

  io.on('connection', (socket) => {
    console.log('Client connected via socket:', socket.id);
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

async function start() {
  configureDns();

  const app = createApp();
  const server = http.createServer(app);
  attachSocket(server, app);

  console.log('Server starting with configuration:', {
    nodeEnv: process.env.NODE_ENV || 'development',
    adminEmail: process.env.ADMIN_EMAIL ? 'Set' : 'Missing',
    mongoUri: process.env.MONGO_URI ? 'Set' : 'Missing',
    port: process.env.PORT || 5000,
    allowedOrigins: getAllowedOrigins().length,
  });

  const connectWithRetry = async () => {
    try {
      await connectDB();
    } catch (err) {
      console.error('MongoDB connection error:', err.message);
      setTimeout(connectWithRetry, 5000);
    }
  };

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });

  connectWithRetry();

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await mongoose.connection.close(false);
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return { app, server };
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
}

module.exports = {
  createApp,
  connectDB,
  attachSocket,
  getAllowedOrigins,
  start,
};
