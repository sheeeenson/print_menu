import { useEffect, useRef, useState } from 'react';
import { PageFooterPreview } from './PageFooterPreview.jsx';
import { PageHeaderPreview } from './PageHeaderPreview.jsx';
import { calculateAutoFillGrid } from '../utils/autoFill.js';
import { calculateFitAllLayout, paperDimensions } from '../utils/fitAll.js';

const money = (value) => (typeof value === 'number' ? `${value.toFixed(2)} ₾` : '');

export function PagePreview({ project, page, selectedPreviewDishId = '', onSelectPreviewDish = () => {}, onResizePreviewDish = () => {} }) {
  const selectedCategoryIds = new Set(page.selectedCategoryIds);
  const categories = project.categories.filter((category) => selectedCategoryIds.has(category.id));
  const selectedDishes = selectedVisibleDishes(project, page);
  const paper = paperDimensions(page.paperSize, page.orientation);
  const isAutoFillMode = page.designSettings.layoutMode === 'smartAutoFit' || page.designSettings.gridMode === 'autoFill' || page.fittingMode === 'autoFill';
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
  const customGridWarning = page.designSettings.layoutMode === 'snapGrid' ? getCustomGridWarning(selectedDishes, page, fitAllLayout) : '';
  const densityClass = `density-${page.designSettings.cardDensity}`;
  const categoryStyleClass = `category-style-${page.designSettings.categoryTitleStyle}`;
  const [manualGridWarning, setManualGridWarning] = useState('');
  const isFluidGridMode = page.designSettings.layoutMode === 'fluidGrid';
  const isSnapGridMode = page.designSettings.layoutMode === 'snapGrid' || (page.designSettings.layoutMode === 'manualDesigner' && page.designSettings.resizeMode !== 'freeResize');
  const isManualGridMode = page.designSettings.layoutMode === 'manualDesigner';
  const isFreeResizeMode = isManualGridMode && page.designSettings.resizeMode === 'freeResize';

  useEffect(() => {
    setManualGridWarning('');
  }, [page.id, page.designSettings.layoutMode, page.designSettings.gridMode, page.designSettings.customGrid.rows, page.designSettings.customGrid.columns]);

  const updatePreviewPlacement = (dishId, nextPlacement, previousPlacement) => {
    if (!isManualGridMode && !isSnapGridMode && !isFluidGridMode) return false;
    if (isFluidGridMode) {
      setManualGridWarning('');
      onResizePreviewDish(dishId, nextPlacement);
      return true;
    }
    if (isManualGridMode && page.designSettings.resizeMode === 'freeResize') {
      setManualGridWarning('');
      onResizePreviewDish(dishId, nextPlacement);
      return true;
    }
    const nextPage = {
      ...page,
      itemPlacements: {
        ...(page.itemPlacements ?? {}),
        [dishId]: {
          colSpan: nextPlacement.colSpan,
          rowSpan: nextPlacement.rowSpan,
          priority: page.itemPlacements?.[dishId]?.priority ?? 0,
        },
      },
    };
    if (!canPackItems(selectedDishes, nextPage, page.designSettings.customGrid.rows)) {
      setManualGridWarning('Resize does not fit every selected dish in this snap grid. Add rows or reduce card spans.');
      if (previousPlacement) onResizePreviewDish(dishId, previousPlacement);
      return false;
    }
    setManualGridWarning('');
    onResizePreviewDish(dishId, nextPlacement);
    return true;
  };

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
          <article onPointerDown={(event) => { if (event.target === event.currentTarget) onSelectPreviewDish(''); }} className={`paper-page print-page ${page.paperSize.toLowerCase()} ${page.orientation} paper-${page.paperSize.toLowerCase()} paper-${page.orientation} ${templateClass} ${fittingClass} ${gridClass} ${densityClass} ${categoryStyleClass} layout-mode-${page.designSettings.layoutMode}`} style={style}>
            <div className="print-page-inner">
              <PageHeaderPreview page={page} renderLocalizedText={renderLocalizedText} />
              <main className="page-content" onPointerDown={(event) => { if (event.target === event.currentTarget) onSelectPreviewDish(''); }}>
                {fitAllLayout?.warning ? <div className="fit-warning" role="alert">{fitAllLayout.warning}</div> : null}
                {customGridWarning ? <div className="fit-warning" role="alert">{customGridWarning}</div> : null}
                {manualGridWarning ? <div className="fit-warning" role="alert">{manualGridWarning}</div> : null}
                {isFluidGridMode
                  ? <FluidGridPreview dishes={selectedDishes} page={page} selectedDishId={selectedPreviewDishId} onSelectDish={onSelectPreviewDish} onResizeDish={updatePreviewPlacement} onFitWarning={setManualGridWarning} />
                  : isFreeResizeMode
                    ? <FreeResizePreview dishes={selectedDishes} page={page} selectedDishId={selectedPreviewDishId} onSelectDish={onSelectPreviewDish} onResizeDish={updatePreviewPlacement} />
                    : isSnapGridMode
                    ? <CustomGridPreview dishes={selectedDishes} page={page} fitAllLayout={fitAllLayout} selectedDishId={selectedPreviewDishId} onSelectDish={onSelectPreviewDish} onResizeDish={updatePreviewPlacement} />
                  : page.designSettings.layoutMode === 'classicColumns'
                    ? <ClassicColumnsPreview dishes={selectedDishes} page={page} />
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
    badgeBackgroundColor: safeCssColor(settings.badgeStyle?.backgroundColor, settings.accentColor),
    badgeTextColor: safeCssColor(settings.badgeStyle?.textColor, '#ffffff'),
    badgeBorderColor: settings.badgeStyle?.borderColor === 'transparent' ? 'transparent' : safeCssColor(settings.badgeStyle?.borderColor, 'transparent'),
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
    '--price-bottom-offset': `${settings.priceBottomOffset ?? 0}px`,
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
    '--card-border-color': colors.cardBorderColor,
    '--badge-background': colors.badgeBackgroundColor,
    '--badge-text': colors.badgeTextColor,
    '--badge-border-color': colors.badgeBorderColor,
    '--badge-border-width': `${settings.badgeStyle?.borderWidth ?? 0}px`,
    '--badge-opacity': `${(settings.badgeStyle?.opacity ?? 100) / 100}`,
    '--badge-radius': badgeRadius(settings.badgeStyle?.shape),
    '--card-border-width': settings.cardBorderEnabled ? `${settings.cardBorderWidth}px` : '0px',
    '--card-border-opacity': `${(settings.cardBorderOpacity ?? 100) / 100}`,
    '--image-zoom': settings.showImages ? settings.imageZoom / 100 : 1,
    '--side-image-width': `${settings.imageAreaPercent}%`,
    ...autoFillStyle,
    ...fitAllStyle,
  };
}

function badgeRadius(shape) {
  if (shape === 'square') return '0px';
  if (shape === 'circle') return '999px';
  if (shape === 'rounded') return '8px';
  if (shape === 'ribbon') return '4px';
  return '999px';
}

function gridColumns(settings) {
  if (settings.layoutMode === 'classicColumns') return settings.classicColumns ?? 2;
  if (settings.gridPreset === 'oneColumn') return 1;
  if (settings.gridPreset === 'twoColumns') return 2;
  if (settings.gridPreset === 'threeColumns') return 3;
  if (settings.gridPreset === 'fourColumns') return 4;
  if (settings.gridPreset === 'fiveColumns') return 5;
  return 2;
}

function effectiveCustomGridRows(settings, fitAllLayout, itemCount) {
  if (fitAllLayout) return Math.max(1, fitAllLayout.rows);
  if (settings.customGrid.autoRows) return Math.max(settings.customGrid.rows, Math.ceil(itemCount / Math.max(1, settings.customGrid.columns)));
  return settings.customGrid.rows;
}

function densityValues(density) {
  if (density === 'compact') return { paddingMultiplier: 0.72, gapMultiplier: 0.72, fontScale: 0.92 };
  if (density === 'spacious') return { paddingMultiplier: 1.22, gapMultiplier: 1.18, fontScale: 1.05 };
  return { paddingMultiplier: 1, gapMultiplier: 1, fontScale: 1 };
}

function cssLength(value) {
  return typeof value === 'number' ? `${value}px` : value;
}

function imageHeightForStyle(settings) {
  if (!settings.showImages) return 0;
  if (settings.imageRatio === 'square') return 'min(var(--image-height, 118px), 100%)';
  if (settings.imageRatio === 'fourThree') return 'min(var(--image-height, 118px), 75%)';
  if (settings.imageRatio === 'sixteenNine') return 'min(var(--image-height, 118px), 56%)';
  if (settings.imageRatio === 'wide') return 'min(var(--image-height, 118px), 42%)';
  return settings.imageHeight;
}

function safeCssColor(value, fallback) {
  if (value === 'accentColor') return fallback;
  return /^#[0-9a-fA-F]{3,8}$/.test(value ?? '') ? value : fallback;
}

function selectedVisibleDishes(project, page) {
  const selectedCategoryIds = new Set(page.selectedCategoryIds);
  const selectedDishIds = new Set(page.selectedDishIds);
  return project.dishes.filter((dish) => dish.visible && selectedCategoryIds.has(dish.categoryId) && selectedDishIds.has(dish.id));
}

function ClassicColumnsPreview({ dishes, page }) {
  const categories = groupDishesByCategoryOrder(dishes);
  return (
    <div className="classic-columns-grid">
      {categories.map(([categoryId, items]) => <div className="classic-column" key={categoryId}>{items.map((dish) => <DishCard key={dish.id} dish={dish} page={page} />)}</div>)}
    </div>
  );
}

function AutoFillPreview({ dishes, page }) {
  return <div className="auto-fill-dish-grid">{dishes.map((dish) => <DishCard key={dish.id} dish={dish} page={page} />)}</div>;
}

function FitAllPreview({ dishes, page, fitAllLayout }) {
  return <div className="fit-all-dish-grid">{dishes.map((dish) => <DishCard key={dish.id} dish={dish} page={page} hideDescription={fitAllLayout.hideDescriptions} />)}</div>;
}

function CustomGridPreview({ dishes, page, fitAllLayout, selectedDishId, onSelectDish, onResizeDish }) {
  const rows = effectiveCustomGridRows(page.designSettings, fitAllLayout, dishes.length);
  const placedItems = packGridItems(dishes, page, rows);
  return (
    <div className="custom-grid custom-grid-canvas" style={{ '--grid-rows': rows }}>
      {placedItems.map(({ dish, placement, gridArea }) => (
        <ResizableGridItem key={dish.id} dish={dish} page={page} placement={placement} gridArea={gridArea} isSelected={selectedDishId === dish.id} onSelectDish={onSelectDish} onResizeDish={onResizeDish}>
          <DishCard dish={dish} page={page} isHero={placement.colSpan > 1 || placement.rowSpan > 1} />
        </ResizableGridItem>
      ))}
    </div>
  );
}

function FluidGridPreview({ dishes, page, selectedDishId, onSelectDish, onResizeDish, onFitWarning }) {
  const [dragState, setDragState] = useState(null);
  const containerRef = useRef(null);
  const placements = dishes.map((dish) => ({ dish, placement: page.itemPlacements?.[dish.id] ?? {} }));
  const totalWeight = placements.reduce((sum, item) => sum + (item.placement.widthWeight ?? 1), 0);

  const updateWeight = (dishId, deltaX, deltaY) => {
    const container = containerRef.current;
    if (!container) return;
    const widthStep = container.clientWidth / Math.max(1, placements.length);
    const heightStep = 48;
    const current = page.itemPlacements?.[dishId] ?? {};
    const widthWeight = Math.min(4, Math.max(0.5, (current.widthWeight ?? 1) + deltaX / widthStep));
    const heightWeight = Math.min(4, Math.max(0.5, (current.heightWeight ?? 1) + deltaY / heightStep));
    onResizeDish(dishId, { ...current, mode: 'fluid', widthWeight, heightWeight });
  };

  return (
    <div className="fluid-grid" ref={containerRef}>
      {placements.map(({ dish, placement }) => (
        <ResizableFluidItem key={dish.id} dish={dish} placement={placement} page={page} totalWeight={totalWeight} isSelected={selectedDishId === dish.id} onSelectDish={onSelectDish} onResizeStart={setDragState}>
          <DishCard dish={dish} page={page} isHero={(placement.widthWeight ?? 1) > 1.3 || (placement.heightWeight ?? 1) > 1.3} />
        </ResizableFluidItem>
      ))}
    </div>
  );
}

function FreeResizePreview({ dishes, page, selectedDishId, onSelectDish, onResizeDish }) {
  return (
    <div className="free-resize-canvas">
      {dishes.map((dish, index) => {
        const placement = page.itemPlacements?.[dish.id] ?? {};
        const xPercent = placement.xPercent ?? (index % 3) * 32;
        const yPercent = placement.yPercent ?? Math.floor(index / 3) * 24;
        const widthPercent = placement.widthPercent ?? 30;
        const heightPercent = placement.heightPercent ?? 22;
        return (
          <FreeResizeItem key={dish.id} dish={dish} page={page} placement={{ ...placement, xPercent, yPercent, widthPercent, heightPercent }} isSelected={selectedDishId === dish.id} onSelectDish={onSelectDish} onResizeDish={onResizeDish}>
            <DishCard dish={dish} page={page} isHero={(widthPercent > 38 || heightPercent > 28)} />
          </FreeResizeItem>
        );
      })}
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
  const cardStyle = settings.showImages === false ? 'textOnly' : (settings.cardStyle ?? ({ below: 'imageTop', imageLeft: 'imageLeft', imageRight: 'imageRight' }[settings.cardContentLayout] ?? 'imageTop'));
  const showImages = settings.showImages && cardStyle !== 'textOnly' && !(settings.gridMode === 'preset' && settings.gridPreset === 'textColumns');
  const hasBadges = Boolean(dish.discountPercent || dish.badges?.length);
  const legacyLayout = { imageTop: 'below', imageLeft: 'imageLeft', imageRight: 'imageRight', textOnly: 'textOnly' }[cardStyle];
  const layoutClass = showImages ? `card-layout-${legacyLayout}` : 'card-layout-textOnly';
  const badgePositionClass = `badge-position-${settings.badgePosition}`;

  return (
    <article className={`preview-dish-card ${layoutClass} card-style-${cardStyle} ${showImages ? 'has-images' : 'no-images'} ${isHero ? 'hero-dish-card' : ''} ${dish.blurImage ? 'image-blurred' : ''}`}>
      {showImages ? (
        <div className="preview-image-box">
          {dish.imageUrl ? <img src={dish.imageUrl} alt="" loading="lazy" /> : <div className="preview-image-placeholder">Image</div>}
          {hasBadges ? (
            <div className={`preview-badges image-badges ${badgePositionClass}`}>
              <Badges dish={dish} page={page} />
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="preview-card-content">
        <div className="preview-title-row">
          <h3 className="dish-title">{renderLocalizedText(dish, 'name', page.languageMode, 'Untitled dish')}</h3>
          {!showImages && hasBadges ? (
            <div className="preview-badges title-badges">
              <Badges dish={dish} page={page} />
            </div>
          ) : null}
        </div>
        {settings.showDescriptions && !hideDescription ? (
          <p className="preview-description dish-description">{renderLocalizedText(dish, 'description', page.languageMode, '')}</p>
        ) : null}
        {dish.dishType === 'configurable' ? <ConfigurableOptions dish={dish} page={page} /> : null}
        <div className="preview-meta-row">
          <span className="preview-weight">{dish.weight || ''}</span>
          <span className="preview-prices">
            {dish.oldPrice ? <span className="preview-old-price">{money(dish.oldPrice)}</span> : null}
            {dish.newPrice ? <strong className="preview-new-price">{dish.dishType === 'configurable' ? `From ${money(dish.newPrice)}` : money(dish.newPrice)}</strong> : null}
          </span>
        </div>
      </div>
    </article>
  );
}

function ConfigurableOptions({ dish, page }) {
  const groups = dish.optionGroups ?? [];
  if (!groups.length) return null;
  const optionText = (option) => `${renderPlainLocalizedText(option, 'name', page.languageMode, 'Option')}${option.priceDelta ? ` +${money(option.priceDelta).replace(' ₾', '')}` : ''}`;
  if (page.designSettings.configurableDisplayMode === 'stepList') {
    return <ol className="configurable-options step-list">{groups.map((group, index) => <li key={group.id}><strong>{index + 1}. Choose {renderPlainLocalizedText(group, 'name', page.languageMode, 'option')}</strong><span>{(group.options ?? []).map(optionText).join(' / ')}</span></li>)}</ol>;
  }
  return <div className="configurable-options compact-options">{groups.map((group) => <p key={group.id}><strong>{renderPlainLocalizedText(group, 'name', page.languageMode, 'Options')}:</strong> {(group.options ?? []).map(optionText).join(' / ')}</p>)}</div>;
}

function Badges({ dish, page }) {
  const badges = [...(dish.badges ?? [])];
  if (dish.discountPercent) {
    badges.unshift({ id: `${dish.id}_discount`, type: 'Promo', customText: `-${dish.discountPercent}%`, emoji: '' });
  }

  return badges.map((badge) => {
    const label = badge.type === 'Custom' ? badge.customText : badge.customText || badge.type;
    const preset = badgePreset(badge.type, Boolean(dish.discountPercent && badge.id === `${dish.id}_discount`));
    return <span className={`preview-badge badge-shape-${page.designSettings.badgeStyle?.shape ?? 'pill'}`} style={preset} key={badge.id}>{[badge.emoji, label].filter(Boolean).join(' ')}</span>;
  });
}

function badgePreset(type, isDiscount) {
  if (isDiscount || type === 'Promo') return { '--badge-preset-background': '#dc2626', '--badge-preset-text': '#ffffff' };
  if (type === 'New' || type === 'Vegan') return { '--badge-preset-background': '#16a34a', '--badge-preset-text': '#ffffff' };
  if (type === 'Spicy') return { '--badge-preset-background': '#ea580c', '--badge-preset-text': '#ffffff' };
  if (type === 'Hit') return { '--badge-preset-background': '#111827', '--badge-preset-text': '#ffffff' };
  if (type === 'Top') return { '--badge-preset-background': '#b7791f', '--badge-preset-text': '#ffffff' };
  return {};
}

function renderPlainLocalizedText(item, field, languageMode, fallback) {
  const english = item[`${field}En`] || '';
  const georgian = item[`${field}Ge`] || '';
  if (languageMode === 'ge') return georgian || english || fallback;
  if (languageMode === 'bilingual' && georgian) return `${english || fallback} / ${georgian}`;
  return english || georgian || fallback;
}

function renderLocalizedText(item, field, languageMode, fallback) {
  const english = item[`${field}En`] || '';
  const georgian = item[`${field}Ge`] || '';
  if (languageMode === 'ge') return georgian || english || fallback;
  if (languageMode === 'en') return english || georgian || fallback;
  return <><span className="localized-line">{english || fallback}</span>{georgian ? <span className="localized-line localized-ge">{georgian}</span> : null}</>;
}

function groupDishesByCategoryOrder(dishes) {
  const groups = new Map();
  dishes.forEach((dish) => {
    const key = dish.categoryId || 'uncategorized';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(dish);
  });
  return Array.from(groups.entries());
}

function itemSpan(placement = {}, fallbackSpan = '1x1') {
  const defaultSpan = fallbackSpan === '2x1' ? { colSpan: 2, rowSpan: 1 } : { colSpan: 1, rowSpan: 1 };
  return {
    colSpan: Math.max(1, Math.min(4, placement.colSpan ?? defaultSpan.colSpan)),
    rowSpan: Math.max(1, Math.min(4, placement.rowSpan ?? defaultSpan.rowSpan)),
  };
}

function heroSpan(settings) {
  if (settings.heroItemSpan === '3x2') return { colSpan: 3, rowSpan: 2 };
  if (settings.heroItemSpan === '2x1') return { colSpan: 2, rowSpan: 1 };
  return { colSpan: 2, rowSpan: 2 };
}

function placementForDish(dish, index, page) {
  const placement = page.itemPlacements?.[dish.id] ?? {};
  if (index === 0 && page.designSettings.makeFirstItemHero) return { ...placement, ...heroSpan(page.designSettings) };
  const span = itemSpan(placement, page.designSettings.defaultItemSpan);
  return { ...placement, ...span };
}

function packGridItems(dishes, page, effectiveRows) {
  const columns = Math.max(1, page.designSettings.customGrid.columns);
  const rows = Math.max(1, effectiveRows ?? page.designSettings.customGrid.rows);
  const occupied = Array.from({ length: rows }, () => Array(columns).fill(false));
  const sorted = [...dishes].sort((a, b) => (placementForDish(a, 0, page).priority ?? 0) - (placementForDish(b, 0, page).priority ?? 0));

  const canPlace = (row, col, colSpan, rowSpan) => row + rowSpan <= rows && col + colSpan <= columns && occupied.slice(row, row + rowSpan).every((line) => line.slice(col, col + colSpan).every((cell) => !cell));
  const mark = (row, col, colSpan, rowSpan) => {
    for (let r = row; r < row + rowSpan; r += 1) for (let c = col; c < col + colSpan; c += 1) occupied[r][c] = true;
  };

  return sorted.map((dish, index) => {
    const placement = placementForDish(dish, index, page);
    const colSpan = Math.min(placement.colSpan ?? 1, columns);
    const rowSpan = Math.min(placement.rowSpan ?? 1, rows);
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        if (canPlace(row, col, colSpan, rowSpan)) {
          mark(row, col, colSpan, rowSpan);
          return { dish, placement: { ...placement, colSpan, rowSpan }, gridArea: `${row + 1} / ${col + 1} / span ${rowSpan} / span ${colSpan}` };
        }
      }
    }
    return { dish, placement: { ...placement, colSpan: 1, rowSpan: 1 }, gridArea: 'auto' };
  });
}

function canPackItems(dishes, page, rows) {
  const columns = Math.max(1, page.designSettings.customGrid.columns);
  const occupied = Array.from({ length: rows }, () => Array(columns).fill(false));
  return dishes.every((dish, index) => {
    const placement = placementForDish(dish, index, page);
    const colSpan = Math.min(placement.colSpan ?? 1, columns);
    const rowSpan = Math.min(placement.rowSpan ?? 1, rows);
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        if (row + rowSpan <= rows && col + colSpan <= columns && occupied.slice(row, row + rowSpan).every((line) => line.slice(col, col + colSpan).every((cell) => !cell))) {
          for (let r = row; r < row + rowSpan; r += 1) for (let c = col; c < col + colSpan; c += 1) occupied[r][c] = true;
          return true;
        }
      }
    }
    return false;
  });
}

function ResizableGridItem({ dish, page, placement, gridArea, isSelected, onSelectDish, onResizeDish, children }) {
  const [drag, setDrag] = useState(null);
  const ref = useRef(null);
  const columns = Math.max(1, page.designSettings.customGrid.columns);
  const rows = Math.max(1, effectiveCustomGridRows(page.designSettings, null, page.selectedDishIds?.length ?? 1));

  const startResize = (event, axis) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setDrag({ axis, startX: event.clientX, startY: event.clientY, startColSpan: placement.colSpan ?? 1, startRowSpan: placement.rowSpan ?? 1, previousPlacement: placement });
    onSelectDish(dish.id);
  };

  useEffect(() => {
    if (!drag) return undefined;
    const onMove = (event) => {
      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      const nextColSpan = drag.axis.includes('x') ? Math.max(1, Math.min(columns, drag.startColSpan + Math.round(deltaX / Math.max(32, ref.current?.clientWidth || 120)))) : drag.startColSpan;
      const nextRowSpan = drag.axis.includes('y') ? Math.max(1, Math.min(rows, drag.startRowSpan + Math.round(deltaY / Math.max(32, ref.current?.clientHeight || 120)))) : drag.startRowSpan;
      onResizeDish(dish.id, { ...placement, colSpan: nextColSpan, rowSpan: nextRowSpan }, drag.previousPlacement);
    };
    const onUp = () => setDrag(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag, columns, rows, dish.id, onResizeDish, placement]);

  return <div ref={ref} onPointerDown={(event) => { event.stopPropagation(); onSelectDish(dish.id); }} className={`custom-grid-item resizable-grid-item ${isSelected ? 'selected-preview-card' : ''}`} style={{ gridArea }}>{children}<button type="button" className="resize-handle resize-x" onPointerDown={(event) => startResize(event, 'x')} aria-label="Resize card width" /><button type="button" className="resize-handle resize-y" onPointerDown={(event) => startResize(event, 'y')} aria-label="Resize card height" /><button type="button" className="resize-handle resize-xy" onPointerDown={(event) => startResize(event, 'xy')} aria-label="Resize card" /></div>;
}

function ResizableFluidItem({ dish, placement, page, totalWeight, isSelected, onSelectDish, onResizeStart, children }) {
  const ref = useRef(null);
  const startResize = (event, axis) => {
    event.preventDefault();
    event.stopPropagation();
    onResizeStart({ dishId: dish.id, axis, startX: event.clientX, startY: event.clientY });
  };

  return <div ref={ref} onPointerDown={(event) => { event.stopPropagation(); onSelectDish(dish.id); }} className={`fluid-grid-item resizable-grid-item ${isSelected ? 'selected-preview-card' : ''}`} style={{ flexGrow: placement.widthWeight ?? 1, flexBasis: `${Math.max(14, ((placement.widthWeight ?? 1) / Math.max(1, totalWeight)) * 100)}%`, minHeight: `${Math.max(80, 110 * (placement.heightWeight ?? 1))}px` }}>{children}<button type="button" className="resize-handle resize-x" onPointerDown={(event) => startResize(event, 'x')} aria-label="Resize card width" /><button type="button" className="resize-handle resize-y" onPointerDown={(event) => startResize(event, 'y')} aria-label="Resize card height" /><button type="button" className="resize-handle resize-xy" onPointerDown={(event) => startResize(event, 'xy')} aria-label="Resize card" /></div>;
}

function FreeResizeItem({ dish, page, placement, isSelected, onSelectDish, onResizeDish, children }) {
  const [drag, setDrag] = useState(null);
  const ref = useRef(null);
  const style = {
    left: `${placement.xPercent}%`,
    top: `${placement.yPercent}%`,
    width: `${placement.widthPercent}%`,
    height: `${placement.heightPercent}%`,
    zIndex: placement.zIndex ?? 1,
  };

  const startResize = (event, axis) => {
    event.preventDefault();
    event.stopPropagation();
    const parent = ref.current?.parentElement?.getBoundingClientRect();
    if (!parent) return;
    setDrag({ axis, startX: event.clientX, startY: event.clientY, start: placement, parent });
    onSelectDish(dish.id);
  };

  useEffect(() => {
    if (!drag) return undefined;
    const onMove = (event) => {
      const dx = ((event.clientX - drag.startX) / drag.parent.width) * 100;
      const dy = ((event.clientY - drag.startY) / drag.parent.height) * 100;
      const next = { ...drag.start };
      if (drag.axis.includes('x')) next.widthPercent = Math.min(100 - next.xPercent, Math.max(10, drag.start.widthPercent + dx));
      if (drag.axis.includes('y')) next.heightPercent = Math.min(100 - next.yPercent, Math.max(8, drag.start.heightPercent + dy));
      onResizeDish(dish.id, { ...next, mode: 'free' }, drag.start);
    };
    const onUp = () => setDrag(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag, dish.id, onResizeDish, placement]);

  return <div ref={ref} className={`free-resize-item resizable-grid-item ${isSelected ? 'selected-preview-card' : ''}`} onPointerDown={(event) => { event.stopPropagation(); onSelectDish(dish.id); }} style={style}>{children}<button type="button" className="resize-handle resize-x" onPointerDown={(event) => startResize(event, 'x')} aria-label="Resize card width" /><button type="button" className="resize-handle resize-y" onPointerDown={(event) => startResize(event, 'y')} aria-label="Resize card height" /><button type="button" className="resize-handle resize-xy" onPointerDown={(event) => startResize(event, 'xy')} aria-label="Resize card" /></div>;
}

function EmptyPage() {
  return <div className="preview-empty">Select categories and dishes to build this page.</div>;
}
