import bcrypt from "bcryptjs";

export const hashPassowrd = async (password) => {
  const salt = await bcrypt.genSalt(11);
  const hashedPass = await bcrypt.hash(password, salt);
  return hashedPass;
};
