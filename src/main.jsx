import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import './googleFonts.css';
import './styles.css';
import './dishSpacing.css';
import './pageContentControls.css';

createRoot(document.querySelector('#root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
