import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, Logger } from "@nestjs/common";

import { AppException } from "../errors/app-exception";
import { ERROR_CATALOG } from "../errors/error-catalog";

interface MinimalRequest {
  url: string;
}

interface MinimalResponse {
  status(code: number): this;
  type(contentType: string): this;
  json(body: unknown): void;
}

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code: string;
  errors?: Array<{ path: string; message: string }>;
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<MinimalResponse>();
    const request = ctx.getRequest<MinimalRequest>();

    if (exception instanceof AppException) {
      const entry = ERROR_CATALOG[exception.appError.code] ?? ERROR_CATALOG.INTERNAL_ERROR;

      const body: ProblemDetails = {
        type: `https://bora.dev/errors/${exception.appError.code}`,
        title: entry.title,
        status: entry.status,
        detail: exception.appError.detail,
        instance: request.url,
        code: exception.appError.code,
      };

      if (Array.isArray(exception.appError.meta?.errors)) {
        body.errors = exception.appError.meta?.errors as ProblemDetails["errors"];
      }

      response.status(entry.status).type("application/problem+json").json(body);
      return;
    }

    // Genuinely unexpected exception: log full detail server-side, never leak it to the client.
    this.logger.error(exception instanceof Error ? exception.stack : exception);

    const entry = ERROR_CATALOG.INTERNAL_ERROR;
    const body: ProblemDetails = {
      type: "https://bora.dev/errors/INTERNAL_ERROR",
      title: entry.title,
      status: entry.status,
      instance: request.url,
      code: "INTERNAL_ERROR",
    };

    response.status(entry.status).type("application/problem+json").json(body);
  }
}
