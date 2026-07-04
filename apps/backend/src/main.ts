import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { config } from "dotenv";

import { AppModule } from "./app.module";
import { validateEnv } from "./env";
import { ProblemDetailsFilter } from "./shared/filters/problem-details.filter";

config({ path: ".env.development" });

async function bootstrap() {
  const env = validateEnv();
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalFilters(new ProblemDetailsFilter());
  await app.listen(env.PORT);
}

void bootstrap();
