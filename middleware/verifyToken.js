import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const token = req.headers.token;
  if (token) {
    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decodedToken;
      next();
    } catch (error) {
      res.status(401).json({ message: "Not authenticated" });
    }
  } else {
    res.status(401).json({ message: "Unauthorized action" });
  }
};

export const verifyTokenAndAuthorization = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.id === req.params.id || req.user.isAdmin) {
      next();
    } else {
      return res
        .status(403)
        .json({ message: "You're not allowed to this action" });
    }
  });
};

export const verifyTokenAndAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.isAdmin) {
      next();
    } else {
      return res
        .status(403)
        .json({ message: "You're not allowed to this action" });
    }
  });
};
