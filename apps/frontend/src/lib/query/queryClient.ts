import { QueryClient } from "@tanstack/react-query";

/**
 * The single project-wide QueryClient. Defaults live here, not inline at the provider,
 * so every feature inherits the same server-state behavior (SHELL-02):
 * - `retry: 1` — one retry instead of TanStack's default of three (kinder to flaky mobile networks).
 * - `refetchOnWindowFocus: false` — avoid surprise refetches when a PWA resumes from background.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
