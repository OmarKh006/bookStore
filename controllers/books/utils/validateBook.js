import Joi from "joi";

const validateBook = (obj) => {
  const schema = Joi.object({
    title: Joi.string().trim().min(3).max(250).required(),
    author: Joi.string().hex().length(24).required(),
    description: Joi.string().trim().min(5).required(),
    price: Joi.number().min(0).required(),
    cover: Joi.string().valid("soft cover", "hard cover").required(),
  });

  return schema.validate(obj);
};

const validateUpdateBook = (obj) => {
  const schema = Joi.object({
    title: Joi.string().trim().min(3).max(250),
    author: Joi.string().hex().length(24),
    description: Joi.string().trim().min(5),
    price: Joi.number().min(0),
    cover: Joi.string().valid("soft cover", "hard cover"),
  });

  return schema.validate(obj);
};

const validateFilterBooksQuery = (obj) => {
  const schema = Joi.object({
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number()
      .min(0)
      .when("minPrice", {
        is: Joi.exist(),
        then: Joi.number().min(Joi.ref("minPrice")),
      }),
    pageNumber: Joi.number().integer().min(1),
  });

  return schema.validate(obj);
};

export { validateBook, validateUpdateBook, validateFilterBooksQuery };
