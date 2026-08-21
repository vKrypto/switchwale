import React from 'react';
import ReactDOM from 'react-dom/client';
import WelcomePage from './WelcomePage';
import './index.css';
import './lib/events';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WelcomePage />
  </React.StrictMode>
);
