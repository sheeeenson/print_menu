import { useEffect, useRef, useState } from 'react';
import { PageFooterPreview } from './PageFooterPreview.jsx';
import { PageHeaderPreview } from './PageHeaderPreview.jsx';
import { calculateAutoFillGrid } from '../utils/autoFill.js';
import { calculateFitAllLayout, paperDimensions } from '../utils/fitAll.js';

const money = (value) => (typeof value === 'number' ? `${value.toFixed(value % 1 === 0 ? 0 : 2)} ₾` : '');

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
    const colSpan = Math.min(columns, placement?.colSpan ?? 1);
    const rowSpan = Math.max(1, placement?.rowSpan ?? 1);
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

const SUPPORTED_GRID_SPANS = Object.freeze([
  { colSpan: 1, rowSpan: 1 },
  { colSpan: 2, rowSpan: 1 },
  { colSpan: 1, rowSpan: 2 },
  { colSpan: 2, rowSpan: 2 },
  { colSpan: 3, rowSpan: 2 },
  { colSpan: 3, rowSpan: 3 },
]);


const FLUID_GRID_WARNING = 'Fluid grid cannot fit all selected dishes with current sizes. Reduce card size, hide descriptions, reduce image area, or use Smart auto-fit.';

function fluidPlacement(placement, index) {
  return {
    mode: 'fluid',
    widthWeight: clamp(placement?.mode === 'fluid' ? placement.widthWeight ?? 1 : placement?.widthWeight ?? 1, 0.5, 4),
    heightWeight: clamp(placement?.mode === 'fluid' ? placement.heightWeight ?? 1 : placement?.heightWeight ?? 1, 0.5, 4),
    minWidthPercent: clamp(placement?.minWidthPercent ?? 12, 5, 100),
    minHeightPercent: clamp(placement?.minHeightPercent ?? 8, 5, 100),
    maxWidthPercent: clamp(placement?.maxWidthPercent ?? 100, 5, 100),
    maxHeightPercent: clamp(placement?.maxHeightPercent ?? 100, 5, 100),
    order: placement?.order ?? index,
    colSpan: placement?.colSpan ?? 1,
    rowSpan: placement?.rowSpan ?? 1,
    priority: placement?.priority ?? 0,
  };
}

function fluidItemStyle(placement, itemCount) {
  const targetColumns = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(itemCount || 1))));
  const targetRows = Math.max(1, Math.ceil((itemCount || 1) / targetColumns));
  const baseWidth = 100 / targetColumns;
  const baseHeight = 100 / targetRows;
  const widthPercent = clamp(baseWidth * placement.widthWeight, placement.minWidthPercent, placement.maxWidthPercent);
  const heightPercent = clamp(baseHeight * placement.heightWeight, placement.minHeightPercent, placement.maxHeightPercent);
  return {
    '--fluid-basis': `${widthPercent}%`,
    '--fluid-height': `${heightPercent}%`,
    '--fluid-grow': placement.widthWeight,
    order: placement.order,
  };
}

function FluidGridPreview({ dishes, page, selectedDishId, onSelectDish, onResizeDish, onFitWarning }) {
  const gridRef = useRef(null);
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const checkFit = () => {
      const hasOverflow = grid.scrollHeight > grid.clientHeight + 2 || grid.scrollWidth > grid.clientWidth + 2;
      onFitWarning(hasOverflow ? FLUID_GRID_WARNING : '');
    };
    checkFit();
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(checkFit) : null;
    resizeObserver?.observe(grid);
    return () => resizeObserver?.disconnect();
  }, [dishes.length, page.itemPlacements, page.designSettings.cardGap, page.designSettings.cardPadding, page.designSettings.imageHeight, onFitWarning]);

  if (!dishes.length) return <EmptyPage />;
  return (
    <div ref={gridRef} className="fluid-grid" aria-label="Fluid grid dish layout" onPointerDown={(event) => { if (event.target === event.currentTarget) onSelectDish(''); }}>
      {dishes.map((dish, index) => {
        const placement = fluidPlacement(page.itemPlacements?.[dish.id], index);
        const isSelected = selectedDishId === dish.id;
        return (
          <div
            className={`fluid-grid-item preview-selectable-item ${isSelected ? 'selected-preview-item' : ''}`}
            key={dish.id}
            style={fluidItemStyle(placement, dishes.length)}
            onPointerDown={(event) => { event.stopPropagation(); onSelectDish(dish.id); }}
          >
            <DishCard dish={dish} page={page} isHero={index === 0 && page.designSettings.makeFirstItemHero} />
            {isSelected ? <FluidResizeHandles gridRef={gridRef} dishId={dish.id} placement={placement} itemCount={dishes.length} onResize={onResizeDish} /> : null}
          </div>
        );
      })}
    </div>
  );
}

function FluidResizeHandles({ gridRef, dishId, placement, itemCount, onResize }) {
  const dragState = useRef(null);
  const startDrag = (handle) => (event) => {
    event.preventDefault();
    event.stopPropagation();
    const grid = gridRef.current;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    const targetColumns = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(itemCount || 1))));
    const targetRows = Math.max(1, Math.ceil((itemCount || 1) / targetColumns));
    dragState.current = {
      handle,
      rect,
      startX: event.clientX,
      startY: event.clientY,
      startPlacement: placement,
      baseWidth: 100 / targetColumns,
      baseHeight: 100 / targetRows,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const continueDrag = (event) => {
    const state = dragState.current;
    if (!state) return;
    event.preventDefault();
    event.stopPropagation();
    const dxPercent = ((event.clientX - state.startX) / Math.max(1, state.rect.width)) * 100;
    const dyPercent = ((event.clientY - state.startY) / Math.max(1, state.rect.height)) * 100;
    const next = { ...state.startPlacement, mode: 'fluid' };
    if (state.handle !== 'bottom') next.widthWeight = clamp(Number((state.startPlacement.widthWeight + dxPercent / state.baseWidth).toFixed(2)), 0.5, 4);
    if (state.handle !== 'right') next.heightWeight = clamp(Number((state.startPlacement.heightWeight + dyPercent / state.baseHeight).toFixed(2)), 0.5, 4);
    onResize(dishId, next);
  };
  const stopDrag = (event) => {
    if (!dragState.current) return;
    event.preventDefault();
    event.stopPropagation();
    dragState.current = null;
  };
  return (
    <div className="preview-resize-handles fluid-resize-handles" aria-hidden="true">
      <span className="resize-handle resize-handle-visual resize-handle-top-left" />
      {['right', 'bottom', 'bottom-right'].map((handle) => (
        <span key={handle} className={`resize-handle resize-handle-${handle}`} onPointerDown={startDrag(handle)} onPointerMove={continueDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} />
      ))}
    </div>
  );
}

function CustomGridPreview({ dishes, page, fitAllLayout, selectedDishId, onSelectDish, onResizeDish, className = 'custom-grid', ariaLabel = 'Custom dish grid' }) {
  const gridRef = useRef(null);
  if (!dishes.length) return <EmptyPage />;
  return (
    <div ref={gridRef} className={className} aria-label={ariaLabel} onPointerDown={(event) => { if (event.target === event.currentTarget) onSelectDish(''); }}>
      {dishes.map((dish, index) => {
        const placement = page.itemPlacements?.[dish.id];
        const defaultSpan = itemSpanForIndex(index, page.designSettings);
        const colSpan = Math.min(page.designSettings.customGrid.columns, placement?.colSpan ?? defaultSpan.colSpan);
        const rowSpan = Math.min(page.designSettings.customGrid.rows, placement?.rowSpan ?? defaultSpan.rowSpan);
        const isSelected = selectedDishId === dish.id;
        return (
          <div
            className={`custom-grid-item preview-selectable-item ${isSelected ? 'selected-preview-item' : ''}`}
            key={dish.id}
            style={{ '--col-span': colSpan, '--row-span': rowSpan }}
            onPointerDown={(event) => {
              event.stopPropagation();
              onSelectDish(dish.id);
            }}
          >
            <DishCard dish={dish} page={page} hideDescription={fitAllLayout?.hideDescriptions} isHero={index === 0 && page.designSettings.makeFirstItemHero} />
            {isSelected ? (
              <ResizeHandles
                gridRef={gridRef}
                dishId={dish.id}
                page={page}
                currentPlacement={{ colSpan, rowSpan, priority: placement?.priority ?? 0 }}
                onResize={onResizeDish}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}


function FreeResizePreview({ dishes, page, selectedDishId, onSelectDish, onResizeDish }) {
  const areaRef = useRef(null);
  if (!dishes.length) return <EmptyPage />;
  return (
    <div ref={areaRef} className="free-resize-canvas" aria-label="Free resize dish layout" onPointerDown={(event) => { if (event.target === event.currentTarget) onSelectDish(''); }}>
      {dishes.map((dish, index) => {
        const placement = freePlacement(page.itemPlacements?.[dish.id], index, dishes.length);
        const isSelected = selectedDishId === dish.id;
        return (
          <div
            key={dish.id}
            className={`free-resize-item preview-selectable-item ${isSelected ? 'selected-preview-item' : ''}`}
            style={{ left: `${placement.xPercent}%`, top: `${placement.yPercent}%`, width: `${placement.widthPercent}%`, height: `${placement.heightPercent}%`, zIndex: placement.zIndex }}
            onPointerDown={(event) => { event.stopPropagation(); onSelectDish(dish.id); }}
          >
            <DishCard dish={dish} page={page} isHero={index === 0 && page.designSettings.makeFirstItemHero} />
            {isSelected ? <FreeResizeHandles areaRef={areaRef} dishId={dish.id} placement={placement} onResize={onResizeDish} /> : null}
          </div>
        );
      })}
    </div>
  );
}

function freePlacement(placement, index, count) {
  const columns = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(count || 1))));
  const rows = Math.max(1, Math.ceil((count || 1) / columns));
  const width = 100 / columns;
  const height = 100 / rows;
  const col = index % columns;
  const row = Math.floor(index / columns);
  const base = placement?.mode === 'free'
    ? placement
    : {
        mode: 'free',
        xPercent: col * width,
        yPercent: row * height,
        widthPercent: width,
        heightPercent: height,
        zIndex: index + 1,
      };
  return clampFreePlacement(base);
}

function clampFreePlacement(placement) {
  const width = clamp(placement.widthPercent ?? 30, 4, 100);
  const height = clamp(placement.heightPercent ?? 22, 4, 100);
  return {
    mode: 'free',
    widthPercent: width,
    heightPercent: height,
    xPercent: clamp(placement.xPercent ?? 0, 0, 100 - width),
    yPercent: clamp(placement.yPercent ?? 0, 0, 100 - height),
    zIndex: Math.max(1, placement.zIndex ?? 1),
  };
}

function FreeResizeHandles({ areaRef, dishId, placement, onResize }) {
  const dragState = useRef(null);
  const startDrag = (handle) => (event) => {
    event.preventDefault();
    event.stopPropagation();
    const area = areaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    dragState.current = {
      handle,
      rect,
      startX: event.clientX,
      startY: event.clientY,
      start: placement,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const continueDrag = (event) => {
    const state = dragState.current;
    if (!state) return;
    event.preventDefault();
    event.stopPropagation();
    const dx = ((event.clientX - state.startX) / Math.max(1, state.rect.width)) * 100;
    const dy = ((event.clientY - state.startY) / Math.max(1, state.rect.height)) * 100;
    const next = { ...state.start };
    if (state.handle === 'move') {
      next.xPercent = state.start.xPercent + dx;
      next.yPercent = state.start.yPercent + dy;
    } else {
      if (state.handle !== 'bottom') next.widthPercent = state.start.widthPercent + dx;
      if (state.handle !== 'right') next.heightPercent = state.start.heightPercent + dy;
    }
    onResize(dishId, clampFreePlacement(next));
  };
  const stopDrag = (event) => {
    if (!dragState.current) return;
    event.preventDefault();
    event.stopPropagation();
    dragState.current = null;
  };
  return (
    <div className="preview-resize-handles free-resize-handles" aria-hidden="true">
      <span className="free-move-layer" onPointerDown={startDrag('move')} onPointerMove={continueDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} />
      {['right', 'bottom', 'bottom-right'].map((handle) => (
        <span key={handle} className={`resize-handle resize-handle-${handle}`} onPointerDown={startDrag(handle)} onPointerMove={continueDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} />
      ))}
    </div>
  );
}

function ClassicColumnsPreview({ dishes, page }) {
  if (!dishes.length) return <EmptyPage />;
  const columns = page.designSettings.classicColumns ?? 2;
  const rows = Math.max(1, Math.ceil(dishes.length / columns));
  return (
    <div className="classic-columns-grid" style={{ '--classic-rows': rows }} aria-label="Classic column dish layout">
      {dishes.map((dish) => <DishCard key={dish.id} dish={dish} page={page} />)}
    </div>
  );
}

function ResizeHandles({ gridRef, dishId, page, currentPlacement, onResize }) {
  const dragState = useRef(null);

  const startDrag = (handle) => (event) => {
    event.preventDefault();
    event.stopPropagation();
    const grid = gridRef.current;
    if (!grid) return;
    const styles = window.getComputedStyle(grid);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0;
    const rect = grid.getBoundingClientRect();
    const columns = page.designSettings.customGrid.columns;
    const rows = page.designSettings.customGrid.rows;
    const cellWidth = (rect.width - gap * Math.max(0, columns - 1)) / columns;
    const cellHeight = (rect.height - gap * Math.max(0, rows - 1)) / rows;
    dragState.current = {
      handle,
      startX: event.clientX,
      startY: event.clientY,
      startColSpan: currentPlacement.colSpan,
      startRowSpan: currentPlacement.rowSpan,
      cellWidth: Math.max(1, cellWidth + gap),
      cellHeight: Math.max(1, cellHeight + gap),
      lastColSpan: currentPlacement.colSpan,
      lastRowSpan: currentPlacement.rowSpan,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const continueDrag = (event) => {
    const state = dragState.current;
    if (!state) return;
    event.preventDefault();
    event.stopPropagation();
    const deltaColumns = state.handle === 'bottom' ? 0 : Math.round((event.clientX - state.startX) / state.cellWidth);
    const deltaRows = state.handle === 'right' ? 0 : Math.round((event.clientY - state.startY) / state.cellHeight);
    const requested = {
      colSpan: clamp(state.startColSpan + deltaColumns, 1, page.designSettings.customGrid.columns),
      rowSpan: clamp(state.startRowSpan + deltaRows, 1, page.designSettings.customGrid.rows),
    };
    const nextSpan = nearestSupportedSpan(requested, page.designSettings.customGrid.columns, page.designSettings.customGrid.rows, state.handle);
    if (nextSpan.colSpan === state.lastColSpan && nextSpan.rowSpan === state.lastRowSpan) return;
    const accepted = onResize(dishId, { ...currentPlacement, ...nextSpan }, { ...currentPlacement, colSpan: state.lastColSpan, rowSpan: state.lastRowSpan });
    if (accepted) {
      state.lastColSpan = nextSpan.colSpan;
      state.lastRowSpan = nextSpan.rowSpan;
    }
  };
  const stopDrag = (event) => {
    if (!dragState.current) return;
    event.preventDefault();
    event.stopPropagation();
    dragState.current = null;
  };
  return (
    <div className="preview-resize-handles" aria-hidden="true">
      <span className="resize-handle resize-handle-visual resize-handle-top-left" />
      {['right', 'bottom', 'bottom-right'].map((handle) => (
        <span
          key={handle}
          className={`resize-handle resize-handle-${handle}`}
          onPointerDown={startDrag(handle)}
          onPointerMove={continueDrag}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
        />
      ))}
    </div>
  );
}

function nearestSupportedSpan(requested, maxColumns, maxRows, handle) {
  const allowed = SUPPORTED_GRID_SPANS.filter((span) => span.colSpan <= maxColumns && span.rowSpan <= maxRows);
  const compatible = allowed.filter((span) => {
    if (handle === 'right') return span.rowSpan === requested.rowSpan;
    if (handle === 'bottom') return span.colSpan === requested.colSpan;
    return true;
  });

  const candidates = compatible.length ? compatible : allowed;
  return candidates.reduce((best, span) => {
    const score = Math.abs(span.colSpan - requested.colSpan) + Math.abs(span.rowSpan - requested.rowSpan);
    const bestScore = Math.abs(best.colSpan - requested.colSpan) + Math.abs(best.rowSpan - requested.rowSpan);
    return score < bestScore ? span : best;
  }, candidates[0] ?? { colSpan: 1, rowSpan: 1 });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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
