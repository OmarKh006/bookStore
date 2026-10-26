import Joi from "joi";
import type { CoverType } from "../../../types/index.ts";

export interface BookInput {
  title: string;
  author: string;
  description: string;
  price: number;
  cover: CoverType;
}

export interface FilterBooksQuery {
  minPrice?: number;
  maxPrice?: number;
  pageNumber: number;
  limit: number;
}

const validateBook = (obj: unknown) => {
  const schema = Joi.object<BookInput>({
    title: Joi.string().trim().min(3).max(250).required(),
    author: Joi.string().hex().length(24).required(),
    description: Joi.string().trim().min(5).required(),
    price: Joi.number().min(0).required(),
    cover: Joi.string().valid("soft cover", "hard cover").required(),
  });
  return schema.validate(obj);
};

const validateUpdateBook = (obj: unknown) => {
  const schema = Joi.object<Partial<BookInput>>({
    title: Joi.string().trim().min(3).max(250),
    author: Joi.string().hex().length(24),
    description: Joi.string().trim().min(5),
    price: Joi.number().min(0),
    cover: Joi.string().valid("soft cover", "hard cover"),
  });
  return schema.validate(obj);
};

const validateFilterBooksQuery = (obj: unknown) => {
  const schema = Joi.object<FilterBooksQuery>({
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number()
      .min(0)
      .when("minPrice", {
        is: Joi.exist(),
        then: Joi.number().min(Joi.ref("minPrice")),
      }),
    pageNumber: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(12),
  });
  return schema.validate(obj);
};

export { validateBook, validateUpdateBook, validateFilterBooksQuery };
