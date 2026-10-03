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
