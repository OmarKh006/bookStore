import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import type { AuthPayload } from "../types/index.ts";

export const verifyToken: RequestHandler = (req, res, next) => {
  const rawToken = req.headers.token;
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  if (token) {
    try {
      req.user = jwt.verify(
        token,
        process.env.JWT_SECRET as string,
      ) as AuthPayload;
      next();
    } catch {
      res.status(401).json({ message: "Not authenticated" });
    }
  } else {
    res.status(401).json({ message: "Unauthorized action" });
  }
};

export const verifyTokenAndAuthorization: RequestHandler = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user?.id === req.params.id || req.user?.isAdmin) {
      next();
    } else {
      res.status(403).json({ message: "You're not allowed to this action" });
    }
  });
};

export const verifyTokenAndAdmin: RequestHandler = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user?.isAdmin) {
      next();
    } else {
      res.status(403).json({ message: "You're not allowed to this action" });
    }
  });
};
