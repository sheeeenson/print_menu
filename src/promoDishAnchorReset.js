const RESET_GROUPS = new Set(['Text block', 'Price', 'CTA']);

const getLayoutRangeInputs = () => {
  const inputs = [];
  document.querySelectorAll('.promo-style-block').forEach((block) => {
    const title = block.querySelector(':scope > h4')?.textContent?.trim();
    if (!RESET_GROUPS.has(title)) return;
    block.querySelectorAll('input[type="range"]').forEach((input) => inputs.push(input));
  });
  return inputs;
};

const resetPromoAnchors = () => {
  getLayoutRangeInputs().forEach((input) => {
    if (Number(input.value) === 0) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (setter) setter.call(input, '0');
    else input.value = '0';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

if (typeof window !== 'undefined') {
  document.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.type !== 'radio' || target.name !== 'tv-promo-dish' || !target.checked) return;
    window.requestAnimationFrame(() => window.requestAnimationFrame(resetPromoAnchors));
  }, true);
}
