const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Base Information / Health Check
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Task Manager REST API',
    version: '1.0.0',
    status: 'healthy',
    documentation: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/me'
      },
      tasks: {
        create: 'POST /api/tasks',
        list: 'GET /api/tasks',
        getById: 'GET /api/tasks/:id',
        update: 'PUT /api/tasks/:id',
        partialUpdate: 'PATCH /api/tasks/:id',
        delete: 'DELETE /api/tasks/:id'
      }
    }
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Catch-all 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    requestedPath: req.originalUrl,
    method: req.method
  });
});

// Centralized Error Handling Middleware (including JSON parse errors)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Malformed JSON payload. Please verify your request body.'
    });
  }

  console.error('Unhandled server error:', err);
  return res.status(500).json({
    error: 'Internal server error. Please try again later.'
  });
});

// Start Server only when executed directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running and listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
