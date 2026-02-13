import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/globals.css';

try {
  const root = createRoot(document.getElementById('root'));
  root.render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  );
} catch (error) {
  console.error('Failed to render application:', error);
  document.getElementById('root').innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:20px;text-align:center;font-family:system-ui,sans-serif;">
      <h1 style="color:#dc2626;margin-bottom:16px;">Application Error</h1>
      <p style="color:#6b7280;">Failed to load the application. Please refresh the page.</p>
      <pre style="margin-top:16px;padding:16px;background:#fee2e2;border-radius:8px;overflow:auto;max-width:100%;font-size:12px;">${error.message}</pre>
    </div>
  `;
}
