import Joi from "joi";

const validateBook = (obj) => {
  const schema = Joi.object({
    title: Joi.string().trim().min(3).max(30).required(),
    author: Joi.string().trim().min(3).max(30).required(),
    description: Joi.string().trim().min(3).max(500).required(),
    price: Joi.number().min(0).required(),
    cover: Joi.string().trim().min(0).max(100).required(),
  });

  return schema.validate(obj);
};

const validateUpdateBook = (obj) => {
  const schema = Joi.object({
    title: Joi.string().trim().min(3).max(30),
    author: Joi.string().trim().min(3).max(30),
    description: Joi.string().trim().min(3).max(500),
    price: Joi.number().min(0),
    cover: Joi.string().trim().min(0).max(100),
  });

  return schema.validate(obj);
};

export { validateBook, validateUpdateBook };
