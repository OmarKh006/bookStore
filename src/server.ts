import dotenv from "dotenv";
import { createApp } from "./app.ts";
import connectToDB from "./config/connectToDB.ts";
import { getMissingEnvVars } from "./config/env.ts";

dotenv.config();

const missing = getMissingEnvVars();
if (missing.length > 0) {
  console.error("missing variables : ", missing.join(", "));
  process.exit(1);
}

await connectToDB();

const app = createApp();
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV || "development"} mode at http://localhost:${PORT}`,
  );
});
