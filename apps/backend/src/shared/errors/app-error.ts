export interface AppError {
  code: string;
  detail?: string;
  meta?: Record<string, unknown>;
}
