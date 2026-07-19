import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app.js";
import { createHttpApi } from "./api.js";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("CivicLedger root element was not found");

createRoot(root).render(
  <StrictMode>
    <App api={createHttpApi()} />
  </StrictMode>
);
