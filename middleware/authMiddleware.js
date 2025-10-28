const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied' });

  try {
    const JWT_SECRET = "3F9d$g7!aBz#8LpQv&k9XsYw^Rt2GhUe!4JmPqLz1YwQp8RkVs7NxDz2MjFqLtHu"; 
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = authenticate;
