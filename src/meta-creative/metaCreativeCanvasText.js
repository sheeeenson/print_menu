import { buildDefaultMetaElementTransforms } from './metaCreativeStorage.js';

const formatPrice = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? `${number.toFixed(2)}₾` : '';
};

const getPriceData = (dish) => {
  const variant = (dish?.priceVariants ?? []).find((item) => Number(item?.newPrice ?? item?.price ?? item?.oldPrice) > 0);
  return {
    current: formatPrice(dish?.newPrice ?? variant?.newPrice ?? variant?.price ?? dish?.price),
    old: formatPrice(dish?.oldPrice ?? variant?.oldPrice),
  };
};

const elementKey = (dishId, type) => `${dishId}:${type}`;
const splitParagraphs = (value) => String(value ?? '').split(/\n/);

const wrapParagraph = (ctx, paragraph, maxWidth) => {
  const words = String(paragraph ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let line = words[0];
  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${line} ${words[index]}`;
    if (ctx.measureText(candidate).width <= maxWidth) line = candidate;
    else { lines.push(line); line = words[index]; }
  }
  lines.push(line);
  return lines;
};

const wrapText = (ctx, value, maxWidth) => splitParagraphs(value).flatMap((paragraph) => wrapParagraph(ctx, paragraph, maxWidth));
const setFont = (ctx, weight, size, family = 'Inter, Arial, sans-serif') => { ctx.font = `${weight} ${size}px ${family}`; };

const drawCenteredLines = (ctx, lines, fontSize, lineHeight, color) => {
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const step = fontSize * lineHeight;
  const total = step * lines.length;
  lines.forEach((line, index) => ctx.fillText(line, 0, -total / 2 + step / 2 + index * step));
};

const roundRect = (ctx, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};

const drawTextElement = (ctx, format, transform, value, options = {}) => {
  if (!value) return;
  const size = Number(options.size) || 48;
  const scale = Number(transform?.scale) || 1;
  const family = options.family || 'Inter, Arial, sans-serif';
  ctx.save();
  ctx.translate((Number(transform?.x) || .5) * format.width, (Number(transform?.y) || .5) * format.height);
  ctx.scale(scale, scale);
  setFont(ctx, options.weight || 900, size, family);
  const lines = options.wrapWidth ? wrapText(ctx, value, options.wrapWidth) : splitParagraphs(value);
  if (options.opacity != null) ctx.globalAlpha = options.opacity;
  drawCenteredLines(ctx, lines, size, options.lineHeight || 1, options.color || '#161616');
  if (options.strike) {
    const widest = Math.max(...lines.map((line) => ctx.measureText(line).width), 1);
    ctx.strokeStyle = options.color || '#161616';
    ctx.lineWidth = Math.max(3, size * .08);
    ctx.lineCap = 'round';
    ctx.rotate(-8 * Math.PI / 180);
    ctx.beginPath();
    ctx.moveTo(-widest * .54, 0);
    ctx.lineTo(widest * .54, 0);
    ctx.stroke();
  }
  ctx.restore();
};

const drawOffer = (ctx, format, creative) => {
  if (!creative.showOffer || !creative.offerText) return;
  const transform = creative.offerTransform || { x: .2, y: .88, scale: 1 };
  const size = Number(creative.offerSize) || 46;
  const scale = Number(transform.scale) || 1;
  ctx.save();
  ctx.translate((Number(transform.x) || .2) * format.width, (Number(transform.y) || .88) * format.height);
  ctx.scale(scale, scale);
  setFont(ctx, 900, size);
  const maxTextWidth = format.width * .48;
  const lines = wrapText(ctx, creative.offerText, maxTextWidth);
  const lineHeight = size * .95;
  const textWidth = Math.min(maxTextWidth, Math.max(...lines.map((line) => ctx.measureText(line).width), size));
  const paddingX = size * .62;
  const paddingY = size * .34;
  const width = textWidth + paddingX * 2;
  const height = lines.length * lineHeight + paddingY * 2;
  ctx.fillStyle = creative.accentColor || '#d83b32';
  roundRect(ctx, -width / 2, -height / 2, width, height, size * .42);
  ctx.fill();
  drawCenteredLines(ctx, lines, size, .95, creative.offerTextColor || '#ffffff');
  ctx.restore();
};

export function drawMetaCreativeTextLayers(canvas, creative, dishes, format) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const selectedDishes = (creative.selectedDishIds || []).map((id) => dishes.find((dish) => dish.id === id)).filter(Boolean);
  const defaults = buildDefaultMetaElementTransforms(selectedDishes.map((dish) => dish.id));
  const getTransform = (dishId, type) => creative.elementTransforms?.[elementKey(dishId, type)] || defaults[elementKey(dishId, type)] || { x: .5, y: .5, scale: 1 };

  selectedDishes.forEach((dish) => {
    const price = getPriceData(dish);
    if (creative.showProductNameEn !== false && dish.nameEn) drawTextElement(ctx, format, getTransform(dish.id, 'nameEn'), dish.nameEn, { size: creative.productNameSize, color: creative.productNameColor, weight: 900 });
    if (creative.showProductNameGe !== false && dish.nameGe) drawTextElement(ctx, format, getTransform(dish.id, 'nameGe'), dish.nameGe, { size: creative.productNameGeSize, color: creative.productNameGeColor, weight: 900, family: 'Inter, "Noto Sans Georgian", Arial, sans-serif' });
    if (creative.showDescriptionEn && dish.descriptionEn) drawTextElement(ctx, format, getTransform(dish.id, 'descriptionEn'), dish.descriptionEn, { size: creative.descriptionSize, color: creative.descriptionEnColor, weight: 500, lineHeight: 1.15, wrapWidth: 420 });
    if (creative.showDescriptionGe && dish.descriptionGe) drawTextElement(ctx, format, getTransform(dish.id, 'descriptionGe'), dish.descriptionGe, { size: creative.descriptionSize, color: creative.descriptionGeColor, weight: 500, lineHeight: 1.15, wrapWidth: 420, family: 'Inter, "Noto Sans Georgian", Arial, sans-serif' });
    if (creative.showPrice && price.current) drawTextElement(ctx, format, getTransform(dish.id, 'price'), price.current, { size: creative.priceSize, color: creative.currentPriceColor, weight: 900, lineHeight: .9 });
    if (creative.showPrice && creative.showOldPrice && price.old) drawTextElement(ctx, format, getTransform(dish.id, 'oldPrice'), price.old, { size: creative.oldPriceSize, color: creative.oldPriceColor, weight: 700, opacity: .68, strike: true });
  });

  drawOffer(ctx, format, creative);
}
