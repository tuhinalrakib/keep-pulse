import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'keepalive_secret_key_2026';

export function verifyJwtToken(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Access denied: No token provided in Authorization header', status: 401 };
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { userId: decoded.userId, email: decoded.email };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return { error: 'Session expired: Please log in again', status: 401 };
    }
    return { error: 'Unauthorized: Invalid authentication token', status: 401 };
  }
}
