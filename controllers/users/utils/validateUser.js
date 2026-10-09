import Joi from "joi";

export const validateUserRegister = (obj) => {
  const schema = Joi.object({
    email: Joi.string()
      .trim()
      .min(5)
      .max(100)
      .email({ tlds: { allow: false } })
      .required(),
    username: Joi.string().trim().min(2).max(200).required(),
    password: Joi.string().trim().min(6).required(),
  });

  return schema.validate(obj);
};

export const validateUserLogin = (obj) => {
  const schema = Joi.object({
    email: Joi.string()
      .trim()
      .min(5)
      .max(100)
      .email({ tlds: { allow: false } })
      .required(),
    password: Joi.string().trim().min(6).required(),
  });

  return schema.validate(obj);
};

export const validateUserUpdate = (obj) => {
  const schema = Joi.object({
    email: Joi.string()
      .trim()
      .min(5)
      .max(100)
      .email({ tlds: { allow: false } }),
    username: Joi.string().trim().min(2).max(200),
    password: Joi.string().trim().min(6),
  });

  return schema.validate(obj);
};

export const validateResetPassword = (obj) => {
  const schema = Joi.object({
    password: Joi.string().trim().min(6).required(),
  });

  return schema.validate(obj);
};
