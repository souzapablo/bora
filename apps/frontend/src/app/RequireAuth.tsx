import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

export interface RequireAuthProps {
  /** Whether the current visitor may see the guarded content. Supplied by a feature (e.g. BORA-22). */
  isAllowed: boolean;
  /** Where to send a disallowed visitor. Caller-owned — no path is hardcoded here. */
  redirectTo: string;
  children: ReactNode;
}

/**
 * Generic auth gate. Renders `children` when allowed, otherwise redirects to a caller-supplied
 * path. Deliberately knows nothing about what "authenticated" means — the boolean and the
 * destination are injected, so `app/` never imports from any `features/*` module (ROUTER-02).
 */
export function RequireAuth({ isAllowed, redirectTo, children }: RequireAuthProps): ReactNode {
  if (!isAllowed) {
    return <Navigate to={redirectTo} replace />;
  }
  return children;
}
