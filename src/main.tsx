import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Debug: Log when main.tsx loads
console.log('[DEBUG] main.tsx loaded');

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error('[ERROR] Root element not found!');
} else {
  console.log('[DEBUG] Root element found, rendering App...');
  
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>
    );
    console.log('[DEBUG] App rendered successfully');
  } catch (error) {
    console.error('[ERROR] Failed to render App:', error);
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif;">
        <h1 style="color: red;">Render Error</h1>
        <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${error}</pre>
      </div>
    `;
  }
}
