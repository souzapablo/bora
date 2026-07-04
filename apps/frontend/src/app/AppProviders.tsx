import { QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter } from "react-router-dom";

import { queryClient } from "../lib/query/queryClient";
import { AppRoutes } from "./routes";

// Dev-only. `import.meta.env.DEV` is statically `false` in production, so Vite dead-code-eliminates
// this branch and tree-shakes the dynamically-imported devtools chunk out of the prod bundle (DEVTOOLS-01).
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-query-devtools").then((module) => ({
        default: module.ReactQueryDevtools,
      })),
    )
  : null;

/**
 * Single root component: wires the router and the TanStack Query provider (plus dev-only devtools)
 * around the central route table. main.tsx renders only this (SHELL-01).
 */
export function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      {ReactQueryDevtools ? (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      ) : null}
    </QueryClientProvider>
  );
}
