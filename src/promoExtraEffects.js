const STORAGE_KEY = 'restaurant-menu-studio:tv-promo-generator:v1';

const EXTRA_EFFECTS = [
  { key: 'dishDrift', label: 'Dish Drift', className: 'promo-extra-dish-drift' },
  { key: 'dishZoomPunch', label: 'Dish Zoom Punch', className: 'promo-extra-dish-zoom-punch' },
  { key: 'priceHeartbeat', label: 'Price Heartbeat', className: 'promo-extra-price-heartbeat' },
  { key: 'ctaPulse', label: 'CTA Pulse', className: 'promo-extra-cta-pulse' },
  { key: 'textNeonFlicker', label: 'Text Neon Flicker', className: 'promo-extra-text-neon-flicker' },
  { key: 'backgroundWaves', label: 'Background Waves', className: 'promo-extra-background-waves' },
  { key: 'posterShake', label: 'Poster Shake', className: 'promo-extra-poster-shake' },
];

const getProject = () => {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
  } catch (error) {
    return {};
  }
};

const saveProject = (project) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
};

const getEffects = () => getProject().effects || {};

const setEffect = (key, value) => {
  const project = getProject();
  project.effects = { ...(project.effects || {}), [key]: Boolean(value) };
  if (project.formatId && project.formats?.[project.formatId]) {
    project.formats[project.formatId].effects = { ...(project.formats[project.formatId].effects || {}), [key]: Boolean(value) };
  }
  saveProject(project);
  applyExtraEffectClasses();
};

const ensureStyle = () => {
  if (document.querySelector('[data-promo-extra-effects-style]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-promo-extra-effects-style', 'true');
  style.textContent = `
    .promo-extra-dish-drift .promo-dish-stage { animation: promoExtraDishDrift 4.8s ease-in-out infinite; }
    .promo-extra-dish-zoom-punch .promo-dish-image { animation-name: promoExtraDishZoomPunch, promoFloat; animation-duration: 1.8s, var(--promo-duration); animation-timing-function: cubic-bezier(.16,1,.3,1), ease-in-out; animation-iteration-count: infinite, infinite; }
    .promo-extra-price-heartbeat .promo-price-card { animation: promoExtraPriceHeartbeat 1.28s ease-in-out infinite; }
    .promo-extra-cta-pulse .promo-cta { animation: promoExtraCtaPulse 1.45s ease-in-out infinite; }
    .promo-extra-text-neon-flicker .promo-copy-block h2,
    .promo-extra-text-neon-flicker .promo-copy-block h3 { animation: promoExtraTextNeonFlicker 2.8s steps(1, end) infinite; }
    .promo-extra-background-waves .promo-background::before { content: ''; position: absolute; inset: -25%; background: radial-gradient(circle at 20% 30%, rgba(255,255,255,.14), transparent 24%), radial-gradient(circle at 80% 70%, rgba(0,0,0,.12), transparent 28%); transform: translate3d(-4%, -3%, 0) scale(1.05); animation: promoExtraBackgroundWaves 5.6s ease-in-out infinite; mix-blend-mode: overlay; }
    .promo-extra-poster-shake { animation: promoExtraPosterShake .72s steps(2, end) infinite; }

    @keyframes promoExtraDishDrift { 0%,100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(-34px, 18px, 0); } }
    @keyframes promoExtraDishZoomPunch { 0%,62%,100% { transform: scale(1); } 72% { transform: scale(1.12) rotate(-1.2deg); } 82% { transform: scale(.98) rotate(.5deg); } }
    @keyframes promoExtraPriceHeartbeat { 0%,100% { transform: scale(1); } 18% { transform: scale(1.08); } 32% { transform: scale(.98); } 46% { transform: scale(1.05); } 62% { transform: scale(1); } }
    @keyframes promoExtraCtaPulse { 0%,100% { transform: translate3d(0,0,0) scale(1); opacity: .88; } 50% { transform: translate3d(0,-5px,0) scale(1.06); opacity: 1; } }
    @keyframes promoExtraTextNeonFlicker { 0%,100% { opacity: 1; filter: brightness(1); } 10% { opacity: .7; filter: brightness(1.35); } 12% { opacity: 1; } 18% { opacity: .82; } 21% { opacity: 1; filter: brightness(1.2); } 72% { filter: brightness(1); } }
    @keyframes promoExtraBackgroundWaves { 0%,100% { transform: translate3d(-4%, -3%, 0) scale(1.05); opacity: .65; } 50% { transform: translate3d(4%, 3%, 0) scale(1.16); opacity: 1; } }
    @keyframes promoExtraPosterShake { 0%,100% { transform: scale(var(--promo-preview-scale, 1)) translate3d(0,0,0); } 25% { transform: scale(var(--promo-preview-scale, 1)) translate3d(3px,-2px,0); } 50% { transform: scale(var(--promo-preview-scale, 1)) translate3d(-2px,2px,0); } 75% { transform: scale(var(--promo-preview-scale, 1)) translate3d(2px,1px,0); } }
  `;
  document.head.appendChild(style);
};

const applyExtraEffectClasses = () => {
  const effects = getEffects();
  document.querySelectorAll('.promo-scene').forEach((scene) => {
    EXTRA_EFFECTS.forEach((effect) => {
      scene.classList.toggle(effect.className, Boolean(effects[effect.key]));
    });
    const scaleMatch = String(scene.style.transform || '').match(/scale\(([^)]+)\)/);
    if (scaleMatch?.[1]) scene.style.setProperty('--promo-preview-scale', scaleMatch[1]);
  });
};

const createToggle = (effect, checked) => {
  const label = document.createElement('label');
  label.className = 'promo-toggle-field';
  label.setAttribute('data-promo-extra-effect-toggle', effect.key);

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => setEffect(effect.key, input.checked));

  const text = document.createElement('span');
  text.textContent = effect.label;

  label.appendChild(input);
  label.appendChild(text);
  return label;
};

const ensureControls = () => {
  const groups = Array.from(document.querySelectorAll('.promo-panel-group'));
  const effectsGroup = groups.find((group) => group.querySelector('h3')?.textContent?.trim() === 'Effects');
  const toggleList = effectsGroup?.querySelector('.promo-toggle-list');
  if (!toggleList) return;

  const effects = getEffects();
  EXTRA_EFFECTS.forEach((effect) => {
    const existing = toggleList.querySelector(`[data-promo-extra-effect-toggle="${effect.key}"]`);
    if (existing) {
      const input = existing.querySelector('input[type="checkbox"]');
      if (input) input.checked = Boolean(effects[effect.key]);
      return;
    }
    toggleList.appendChild(createToggle(effect, Boolean(effects[effect.key])));
  });
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
