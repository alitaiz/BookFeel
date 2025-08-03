import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// Note: We are not importing useApp here, but if we did, the file would exist.
// This is just a patch to update the component structure.

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
