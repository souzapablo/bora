export interface ErrorCatalogEntry {
  status: number;
  title: string;
}

const VALIDATION_ERROR_CATALOG: Record<string, ErrorCatalogEntry> = {
  VALIDATION_FAILED: { status: 400, title: "Validation failed" },
};

const INTERNAL_ERROR_CATALOG: Record<string, ErrorCatalogEntry> = {
  INTERNAL_ERROR: { status: 500, title: "Internal server error" },
};

export const ERROR_CATALOG: Record<string, ErrorCatalogEntry> = {
  ...VALIDATION_ERROR_CATALOG,
  ...INTERNAL_ERROR_CATALOG,
};
