import Joi from "joi";

const validateAuthor = (obj) => {
  const schema = Joi.object({
    firstName: Joi.string().trim().min(3).max(15).required(),
    lastName: Joi.string().trim().min(3).max(15).required(),
    nationality: Joi.string().trim().min(3).max(25).required(),
    image: Joi.string().trim().min(5).max(100),
  });

  return schema.validate(obj);
};

const validateUpdateAuthor = (obj) => {
  const schema = Joi.object({
    firstName: Joi.string().trim().min(3).max(15),
    lastName: Joi.string().trim().min(3).max(15),
    nationality: Joi.string().trim().min(3).max(25),
    image: Joi.string().trim().min(5).max(100),
  });

  return schema.validate(obj);
};

const validatePageQuery = (obj) =>
  Joi.object({
    pageNumber: Joi.number().integer().min(1).default(1),
  }).validate(obj);

export { validateAuthor, validateUpdateAuthor, validatePageQuery };
