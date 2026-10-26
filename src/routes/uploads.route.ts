import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import express, {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { verifyTokenAndAdmin } from "../middleware/verifyToken.ts";

const router = express.Router();

/** Resolved per request so tests (and deployments) can redirect uploads via UPLOAD_DIR. */
export const getUploadDir = (): string =>
  process.env.UPLOAD_DIR || path.join(import.meta.dirname, "../../images");

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

class UploadError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const upload = multer({
  // Keep the file in memory until it's verified, so invalid files never touch disk
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_TYPES[file.mimetype] || !ALLOWED_EXTENSIONS.has(ext)) {
      cb(
        new UploadError("Only JPEG, PNG, WebP and GIF images are allowed", 415),
      );
      return;
    }
    cb(null, true);
  },
});

const handleUpload: RequestHandler = (req, res, next) => {
  upload.single("image")(req, res, (err: unknown) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({
          error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024} MB)`,
        });
        return;
      }
      // LIMIT_UNEXPECTED_FILE = wrong field name or too many files
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof UploadError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  });
};

const verifyImage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.file) {
      res
        .status(400)
        .json({ error: 'No file uploaded (field name must be "image")' });
      return;
    }

    const detected = await fileTypeFromBuffer(req.file.buffer);
    if (!detected || !ALLOWED_TYPES[detected.mime]) {
      res
        .status(415)
        .json({ error: "File content is not a valid supported image" });
      return;
    }

    (req.file as Express.Multer.File & { detectedMime?: string }).detectedMime =
      detected.mime;
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
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file as Express.Multer.File & { detectedMime: string };
      const filename = `${crypto.randomUUID()}${ALLOWED_TYPES[file.detectedMime]}`;
      const uploadDir = getUploadDir();

      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(path.join(uploadDir, filename), file.buffer, {
        flag: "wx",
      });

      res.status(201).json({
        message: "image uploaded successfully",
        filename,
        size: file.size,
        mimetype: file.detectedMime,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
