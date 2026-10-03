import bcrypt from "bcryptjs";

export const hashPassowrd = async (password) => {
  const salt = await bcrypt.genSalt(11);
  const hashedPass = await bcrypt.hash(password, salt);
  return hashedPass;
};

export const comparePassword = async (inputPassword, savedPassword) => {
  const isPasswordCorrect = await bcrypt.compare(inputPassword, savedPassword);
  return isPasswordCorrect;
};
