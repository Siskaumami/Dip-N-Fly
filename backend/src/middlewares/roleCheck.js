// backend/src/middlewares/roleCheck.js

export function requireRole(...rolesAllowed) {
  return (req, res, next) => {
    // requireAuth harusnya sudah set req.user
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const role = req.user.role;
    if (!rolesAllowed.includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}
