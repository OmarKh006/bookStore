import mongoose from "mongoose";

export const validateObjectId = (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id))
    return res.status(400).json({ message: "Invalid id" });
  next();
};
