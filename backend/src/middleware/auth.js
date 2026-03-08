const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

function auth(required = true) {
  return async (req, res, next) => {
    try {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;

      if (!token) {
        if (!required) return next();
        return res.status(401).json({ message: 'Authentication required' });
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET || 'changeme');
      const user = await User.findById(payload.id);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'Invalid or inactive user' });
      }

      req.user = {
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
      };
      next();
    } catch (err) {
      console.error('Auth error', err);
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = {
  auth,
  requireRole,
};

