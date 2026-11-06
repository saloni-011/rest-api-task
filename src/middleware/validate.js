const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required and cannot be empty.' });
  }

  if (name.trim().length < 2) {
    return res.status(400).json({ error: 'Name must be at least 2 characters long.' });
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body || {};

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ error: 'Password is required.' });
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

const validateCreateTask = (req, res, next) => {
  const { title, description, status } = req.body || {};

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'Title is required and cannot be empty.' });
  }

  if (title.trim().length > 200) {
    return res.status(400).json({ error: 'Title cannot exceed 200 characters.' });
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    return res.status(400).json({ error: 'Description must be a text string.' });
  }

  if (status !== undefined) {
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status '${status}'. Allowed values: ${ALLOWED_STATUSES.join(', ')}.`
      });
    }
  }

  req.body.title = title.trim();
  if (description) req.body.description = description.trim();
  next();
};

const validateUpdateTask = (req, res, next) => {
  const { title, description, status } = req.body || {};

  if (title === undefined && description === undefined && status === undefined) {
    return res.status(400).json({
      error: 'At least one field (title, description, or status) must be provided to update.'
    });
  }

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title cannot be empty.' });
    }
    if (title.trim().length > 200) {
      return res.status(400).json({ error: 'Title cannot exceed 200 characters.' });
    }
    req.body.title = title.trim();
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    return res.status(400).json({ error: 'Description must be a text string.' });
  }
  if (typeof description === 'string') {
    req.body.description = description.trim();
  }

  if (status !== undefined) {
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status '${status}'. Allowed values: ${ALLOWED_STATUSES.join(', ')}.`
      });
    }
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateCreateTask,
  validateUpdateTask,
  ALLOWED_STATUSES
};
