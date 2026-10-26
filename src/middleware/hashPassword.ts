import bcrypt from "bcryptjs";

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(11);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (
  inputPassword: string,
  savedPassword: string,
): Promise<boolean> => bcrypt.compare(inputPassword, savedPassword);
