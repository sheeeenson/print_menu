const STORAGE_KEY = 'restaurant-menu-studio:tv-promo-generator:extra-effects:v1';

const EXTRA_EFFECTS = [
  { key: 'dishDrift', label: 'Dish Drift', className: 'promo-extra-dish-drift' },
  { key: 'dishZoomPunch', label: 'Dish Zoom Punch', className: 'promo-extra-dish-zoom-punch' },
  { key: 'dishWobble', label: 'Dish Wobble', className: 'promo-extra-dish-wobble' },
  { key: 'priceHeartbeat', label: 'Price Heartbeat', className: 'promo-extra-price-heartbeat' },
  { key: 'priceTilt', label: 'Price Tilt', className: 'promo-extra-price-tilt' },
  { key: 'ctaPulse', label: 'CTA Pulse', className: 'promo-extra-cta-pulse' },
  { key: 'textNeonFlicker', label: 'Text Neon Flicker', className: 'promo-extra-text-neon-flicker' },
  { key: 'backgroundWaves', label: 'Background Waves', className: 'promo-extra-background-waves' },
  { key: 'ambientGrain', label: 'Ambient Grain', className: 'promo-extra-ambient-grain' },
  { key: 'saleFlash', label: 'Sale Flash', className: 'promo-extra-sale-flash' },
  { key: 'softZoomBreath', label: 'Soft Zoom Breath', className: 'promo-extra-soft-zoom-breath' },
];

const readState = () => {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
  } catch (error) {
    return {};
  }
};

const writeState = (state) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const ensureStyle = () => {
  if (document.querySelector('[data-promo-extra-effects-style]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-promo-extra-effects-style', 'true');
  style.textContent = `
    .promo-extra-dish-drift .promo-dish-stage { animation: promoExtraDishDrift 4.8s ease-in-out infinite; }
    .promo-extra-dish-zoom-punch .promo-dish-image { animation-name: promoExtraDishZoomPunch, promoFloat; animation-duration: 1.8s, var(--promo-duration); animation-timing-function: cubic-bezier(.16,1,.3,1), ease-in-out; animation-iteration-count: infinite, infinite; }
    .promo-extra-dish-wobble .promo-dish-image { animation-name: promoExtraDishWobble, promoFloat; animation-duration: 2.4s, var(--promo-duration); animation-timing-function: ease-in-out, ease-in-out; animation-iteration-count: infinite, infinite; }
    .promo-extra-price-heartbeat .promo-price-card { animation: promoExtraPriceHeartbeat 1.28s ease-in-out infinite; }
    .promo-extra-price-tilt .promo-price-card { animation: promoExtraPriceTilt 2.2s ease-in-out infinite; }
    .promo-extra-cta-pulse .promo-cta { animation: promoExtraCtaPulse 1.45s ease-in-out infinite; }
    .promo-extra-text-neon-flicker .promo-copy-block h2,
    .promo-extra-text-neon-flicker .promo-copy-block h3 { animation: promoExtraTextNeonFlicker 2.8s steps(1, end) infinite; }
    .promo-extra-background-waves .promo-background::before { content: ''; position: absolute; inset: -25%; background: radial-gradient(circle at 20% 30%, rgba(255,255,255,.14), transparent 24%), radial-gradient(circle at 80% 70%, rgba(0,0,0,.12), transparent 28%); transform: translate3d(-4%, -3%, 0) scale(1.05); animation: promoExtraBackgroundWaves 5.6s ease-in-out infinite; mix-blend-mode: overlay; pointer-events: none; }
    .promo-extra-ambient-grain .promo-background::after { content: ''; position: absolute; inset: 0; opacity: .12; pointer-events: none; background-image: radial-gradient(circle at 10% 20%, rgba(255,255,255,.32) 0 1px, transparent 1.5px), radial-gradient(circle at 70% 80%, rgba(0,0,0,.22) 0 1px, transparent 1.5px); background-size: 38px 38px, 54px 54px; animation: promoExtraAmbientGrain 1.1s steps(2, end) infinite; mix-blend-mode: soft-light; }
    .promo-extra-sale-flash .promo-price-card::before { content: ''; position: absolute; inset: -24px; border-radius: 34px; background: rgba(255,255,255,.16); z-index: -1; animation: promoExtraSaleFlash 1.9s ease-in-out infinite; }
    .promo-extra-soft-zoom-breath .promo-dish-stage { animation: promoExtraSoftZoomBreath 5.2s ease-in-out infinite; }

    @keyframes promoExtraDishDrift { 0%,100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(-34px, 18px, 0); } }
    @keyframes promoExtraDishZoomPunch { 0%,62%,100% { transform: scale(1); } 72% { transform: scale(1.12) rotate(-1.2deg); } 82% { transform: scale(.98) rotate(.5deg); } }
    @keyframes promoExtraDishWobble { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-2.2deg); } 50% { transform: rotate(1.8deg); } 75% { transform: rotate(-.8deg); } }
    @keyframes promoExtraPriceHeartbeat { 0%,100% { transform: scale(1); } 18% { transform: scale(1.08); } 32% { transform: scale(.98); } 46% { transform: scale(1.05); } 62% { transform: scale(1); } }
    @keyframes promoExtraPriceTilt { 0%,100% { transform: rotate(0deg) translate3d(0,0,0); } 42% { transform: rotate(-2.5deg) translate3d(-5px,-2px,0); } 68% { transform: rotate(1.6deg) translate3d(4px,1px,0); } }
    @keyframes promoExtraCtaPulse { 0%,100% { transform: translate3d(0,0,0) scale(1); opacity: .88; } 50% { transform: translate3d(0,-5px,0) scale(1.06); opacity: 1; } }
    @keyframes promoExtraTextNeonFlicker { 0%,100% { opacity: 1; filter: brightness(1); } 10% { opacity: .7; filter: brightness(1.35); } 12% { opacity: 1; } 18% { opacity: .82; } 21% { opacity: 1; filter: brightness(1.2); } 72% { filter: brightness(1); } }
    @keyframes promoExtraBackgroundWaves { 0%,100% { transform: translate3d(-4%, -3%, 0) scale(1.05); opacity: .65; } 50% { transform: translate3d(4%, 3%, 0) scale(1.16); opacity: 1; } }
    @keyframes promoExtraAmbientGrain { 0% { transform: translate3d(0,0,0); } 100% { transform: translate3d(18px,-12px,0); } }
    @keyframes promoExtraSaleFlash { 0%,100% { opacity: 0; transform: scale(.92); } 48% { opacity: 1; transform: scale(1.06); } }
    @keyframes promoExtraSoftZoomBreath { 0%,100% { transform: scale(1); } 50% { transform: scale(1.035); } }
  `;
  document.head.appendChild(style);
};

const applyExtraEffectClasses = () => {
  const effects = readState();
  document.querySelectorAll('.promo-scene').forEach((scene) => {
    EXTRA_EFFECTS.forEach((effect) => {
      scene.classList.toggle(effect.className, Boolean(effects[effect.key]));
    });
  });
};

const createToggle = (effect, checked) => {
  const label = document.createElement('label');
  label.className = 'promo-toggle-field';
  label.setAttribute('data-promo-extra-effect-toggle', effect.key);

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => {
    const nextState = { ...readState(), [effect.key]: input.checked };
    writeState(nextState);
    applyExtraEffectClasses();
  });

  const text = document.createElement('span');
  text.textContent = effect.label;

  label.appendChild(input);
  label.appendChild(text);
  return label;
};

const ensureControls = () => {
  const panel = document.querySelector('.promo-generator-panel');
  if (!panel || panel.querySelector('[data-promo-extra-effects-panel]')) return;

  const section = document.createElement('section');
  section.className = 'promo-panel-group';
  section.setAttribute('data-promo-extra-effects-panel', 'true');

  const title = document.createElement('h3');
  title.textContent = 'Extra Animation Effects';

  const list = document.createElement('div');
  list.className = 'promo-toggle-list';

  const effects = readState();
  EXTRA_EFFECTS.forEach((effect) => {
    list.appendChild(createToggle(effect, Boolean(effects[effect.key])));
  });

  section.appendChild(title);
  section.appendChild(list);

  const effectsGroup = Array.from(panel.querySelectorAll('.promo-panel-group'))
    .find((group) => group.querySelector('h3')?.textContent?.trim() === 'Effects');
  if (effectsGroup?.nextSibling) panel.insertBefore(section, effectsGroup.nextSibling);
  else panel.appendChild(section);
};

const syncExtraEffects = () => {
  ensureStyle();
  ensureControls();
  applyExtraEffectClasses();
};

if (typeof window !== 'undefined') {
  window.addEventListener('load', syncExtraEffects);
  window.addEventListener('storage', syncExtraEffects);
  const observer = new MutationObserver(() => window.requestAnimationFrame(syncExtraEffects));
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  window.requestAnimationFrame(syncExtraEffects);
}
