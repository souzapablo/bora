import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { apiReference } from "@scalar/nestjs-api-reference";
import cookieParser from "cookie-parser";
import { config } from "dotenv";

import { AppModule } from "./app.module";
import { validateEnv } from "./env";
import { ProblemDetailsFilter } from "./shared/filters/problem-details.filter";
import { buildOpenApiDocument } from "./shared/openapi/document";

config({ path: ".env.development" });

async function bootstrap() {
  const env = validateEnv();
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalFilters(new ProblemDetailsFilter());

  const openApiDocument = buildOpenApiDocument();
  app.use("/docs/openapi.json", (_req: unknown, res: { json(body: unknown): void }) =>
    res.json(openApiDocument),
  );
  app.use(
    "/docs",
    apiReference({
      content: openApiDocument,
    }),
  );

  await app.listen(env.PORT);
}

void bootstrap();
