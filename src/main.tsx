import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { LocaleProvider } from './contexts/LocaleContext';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Failed to find the root element');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <LocaleProvider>
        <App />
        <Toaster position="top-right" />
      </LocaleProvider>
    </BrowserRouter>
  </React.StrictMode>
);
