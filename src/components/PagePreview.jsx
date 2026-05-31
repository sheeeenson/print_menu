import { PageFooterPreview } from './PageFooterPreview.jsx';
import { PageHeaderPreview } from './PageHeaderPreview.jsx';
import { calculateAutoFillGrid } from '../utils/autoFill.js';
import { calculateFitAllLayout, paperDimensions } from '../utils/fitAll.js';

const money = (value) => (typeof value === 'number' ? `${value.toFixed(value % 1 === 0 ? 0 : 2)} ₾` : '');

export function PagePreview({ project, page }) {
  const selectedCategoryIds = new Set(page.selectedCategoryIds);
  const categories = project.categories.filter((category) => selectedCategoryIds.has(category.id));
  const selectedDishes = selectedVisibleDishes(project, page);
  const paper = paperDimensions(page.paperSize, page.orientation);
  const isAutoFillMode = page.designSettings.gridMode === 'autoFill' || page.fittingMode === 'autoFill';
  const fitAllLayout = page.designSettings.fitAllItems
    ? calculateFitAllLayout({
        itemCount: selectedDishes.length,
        pageWidthPx: paper.width,
        pageHeightPx: paper.height,
        headerHeight: page.header?.enabled ? page.header?.height : 0,
        footerHeight: page.footer?.enabled ? page.footer?.height : 0,
        pageMargin: page.designSettings.pageMargin,
        cardGap: page.designSettings.cardGap,
        baseDesignSettings: page.designSettings,
        fitStrategy: page.designSettings.fitStrategy,
      })
    : null;
  const autoFillLayout = !fitAllLayout && isAutoFillMode
    ? calculateAutoFillGrid({
        paperSize: page.paperSize,
        orientation: page.orientation,
        pageMargin: page.designSettings.pageMargin,
        headerEnabled: page.header?.enabled,
        headerHeight: page.header?.height,
        footerEnabled: page.footer?.enabled,
        footerHeight: page.footer?.height,
        cardGap: page.designSettings.cardGap,
        cardPadding: page.designSettings.cardPadding,
        imageHeight: page.designSettings.imageHeight,
        itemCount: selectedDishes.length,
      })
    : null;
  const style = previewStyle(page, autoFillLayout, fitAllLayout, selectedDishes.length);
  const templateClass = `template-${page.layoutTemplate}`;
  const fittingClass = page.designSettings.fitAllItems ? 'fit-all-items' : `fit-${isAutoFillMode ? 'autoFill' : page.fittingMode}`;
  const gridClass = `grid-mode-${page.designSettings.gridMode} grid-${page.designSettings.gridPreset}`;
  const customGridWarning = page.designSettings.gridMode === 'custom' ? getCustomGridWarning(selectedDishes, page, fitAllLayout) : '';
  const densityClass = `density-${page.designSettings.cardDensity}`;
  const categoryStyleClass = `category-style-${page.designSettings.categoryTitleStyle}`;

  return (
    <section className="preview-stage" aria-label="Live page preview">
      <div className="preview-toolbar">
        <div>
          <p className="eyebrow">Live preview</p>
          <h1>{page.name}</h1>
        </div>
        <span>{page.paperSize} {page.orientation}</span>
      </div>
      <div className="paper-scroll">
        <div className="preview-page-wrapper print-root">
          <article className={`paper-page print-page ${page.paperSize.toLowerCase()} ${page.orientation} paper-${page.paperSize.toLowerCase()} paper-${page.orientation} ${templateClass} ${fittingClass} ${gridClass} ${densityClass} ${categoryStyleClass}`} style={style}>
            <div className="print-page-inner">
              <PageHeaderPreview page={page} renderLocalizedText={renderLocalizedText} />
              <main className="page-content">
                {fitAllLayout?.warning ? <div className="fit-warning" role="alert">{fitAllLayout.warning}</div> : null}
                {customGridWarning ? <div className="fit-warning" role="alert">{customGridWarning}</div> : null}
                {page.designSettings.gridMode === 'custom'
                  ? <CustomGridPreview dishes={selectedDishes} page={page} fitAllLayout={fitAllLayout} />
                  : fitAllLayout
                    ? <FitAllPreview dishes={selectedDishes} page={page} fitAllLayout={fitAllLayout} />
                    : isAutoFillMode
                      ? <AutoFillPreview dishes={selectedDishes} page={page} />
                      : categories.length ? categories.map((category) => <PreviewCategory key={category.id} project={project} page={page} category={category} />) : <EmptyPage />}
              </main>
              <PageFooterPreview page={page} renderLocalizedText={renderLocalizedText} />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function previewStyle(page, autoFillLayout, fitAllLayout, itemCount = 0) {
  const settings = page.designSettings;
  const columns = gridColumns(settings);
  const customRows = effectiveCustomGridRows(settings, fitAllLayout, itemCount);
  const colors = {
    backgroundColor: safeCssColor(settings.backgroundColor, '#fffdfa'),
    cardBackgroundColor: safeCssColor(settings.cardBackgroundColor, '#ffffff'),
    textColor: safeCssColor(settings.textColor, '#231f20'),
    mutedTextColor: safeCssColor(settings.mutedTextColor, '#6a5d53'),
    accentColor: safeCssColor(settings.accentColor, '#9b1c31'),
    priceColor: safeCssColor(settings.priceColor, '#9b1c31'),
    cardBorderColor: safeCssColor(settings.cardBorderColor, '#eadfd4'),
  };
  const autoFillStyle = autoFillLayout
    ? {
        '--auto-fill-columns': autoFillLayout.columns,
        '--auto-fill-rows': autoFillLayout.rows,
        '--auto-image-height': `${autoFillLayout.imageHeight}px`,
        '--auto-card-padding': `${autoFillLayout.cardPadding}px`,
        '--auto-dish-title-size': `${Math.round(settings.dishTitleFontSize * autoFillLayout.fontScale)}px`,
        '--auto-description-size': `${Math.round(settings.descriptionFontSize * autoFillLayout.fontScale)}px`,
        '--auto-old-price-size': `${Math.round(settings.oldPriceFontSize * autoFillLayout.fontScale)}px`,
        '--auto-new-price-size': `${Math.round(settings.newPriceFontSize * autoFillLayout.fontScale)}px`,
        '--auto-badge-size': `${Math.round(settings.badgeFontSize * autoFillLayout.fontScale)}px`,
        '--auto-weight-size': `${Math.round(settings.weightFontSize * autoFillLayout.fontScale)}px`,
      }
    : {};

  const density = densityValues(settings.cardDensity);
  const effectiveImageHeight = fitAllLayout?.effectiveImageHeight ?? imageHeightForStyle(settings);
  const fontScale = fitAllLayout?.effectiveFontScale ?? density.fontScale;
  const fitAllStyle = fitAllLayout
    ? {
        '--fit-all-columns': fitAllLayout.columns,
        '--fit-all-rows': fitAllLayout.rows,
        '--card-width': `${fitAllLayout.cardWidth}px`,
        '--card-height': `${fitAllLayout.cardHeight}px`,
        '--effective-image-height': `${fitAllLayout.effectiveImageHeight}px`,
        '--font-scale': fitAllLayout.effectiveFontScale,
      }
    : {
        '--card-width': 'auto',
        '--card-height': 'auto',
        '--effective-image-height': cssLength(effectiveImageHeight),
        '--font-scale': fontScale,
      };

  return {
    '--page-margin': `${settings.pageMargin}px`,
    '--card-gap': `${Math.round(settings.cardGap * density.gapMultiplier)}px`,
    '--card-padding': `${Math.round(settings.cardPadding * density.paddingMultiplier)}px`,
    '--card-radius': `${settings.cardRadius}px`,
    '--image-height': cssLength(effectiveImageHeight),
    '--category-title-size': `${settings.categoryTitleFontSize}px`,
    '--dish-title-size': `${settings.dishTitleFontSize}px`,
    '--description-size': `${settings.descriptionFontSize}px`,
    '--old-price-size': `${settings.oldPriceFontSize}px`,
    '--new-price-size': `${settings.newPriceFontSize}px`,
    '--badge-size': `${settings.badgeFontSize}px`,
    '--weight-size': `${settings.weightFontSize}px`,
    '--preview-columns': columns,
    '--grid-columns': settings.customGrid.columns,
    '--grid-rows': customRows,
    '--grid-gap': `${settings.customGrid.gap}px`,
    '--grid-auto-flow': settings.customGrid.densePacking ? 'dense' : 'row',
    '--category-font-family': settings.categoryFontFamily,
    '--dish-title-font-family': settings.dishTitleFontFamily,
    '--description-font-family': settings.descriptionFontFamily,
    '--price-font-family': settings.priceFontFamily,
    '--badge-font-family': settings.badgeFontFamily,
    '--header-footer-font-family': settings.headerFooterFontFamily,
    '--category-font-weight': settings.categoryFontWeight,
    '--dish-title-font-weight': settings.dishTitleFontWeight,
    '--description-font-weight': settings.descriptionFontWeight,
    '--price-font-weight': settings.priceFontWeight,
    '--badge-font-weight': settings.badgeFontWeight,
    '--category-letter-spacing': `${settings.categoryLetterSpacing}em`,
    '--dish-title-letter-spacing': `${settings.dishTitleLetterSpacing}em`,
    '--price-letter-spacing': `${settings.priceLetterSpacing}em`,
    '--category-text-transform': settings.categoryUppercase ? 'uppercase' : 'none',
    '--dish-title-text-transform': settings.dishTitleUppercase ? 'uppercase' : 'none',
    '--page-background': colors.backgroundColor,
    '--card-background': colors.cardBackgroundColor,
    '--preview-text-color': colors.textColor,
    '--preview-muted-color': colors.mutedTextColor,
    '--preview-accent-color': colors.accentColor,
    '--preview-price-color': colors.priceColor,
    '--card-border-color': settings.cardBorderEnabled ? hexToRgba(colors.cardBorderColor, settings.cardBorderOpacity / 100) : 'transparent',
    '--card-border-width': settings.cardBorderEnabled ? `${settings.cardBorderWidth}px` : '0px',
    '--card-shadow': settings.cardShadowEnabled ? '0 14px 30px rgba(35,31,32,0.14)' : 'none',
    '--image-fit': settings.imageFit,
    '--title-line-clamp': settings.titleLineClamp,
    '--description-line-clamp': settings.descriptionLineClamp,
    ...fitAllStyle,
    ...autoFillStyle,
  };
}


function cssLength(value) {
  return typeof value === 'number' ? `${value}px` : value;
}

function gridColumns(settings) {
  if (settings.gridPreset === 'oneColumn') return 1;
  if (settings.gridPreset === 'twoColumns') return 2;
  if (settings.gridPreset === 'threeColumns' || settings.gridPreset === 'catalogGrid' || settings.gridPreset === 'magazineGrid' || settings.gridPreset === 'bentoGrid') return 3;
  if (settings.gridPreset === 'fourColumns') return 4;
  if (settings.gridPreset === 'fiveColumns') return 5;
  if (settings.gridPreset === 'textColumns') return 2;
  if (settings.columns !== 'auto') return settings.columns;
  return 'auto';
}

function effectiveCustomGridRows(settings, fitAllLayout, itemCount) {
  if (settings.gridMode !== 'custom') return settings.customGrid.rows;
  const requiredRows = Math.ceil(totalSpanCellsForCount(itemCount, settings) / settings.customGrid.columns);
  if (fitAllLayout) return Math.max(settings.customGrid.rows, fitAllLayout.rows, requiredRows);
  return settings.customGrid.autoRows ? Math.max(settings.customGrid.rows, requiredRows) : settings.customGrid.rows;
}

function densityValues(density) {
  if (density === 'airy') return { gapMultiplier: 1.25, paddingMultiplier: 1.18, fontScale: 1.04 };
  if (density === 'compact') return { gapMultiplier: 0.7, paddingMultiplier: 0.78, fontScale: 0.92 };
  return { gapMultiplier: 1, paddingMultiplier: 1, fontScale: 1 };
}

function imageHeightForStyle(settings) {
  if (settings.imageRatio === 'square') return 'var(--card-width, 180px)';
  if (settings.imageRatio === 'fourThree') return 'calc(var(--card-width, 180px) * 0.75)';
  if (settings.imageRatio === 'sixteenNine') return 'calc(var(--card-width, 180px) * 0.5625)';
  if (settings.imageRatio === 'wide') return 'calc(var(--card-width, 180px) * 0.42)';
  return settings.imageHeight;
}

function safeCssColor(color, fallback) {
  return /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : fallback;
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace('#', '');
  const rgb = [3, 4].includes(normalized.length)
    ? normalized.slice(0, 3).split('').map((char) => `${char}${char}`).join('')
    : normalized.slice(0, 6);
  const red = Number.parseInt(rgb.slice(0, 2), 16);
  const green = Number.parseInt(rgb.slice(2, 4), 16);
  const blue = Number.parseInt(rgb.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${Math.min(1, Math.max(0, alpha))})`;
}


function selectedVisibleDishes(project, page) {
  const selectedCategoryIds = new Set(page.selectedCategoryIds ?? []);
  const selectedDishIds = Array.isArray(page.selectedDishIds) ? new Set(page.selectedDishIds) : null;

  return project.dishes.filter((dish) =>
    dish.visible && selectedCategoryIds.has(dish.categoryId) && (!selectedDishIds || selectedDishIds.has(dish.id)),
  );
}

function spanToSize(value) {
  const [colSpan, rowSpan] = String(value).split('x').map((part) => Number(part));
  return { colSpan: Number.isFinite(colSpan) ? colSpan : 1, rowSpan: Number.isFinite(rowSpan) ? rowSpan : 1 };
}

function itemSpanForIndex(index, settings) {
  if (index === 0 && settings.makeFirstItemHero) return spanToSize(settings.heroItemSpan);
  return spanToSize(settings.defaultItemSpan);
}

function totalSpanCellsForCount(count, settings) {
  return Array.from({ length: count }).reduce((total, _, index) => {
    const span = itemSpanForIndex(index, settings);
    return total + span.colSpan * span.rowSpan;
  }, 0);
}

function canPackItems(dishes, page, rowLimit) {
  const settings = page.designSettings;
  const columns = settings.customGrid.columns;
  const grid = Array.from({ length: rowLimit }, () => Array(columns).fill(false));

  return dishes.every((dish, index) => {
    const placement = page.itemPlacements?.[dish.id];
    const fallbackSpan = itemSpanForIndex(index, settings);
    const colSpan = Math.min(columns, placement?.colSpan ?? fallbackSpan.colSpan);
    const rowSpan = Math.max(1, placement?.rowSpan ?? fallbackSpan.rowSpan);
    for (let row = 0; row <= rowLimit - rowSpan; row += 1) {
      for (let column = 0; column <= columns - colSpan; column += 1) {
        let open = true;
        for (let rr = row; rr < row + rowSpan; rr += 1) {
          for (let cc = column; cc < column + colSpan; cc += 1) {
            if (grid[rr][cc]) open = false;
          }
        }
        if (open) {
          for (let rr = row; rr < row + rowSpan; rr += 1) {
            for (let cc = column; cc < column + colSpan; cc += 1) grid[rr][cc] = true;
          }
          return true;
        }
      }
    }
    return false;
  });
}

function getCustomGridWarning(dishes, page, fitAllLayout) {
  if (!dishes.length) return '';
  if (fitAllLayout?.warning) return 'Some items do not fit into the current custom grid. Increase rows, reduce item size, enable Auto rows, or use Auto-fill.';
  if (page.designSettings.customGrid.autoRows || page.designSettings.fitAllItems) return '';
  return canPackItems(dishes, page, page.designSettings.customGrid.rows)
    ? ''
    : 'Some items do not fit into the current custom grid. Increase rows, reduce item size, enable Auto rows, or use Auto-fill.';
}

function CustomGridPreview({ dishes, page, fitAllLayout }) {
  if (!dishes.length) return <EmptyPage />;
  return (
    <div className="custom-grid" aria-label="Custom dish grid">
      {dishes.map((dish, index) => {
        const placement = page.itemPlacements?.[dish.id];
        const fallbackSpan = itemSpanForIndex(index, page.designSettings);
        const colSpan = Math.min(page.designSettings.customGrid.columns, placement?.colSpan ?? fallbackSpan.colSpan);
        const rowSpan = placement?.rowSpan ?? fallbackSpan.rowSpan;
        return (
          <div className="custom-grid-item" key={dish.id} style={{ '--col-span': colSpan, '--row-span': rowSpan }}>
            <DishCard dish={dish} page={page} hideDescription={fitAllLayout?.hideDescriptions} isHero={index === 0 && page.designSettings.makeFirstItemHero} />
          </div>
        );
      })}
    </div>
  );
}

function AutoFillPreview({ dishes, page }) {
  if (!dishes.length) return <EmptyPage />;

  return (
    <div className="auto-fill-dish-grid" aria-label="Auto-filled dish layout">
      {dishes.map((dish) => <DishCard key={dish.id} dish={dish} page={page} />)}
    </div>
  );
}

function FitAllPreview({ dishes, page, fitAllLayout }) {
  if (!dishes.length) return <EmptyPage />;
  const capacity = Math.max(0, fitAllLayout.columns * fitAllLayout.rows);
  const renderDishes = fitAllLayout.success ? dishes : dishes.slice(0, capacity);

  return (
    <div className="fit-all-dish-grid" aria-label="Guaranteed fit dish layout">
      {renderDishes.map((dish, index) => <DishCard key={dish.id} dish={dish} page={page} hideDescription={fitAllLayout.hideDescriptions} isHero={index === 0} />)}
    </div>
  );
}

function PreviewCategory({ project, page, category }) {
  const selectedDishIds = new Set(page.selectedDishIds);
  const dishes = project.dishes.filter((dish) => dish.visible && dish.categoryId === category.id && selectedDishIds.has(dish.id));
  return (
    <section className="preview-category">
      <h2>{renderLocalizedText(category, 'name', page.languageMode, 'Untitled category')}</h2>
      <div className="preview-dish-grid">
        {dishes.map((dish) => <DishCard key={dish.id} dish={dish} page={page} />)}
      </div>
    </section>
  );
}

function DishCard({ dish, page, hideDescription = false, isHero = false }) {
  const settings = page.designSettings;
  const showImages = settings.showImages && !(settings.gridMode === 'preset' && settings.gridPreset === 'textColumns');
  const hasBadges = Boolean(dish.discountPercent || dish.badges?.length);
  const layoutClass = showImages ? `card-layout-${settings.cardContentLayout}` : 'card-layout-textOnly';
  const badgePositionClass = `badge-position-${settings.badgePosition}`;

  return (
    <article className={`preview-dish-card ${layoutClass} ${showImages ? 'has-images' : 'no-images'} ${isHero ? 'hero-dish-card' : ''}`}>
      {showImages ? (
        <div className="preview-image-box">
          {dish.imageUrl ? <img src={dish.imageUrl} alt="" loading="lazy" /> : <div className="preview-image-placeholder">Image</div>}
          {hasBadges ? (
            <div className={`preview-badges image-badges ${badgePositionClass}`}>
              <Badges dish={dish} />
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="preview-card-content">
        <div className="preview-title-row">
          <h3 className="dish-title">{renderLocalizedText(dish, 'name', page.languageMode, 'Untitled dish')}</h3>
          {!showImages && hasBadges ? (
            <div className="preview-badges title-badges">
              <Badges dish={dish} />
            </div>
          ) : null}
        </div>
        {settings.showDescriptions && !hideDescription ? (
          <p className="preview-description dish-description">{renderLocalizedText(dish, 'description', page.languageMode, '')}</p>
        ) : null}
        <div className="preview-meta-row">
          <span className="preview-weight">{dish.weight || ''}</span>
          <span className="preview-prices">
            {dish.oldPrice ? <span className="preview-old-price">{money(dish.oldPrice)}</span> : null}
            {dish.newPrice ? <strong className="preview-new-price">{money(dish.newPrice)}</strong> : null}
          </span>
        </div>
      </div>
    </article>
  );
}

function Badges({ dish }) {
  const badges = [...(dish.badges ?? [])];
  if (dish.discountPercent) {
    badges.unshift({ id: `${dish.id}_discount`, type: 'Promo', customText: `-${dish.discountPercent}%`, emoji: '' });
  }

  return badges.map((badge) => {
    const label = badge.type === 'Custom' ? badge.customText : badge.customText || badge.type;
    return <span className="preview-badge" key={badge.id}>{[badge.emoji, label].filter(Boolean).join(' ')}</span>;
  });
}

export function renderLocalizedText(item, field, languageMode, fallback) {
  const english = item[`${field}En`] || '';
  const georgian = item[`${field}Ge`] || '';

  if (languageMode === 'en') return <span>{english || fallback}</span>;
  if (languageMode === 'ge') return <span>{georgian || fallback}</span>;

  return (
    <>
      <span className="localized-line localized-en">{english || fallback}</span>
      {georgian ? <span className="localized-line localized-ge">{georgian}</span> : null}
    </>
  );
}

function EmptyPage() {
  return <div className="preview-empty">Select categories to add content to this page.</div>;
}
