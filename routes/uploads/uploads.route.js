import express from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs/promises";
import { fileTypeFromBuffer } from "file-type";
import { verifyTokenAndAdmin } from "../../middleware/verifyToken.js";

const __dirname = import.meta.dirname;
const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "../../images");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

class UploadError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const upload = multer({
  // Keep the file in memory until it's verified, so invalid files never touch disk
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },

  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_TYPES[file.mimetype] || !ALLOWED_EXTENSIONS.has(ext)) {
      return cb(
        new UploadError("Only JPEG, PNG, WebP and GIF images are allowed", 415),
      );
    }
    cb(null, true);
  },
});

const handleUpload = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024} MB)`,
        });
      }
      // LIMIT_UNEXPECTED_FILE = wrong field name or too many files
      return res.status(400).json({ error: err.message });
    }
    if (err instanceof UploadError) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  });
};

const verifyImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ error: 'No file uploaded (field name must be "image")' });
    }

    const detected = await fileTypeFromBuffer(req.file.buffer);
    if (!detected || !ALLOWED_TYPES[detected.mime]) {
      return res
        .status(415)
        .json({ error: "File content is not a valid supported image" });
    }

    req.file.detectedMime = detected.mime;
    next();
  } catch (err) {
    next(err);
  }
};

router.post(
  "/",
  verifyTokenAndAdmin,
  handleUpload,
  verifyImage,
  async (req, res, next) => {
    try {
      const filename = `${crypto.randomUUID()}${ALLOWED_TYPES[req.file.detectedMime]}`;

      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      await fs.writeFile(path.join(UPLOAD_DIR, filename), req.file.buffer, {
        flag: "wx",
      });

      res.status(201).json({
        message: "image uploaded successfully",
        filename,
        size: req.file.size,
        mimetype: req.file.detectedMime,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
