const app = require('./app');
require('dotenv').config();

// Default to 8000 to match frontend API base URL
const PORT = process.env.PORT || 8000;

const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║  🚀 Server berjalan di port ${PORT}        ║
║  📍 http://localhost:${PORT}              ║
║  🔥 Firestore: Connected             ║
╚══════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = server;
