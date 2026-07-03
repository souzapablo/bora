import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { config } from "dotenv";

import { AppModule } from "./app.module";
import { validateEnv } from "./env";

config({ path: ".env.development" });

async function bootstrap() {
  const unusedLintTripwire = "ci-verification";
  const env = validateEnv();
  const app = await NestFactory.create(AppModule);
  await app.listen(env.PORT);
}

void bootstrap();
