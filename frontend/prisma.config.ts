import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

dotenv.config();

export default defineConfig({
  datasource: {
    url: env("DATABASE_URL"),
  },
});
