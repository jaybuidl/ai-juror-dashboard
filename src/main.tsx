import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
// The design system, entered through its own styles.css exactly as its readme says to link it,
// and the two families it names, self-hosted. Both load before anything renders; the theme in
// styles/theme.ts is only aliases over the custom properties these declare.
import "./styles/webfonts";
import "./styles/kleros-ai/styles.css";
// Last, and the order is the whole of it: contrast.css re-declares tokens colors.css already
// declares, at equal specificity, so the later one wins. See the file for what moved and why.
import "./styles/contrast.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Cannot mount: #root is missing from index.html");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
