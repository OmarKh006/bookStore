import Joi from "joi";

const email = Joi.string()
  .trim()
  .lowercase()
  .min(5)
  .max(254)
  .email({ tlds: { allow: false } })
  .messages({
    "string.empty": "Email is required",
    "string.email": "Please enter a valid email address",
    "string.min": "Email must be at least {#limit} characters",
    "string.max": "Email must be at most {#limit} characters",
    "any.required": "Email is required",
  });

const strongPassword = Joi.string()
  .min(8)
  .max(72)
  .pattern(/[a-z]/, "lowercase")
  .pattern(/[A-Z]/, "uppercase")
  .pattern(/\d/, "number")
  .pattern(/[^A-Za-z0-9]/, "special")
  .messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least {#limit} characters",
    "string.max": "Password must be at most {#limit} characters",
    "string.pattern.name":
      "Password must contain at least one {#name} character",
    "any.required": "Password is required",
  });

const loginPassword = Joi.string().max(72).required().messages({
  "string.empty": "Password is required",
  "any.required": "Password is required",
});

const username = Joi.string().trim().min(2).max(200);

const options = { abortEarly: false, stripUnknown: true };

export const validateUserRegister = (obj) =>
  Joi.object({
    email: email.required(),
    username: username.required(),
    password: strongPassword.required(),
  }).validate(obj, options);

export const validateUserLogin = (obj) =>
  Joi.object({
    email: email.required(),
    password: loginPassword,
  }).validate(obj, options);

export const validateUserUpdate = (obj) =>
  Joi.object({
    email,
    username,
    password: strongPassword,
  })
    .min(1)
    .validate(obj, options);

export const validateResetPassword = (obj) =>
  Joi.object({
    password: strongPassword.required(),
  }).validate(obj, options);
