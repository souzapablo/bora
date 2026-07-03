import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./design-system/tokens/index.css";
import { validateEnv } from "./env";

validateEnv();

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
