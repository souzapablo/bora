import { Route, Routes } from "react-router-dom";

import { RequireAuth } from "./RequireAuth";

// Placeholder auth state. BORA-30 is auth-agnostic, so the protected route is gated by a
// hardcoded `false` purely to prove the RequireAuth mechanism (an unauthenticated visitor to
// "/" is redirected to "/login"). BORA-22 owns replacing this with a real session check.
const PLACEHOLDER_IS_AUTHENTICATED = false;

/**
 * The single, central route table. A future feature adds a route by editing this file only —
 * no provider wiring in main.tsx or AppProviders is touched (SHELL-03, ROUTER-01).
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<div>Login Screen</div>} />
      <Route
        path="/"
        element={
          <RequireAuth isAllowed={PLACEHOLDER_IS_AUTHENTICATED} redirectTo="/login">
            <div>Home Screen</div>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
