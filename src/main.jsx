import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import './googleFonts.css';
import './styles.css';
import './dishSpacing.css';
import './pageContentControls.css';
import './badgePosition.css';
import './modernApp.css';
import './stabilityFixes.css';
import './imageRenderFixes.css';
import './printOnlyPage.css';
import './pizzaSizeLayoutFix.js';
import './pizzaBaselineFix.css';
import './blurImageFix.css';
import './finalPizzaPriceAlign.css';
import './ui/appTheme.css';
import './mobileFixes.css';
import './advancedResponsiveFix.css';
import './unifiedAppTheme.css';
import './mobileUxEnhancements.css';
import './promoEnhancements.css';
import './removeGifCornerRadius.css';
import './gifOverlayControls.css';
import './dishSizeBoost.js';
import './promoExtraEffects.js';
import './promoFormatIsolation.js';
import './promoWideMovement.js';

createRoot(document.querySelector('#root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
