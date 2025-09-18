function authorizeRole(...allowedRoles) {
  return (req, res, next) => {
    const user = req.user; 

    if (!user) {
      return res.status(401).json({ message: "Unauthorized: No user found" });
    }


    console.log(`Current user role: ${user.role}`);

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: `Forbidden: You don't have access. Required roles: ${allowedRoles.join(', ')}` });
    }

    next(); 
  };
}

module.exports = authorizeRole;
