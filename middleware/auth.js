const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'keepalive_secret_key_2026';

/**
 * JWT Authentication & Verification Middleware
 */
function verifyJwt(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied: No token provided in Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired: Please log in again' });
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid authentication token' });
  }
}

module.exports = {
  verifyJwt,
  authMiddleware: verifyJwt
};
