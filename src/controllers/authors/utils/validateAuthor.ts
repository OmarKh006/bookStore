import Joi from "joi";

export interface AuthorInput {
  firstName: string;
  lastName: string;
  nationality: string;
  image?: string;
}

export interface PageQuery {
  pageNumber: number;
  limit: number;
}

const validateAuthor = (obj: unknown) => {
  const schema = Joi.object<AuthorInput>({
    firstName: Joi.string().trim().min(3).max(15).required(),
    lastName: Joi.string().trim().min(3).max(15).required(),
    nationality: Joi.string().trim().min(3).max(25).required(),
    image: Joi.string().trim().min(5).max(100),
  });
  return schema.validate(obj);
};

const validateUpdateAuthor = (obj: unknown) => {
  const schema = Joi.object<Partial<AuthorInput>>({
    firstName: Joi.string().trim().min(3).max(15),
    lastName: Joi.string().trim().min(3).max(15),
    nationality: Joi.string().trim().min(3).max(25),
    image: Joi.string().trim().min(5).max(100),
  });
  return schema.validate(obj);
};

const validatePageQuery = (obj: unknown) => {
  const schema = Joi.object<PageQuery>({
    pageNumber: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(12),
  });
  return schema.validate(obj);
};

export { validateAuthor, validateUpdateAuthor, validatePageQuery };
