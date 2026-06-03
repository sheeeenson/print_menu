const SIZE_PATTERN = /(?:\d+(?:[.,]\d+)?\s*(?:cm|სმ))|(?:small|medium|large)/i;
const PRICE_PATTERN = /\d+(?:[.,]\d+)?\s*₾?/;
const STRIKE_CHARS = /[\u0336\u0335]/;

function cleanText(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').trim();
}

function stripLabelPrefix(value) {
  const text = cleanText(value);
  const sizeMatch = text.match(SIZE_PATTERN);
  return sizeMatch ? sizeMatch[0].trim() : '';
}

function isStruck(value) {
  return STRIKE_CHARS.test(String(value ?? ''));
}

function normalizePrice(value) {
  return cleanText(value).replace(/\s+/g, ' ');
}

function parsePizzaBlocks(text) {
  const normalized = cleanText(text)
    .replace(/\r/g, '')
    .replace(/\s*\/\s*/g, '\n\n');

  const blocks = normalized
    .split(/\n\s*\n+/)
    .map((block) => block.split('\n').map(cleanText).filter(Boolean))
    .filter((lines) => lines.length >= 2);

  const items = blocks.map((lines) => {
    const size = stripLabelPrefix(lines[0]);
    if (!size) return null;
    const priceLines = lines.slice(1).filter((line) => PRICE_PATTERN.test(line));
    if (!priceLines.length) return null;
    const oldPrice = priceLines.find(isStruck) ?? (priceLines.length > 1 ? priceLines[0] : '');
    const salePrice = priceLines.length > 1 ? priceLines[priceLines.length - 1] : priceLines.find((line) => !isStruck(line)) ?? '';
    if (!salePrice) return null;
    return { size, oldPrice: normalizePrice(oldPrice), salePrice: normalizePrice(salePrice) };
  }).filter(Boolean);

  return items.length ? items.slice(0, 3) : [];
}

function createCell(className, value) {
  const cell = document.createElement('span');
  cell.className = `pizza-price-cell ${className}`;
  cell.textContent = value || '';
  return cell;
}

function createRow(className, items, field) {
  const row = document.createElement('div');
  row.className = `pizza-price-row ${className}`;
  items.forEach((item) => {
    row.appendChild(createCell(`${className}-cell`, item[field]));
  });
  return row;
}

function enhanceConfigurableOptions(element) {
  if (!element || element.dataset.pizzaMatrixEnhanced === 'true') return;
  const text = element.textContent;
  const items = parsePizzaBlocks(text);
  if (!items.length) return;

  element.dataset.pizzaMatrixEnhanced = 'true';
  element.classList.add('pizza-size-matrix');
  element.style.setProperty('--pizza-size-count', String(items.length));
  element.innerHTML = '';
  element.appendChild(createRow('pizza-size-row', items, 'size'));
  element.appendChild(createRow('pizza-old-row', items, 'oldPrice'));
  element.appendChild(createRow('pizza-sale-row', items, 'salePrice'));
}

function enhanceAllPizzaSizes() {
  document.querySelectorAll('.configurable-options').forEach(enhanceConfigurableOptions);
}

if (typeof window !== 'undefined') {
  const scheduleEnhance = () => window.requestAnimationFrame(enhanceAllPizzaSizes);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceAllPizzaSizes, { once: true });
  } else {
    scheduleEnhance();
  }

  window.addEventListener('beforeprint', enhanceAllPizzaSizes);

  const observer = new MutationObserver(() => scheduleEnhance());
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
