const express = require('express');
const prisma = require('../utils/prisma');
const authenticateToken = require('../middleware/auth');
const { validateCreateTask, validateUpdateTask, ALLOWED_STATUSES } = require('../middleware/validate');

const router = express.Router();

// All task routes require authentication
router.use(authenticateToken);

// Helper to validate and parse ID parameter
const parseTaskId = (param) => {
  const id = parseInt(param, 10);
  if (isNaN(id) || id <= 0) {
    return null;
  }
  return id;
};

// POST /api/tasks (Create a new task)
router.post('/', validateCreateTask, async (req, res) => {
  try {
    const { title, description, status } = req.body;

    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        status: status || 'PENDING',
        userId: req.user.userId
      }
    });

    return res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ error: 'Failed to create task.' });
  }
});

// GET /api/tasks (List all tasks for authenticated user, with optional filtering)
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;

    const whereClause = {
      userId: req.user.userId
    };

    if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          error: `Invalid status filter '${status}'. Allowed values: ${ALLOWED_STATUSES.join(', ')}.`
        });
      }
      whereClause.status = status;
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      whereClause.OR = [
        { title: { contains: search.trim() } },
        { description: { contains: search.trim() } }
      ];
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      count: tasks.length,
      tasks
    });
  } catch (error) {
    console.error('Fetch tasks error:', error);
    return res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

// GET /api/tasks/:id (Get task by ID)
router.get('/:id', async (req, res) => {
  try {
    const taskId = parseTaskId(req.params.id);
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID must be a valid positive integer.' });
    }

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: req.user.userId
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    return res.status(200).json(task);
  } catch (error) {
    console.error('Fetch task by ID error:', error);
    return res.status(500).json({ error: 'Failed to fetch task.' });
  }
});

// PUT /api/tasks/:id (Update task)
router.put('/:id', validateUpdateTask, async (req, res) => {
  try {
    const taskId = parseTaskId(req.params.id);
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID must be a valid positive integer.' });
    }

    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: req.user.userId
      }
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const { title, description, status } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData
    });

    return res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({ error: 'Failed to update task.' });
  }
});

// PATCH /api/tasks/:id (Partial update task - convenience alias to same logic)
router.patch('/:id', validateUpdateTask, async (req, res) => {
  try {
    const taskId = parseTaskId(req.params.id);
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID must be a valid positive integer.' });
    }

    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: req.user.userId
      }
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const { title, description, status } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData
    });

    return res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Patch task error:', error);
    return res.status(500).json({ error: 'Failed to update task.' });
  }
});

// DELETE /api/tasks/:id (Delete task)
router.delete('/:id', async (req, res) => {
  try {
    const taskId = parseTaskId(req.params.id);
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID must be a valid positive integer.' });
    }

    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: req.user.userId
      }
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    await prisma.task.delete({
      where: { id: taskId }
    });

    return res.status(200).json({
      message: 'Task deleted successfully.',
      deletedTaskId: taskId
    });
  } catch (error) {
    console.error('Delete task error:', error);
    return res.status(500).json({ error: 'Failed to delete task.' });
  }
});

module.exports = router;
