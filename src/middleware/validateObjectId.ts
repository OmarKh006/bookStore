import type { RequestHandler } from "express";
import mongoose from "mongoose";

export const validateObjectId: RequestHandler = (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  next();
};
