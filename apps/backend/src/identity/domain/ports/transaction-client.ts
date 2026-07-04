// Opaque handle for a Prisma transaction client. Kept as `unknown` here so this
// ORM-free domain layer never imports Prisma types directly (per CLAUDE.md);
// infrastructure implementations cast it back to the real `Prisma.TransactionClient`.
export type TransactionClient = unknown;
