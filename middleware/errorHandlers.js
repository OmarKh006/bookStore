export const notFound = (req, res, next) => {
  const error = new Error(`Not found ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  let status =
    err.status ||
    err.statusCode ||
    (res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message;

  if (err.name === "CastError") {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err.name === "ValidationError" && err.errors) {
    status = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(". ");
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue ?? {})[0];
    message = field ? `${field} already exists` : "Duplicate value";
  }

  if (status >= 500) {
    console.error(err);
    if (process.env.NODE_ENV === "production") {
      message = "Internal server error";
    }
  }

  res.status(status).json({ message });
};
