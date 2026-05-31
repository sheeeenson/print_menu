import { escapeHtml } from './dom.js';
import { renderPageFooterPreview } from './PageFooterPreview.js';
import { renderPageHeaderPreview } from './PageHeaderPreview.js';

const money = (value) => (typeof value === 'number' ? `${value.toFixed(value % 1 === 0 ? 0 : 2)} ₾` : '');

export function renderPagePreview(project, page) {
  const selectedCategoryIds = new Set(page.selectedCategoryIds);
  const categories = project.categories.filter((category) => selectedCategoryIds.has(category.id));
  const style = previewStyle(page);
  const templateClass = `template-${page.layoutTemplate}`;
  const fittingClass = `fit-${page.fittingMode}`;

  return `
    <section class="preview-stage" aria-label="Live page preview">
      <div class="preview-toolbar">
        <div>
          <p class="eyebrow">Live preview</p>
          <h1>${escapeHtml(page.name)}</h1>
        </div>
        <span>${page.paperSize} ${page.orientation}</span>
      </div>
      <div class="paper-scroll">
        <article class="paper-page paper-${page.paperSize.toLowerCase()} paper-${page.orientation} ${templateClass} ${fittingClass}" style="${style}">
          <div class="print-page-inner">
            ${renderPageHeaderPreview(page, renderLocalizedText)}
            <main class="page-content">
              ${categories.length ? categories.map((category) => renderCategory(project, page, category)).join('') : renderEmptyPage()}
            </main>
            ${renderPageFooterPreview(page, renderLocalizedText)}
          </div>
        </article>
      </div>
    </section>
  `;
}

function previewStyle(page) {
  const settings = page.designSettings;
  const columns = settings.columns === 'auto' ? 'auto' : settings.columns;
  const colors = {
    backgroundColor: safeCssColor(settings.backgroundColor, '#fffdfa'),
    cardBackgroundColor: safeCssColor(settings.cardBackgroundColor, '#ffffff'),
    textColor: safeCssColor(settings.textColor, '#231f20'),
    mutedTextColor: safeCssColor(settings.mutedTextColor, '#6a5d53'),
    accentColor: safeCssColor(settings.accentColor, '#9b1c31'),
    priceColor: safeCssColor(settings.priceColor, '#9b1c31'),
    cardBorderColor: safeCssColor(settings.cardBorderColor, '#eadfd4'),
  };
  return [
    `--page-margin:${settings.pageMargin}px`,
    `--card-gap:${settings.cardGap}px`,
    `--card-padding:${settings.cardPadding}px`,
    `--card-radius:${settings.cardRadius}px`,
    `--image-height:${settings.imageHeight}px`,
    `--category-title-size:${settings.categoryTitleFontSize}px`,
    `--dish-title-size:${settings.dishTitleFontSize}px`,
    `--description-size:${settings.descriptionFontSize}px`,
    `--old-price-size:${settings.oldPriceFontSize}px`,
    `--new-price-size:${settings.newPriceFontSize}px`,
    `--badge-size:${settings.badgeFontSize}px`,
    `--weight-size:${settings.weightFontSize}px`,
    `--preview-columns:${columns}`,
    `--page-background:${colors.backgroundColor}`,
    `--card-background:${colors.cardBackgroundColor}`,
    `--preview-text-color:${colors.textColor}`,
    `--preview-muted-color:${colors.mutedTextColor}`,
    `--preview-accent-color:${colors.accentColor}`,
    `--preview-price-color:${colors.priceColor}`,
    `--card-border-color:${settings.cardBorderEnabled ? colors.cardBorderColor : 'transparent'}`,
    `--card-shadow:${settings.cardShadowEnabled ? '0 14px 30px rgba(35,31,32,0.14)' : 'none'}`,
    `--image-fit:${settings.imageFit}`,
    `--title-line-clamp:${settings.titleLineClamp}`,
    `--description-line-clamp:${settings.descriptionLineClamp}`,
  ].join(';');
}

function safeCssColor(color, fallback) {
  return /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : fallback;
}

function renderCategory(project, page, category) {
  const selectedDishIds = new Set(page.selectedDishIds);
  const dishes = project.dishes.filter((dish) => dish.visible && dish.categoryId === category.id && selectedDishIds.has(dish.id));
  return `
    <section class="preview-category">
      <h2>${renderLocalizedText(category, 'name', page.languageMode, 'Untitled category')}</h2>
      <div class="preview-dish-grid">
        ${dishes.map((dish) => renderDishCard(dish, page)).join('')}
      </div>
    </section>
  `;
}

function renderDishCard(dish, page) {
  return `
    <article class="preview-dish-card">
      <div class="preview-image-box">
        ${dish.imageUrl ? `<img src="${escapeHtml(dish.imageUrl)}" alt="" loading="lazy" />` : '<div class="preview-image-placeholder">Image</div>'}
      </div>
      <div class="preview-badges">
        ${renderBadges(dish)}
      </div>
      <h3 class="dish-title">${renderLocalizedText(dish, 'name', page.languageMode, 'Untitled dish')}</h3>
      <p class="preview-description dish-description">${renderLocalizedText(dish, 'description', page.languageMode, '')}</p>
      <div class="preview-meta-row">
        <span class="preview-weight">${escapeHtml(dish.weight || '')}</span>
        <span class="preview-prices">
          ${dish.oldPrice ? `<span class="preview-old-price">${money(dish.oldPrice)}</span>` : ''}
          ${dish.newPrice ? `<strong class="preview-new-price">${money(dish.newPrice)}</strong>` : ''}
        </span>
      </div>
    </article>
  `;
}

function renderBadges(dish) {
  const badges = [...(dish.badges ?? [])];
  if (dish.discountPercent) {
    badges.unshift({ id: `${dish.id}_discount`, type: 'Promo', customText: `-${dish.discountPercent}%`, emoji: '' });
  }

  return badges
    .map((badge) => {
      const label = badge.type === 'Custom' ? badge.customText : badge.customText || badge.type;
      return `<span class="preview-badge">${escapeHtml([badge.emoji, label].filter(Boolean).join(' '))}</span>`;
    })
    .join('');
}

function renderLocalizedText(item, field, languageMode, fallback) {
  const english = item[`${field}En`] || '';
  const georgian = item[`${field}Ge`] || '';

  if (languageMode === 'en') return `<span>${escapeHtml(english || fallback)}</span>`;
  if (languageMode === 'ge') return `<span>${escapeHtml(georgian || fallback)}</span>`;

  return `
    <span class="localized-line localized-en">${escapeHtml(english || fallback)}</span>
    ${georgian ? `<span class="localized-line localized-ge">${escapeHtml(georgian)}</span>` : ''}
  `;
}

function renderEmptyPage() {
  return '<div class="preview-empty">Select categories to add content to this page.</div>';
}
