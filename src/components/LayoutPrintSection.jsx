import { useState } from 'react';
import { DesignControls } from './DesignControls.jsx';
import { FooterSettingsPanel } from './FooterSettingsPanel.jsx';
import { HeaderSettingsPanel } from './HeaderSettingsPanel.jsx';
import { PageContentSelector } from './PageContentSelector.jsx';
import { PageList } from './PageList.jsx';
import { PagePreview } from './PagePreview.jsx';
import { PageSettingsPanel } from './PageSettingsPanel.jsx';
import { calculateFitAllLayout, paperDimensions } from '../utils/fitAll.js';

const DEFAULT_ITEM_NUMBER_BADGE = Object.freeze({
  enabled: true,
  size: 100,
  shape: 'circle',
  backgroundColor: '#231f20',
  textColor: '#fffaf2',
  borderColor: '#fffaf2',
  borderWidth: 1,
  opacity: 90,
});

const itemNumberBadgeSettings = (page) => ({ ...DEFAULT_ITEM_NUMBER_BADGE, ...(page.designSettings.itemNumberBadge ?? {}) });
const safeCssColor = (value, fallback) => (/^#[0-9a-fA-F]{3,8}$/.test(value ?? '') ? value : fallback);

export function LayoutPrintSection({ project, actions }) {
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedPreviewDishId, setSelectedPreviewDishId] = useState('');
  const selectedPage = project.pages.find((page) => page.id === project.selectedPageId) ?? project.pages[0];
  const previewProject = selectedPage ? projectWithPageOrder(project, selectedPage) : project;
  const fitWarning = selectedPage ? getFitWarning(previewProject, selectedPage) : '';
  const selectedPreviewDish = selectedPage && selectedPreviewDishId
    ? project.dishes.find((dish) => dish.id === selectedPreviewDishId && selectedPage.selectedDishIds?.includes(dish.id))
    : null;
  const printPage = () => window.print();
  const confirmSaveAsPdf = () => {
    setIsPdfModalOpen(false);
    window.print();
  };
  const selectPageFromList = (pageId) => {
    actions.selectPage(pageId);
  };

  return (
    <section className="layout-print-section" aria-label="Layout workspace">
      {selectedPage ? <ItemNumberBadgeStyle page={selectedPage} /> : null}
      <aside className="layout-admin-panel layout-sidebar">
        {fitWarning ? <div className="panel-fit-warning" role="alert">{fitWarning}</div> : null}
        <PageList project={project} actions={actions} onSelectPage={selectPageFromList} />
        {selectedPage ? <PageSettingsPanel page={selectedPage} actions={actions} /> : null}
        {selectedPage ? <PageContentSelector project={project} page={selectedPage} actions={actions} /> : null}
        {selectedPage ? (
          <LayoutPrintControls
            page={selectedPage}
            actions={actions}
            onPrint={printPage}
            onSaveAsPdf={() => setIsPdfModalOpen(true)}
            selectedDish={selectedPreviewDish}
          />
        ) : null}
        {selectedPage ? <HeaderSettingsPanel page={selectedPage} actions={actions} /> : null}
        {selectedPage ? <FooterSettingsPanel page={selectedPage} actions={actions} /> : null}
      </aside>
      {selectedPage ? <PagePreview project={previewProject} page={selectedPage} selectedPreviewDishId={selectedPreviewDishId} onSelectPreviewDish={setSelectedPreviewDishId} onResizePreviewDish={actions.updateSelectedPageItemPlacement} /> : <div className="empty-state">Add a page to preview your menu.</div>}
      {selectedPage ? (
        <aside className="advanced-admin-panel">
          <section className="panel-section advanced-layout-section">
            <div className="advanced-panel-header">
              <span className="advanced-panel-icon" aria-hidden="true">☷</span>
              <div>
                <p className="eyebrow">Advanced</p>
                <h2>Advanced layout controls</h2>
              </div>
            </div>
            <p className="muted-text">Fine visual controls, typography, spacing, colors, and technical layout tuning.</p>
            <DesignControls page={selectedPage} actions={actions} />
          </section>
        </aside>
      ) : null}
      {isPdfModalOpen ? <SavePdfModal onCancel={() => setIsPdfModalOpen(false)} onConfirm={confirmSaveAsPdf} /> : null}
    </section>
  );
}

function LayoutPrintControls({ page, actions, onPrint, onSaveAsPdf, selectedDish }) {
  const settings = page.designSettings;
  const numberBadge = itemNumberBadgeSettings(page);
  const selectedPlacement = selectedDish ? page.itemPlacements?.[selectedDish.id] : null;
  const update = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    actions.updateSelectedPageDesign(field, value);
  };
  const updateNumber = (field) => (event) => actions.updateSelectedPageDesign(field, Number(event.target.value));
  const updateItemNumberBadge = (changes) => actions.updateSelectedPageDesign('itemNumberBadge', { ...numberBadge, ...changes });
  const updateLayoutMode = (event) => {
    const layoutMode = event.target.value;
    actions.updateSelectedPage({
      designSettings: {
        ...settings,
        layoutMode,
        gridMode: layoutMode === 'smartAutoFit' ? 'autoFill' : 'preset',
        resizeMode: layoutMode === 'manualDesigner' ? 'freeResize' : settings.resizeMode,
        gridPreset: layoutMode === 'classicColumns' ? columnPresetFor(settings.classicColumns) : settings.gridPreset,
      },
    });
  };
  const updateClassicColumns = (event) => {
    const classicColumns = Number(event.target.value);
    actions.updateSelectedPage({ designSettings: { ...settings, classicColumns, gridPreset: columnPresetFor(classicColumns), layoutMode: 'classicColumns', gridMode: 'preset' } });
  };
  const updateCardStyle = (event) => {
    const cardStyle = event.target.value;
    actions.updateSelectedPage({
      designSettings: {
        ...settings,
        cardStyle,
        showImages: cardStyle !== 'textOnly',
        cardContentLayout: { imageTop: 'below', imageLeft: 'imageLeft', imageRight: 'imageRight', textOnly: settings.cardContentLayout }[cardStyle],
      },
    });
  };

  return (
    <div className="panel-section preview-controls layout-print-controls">
      <p className="eyebrow">Layout</p>
      <h2>Layout</h2>
      <div className="print-action-row" aria-label="Print and demo actions">
        <button className="primary-action compact" type="button" onClick={onPrint}>🖨️ Print</button>
        <button className="secondary-action compact" type="button" onClick={onSaveAsPdf}>📄 Save as PDF</button>
        <button className="secondary-action compact" type="button" onClick={actions.resetDemoData}>↻ Reset demo data</button>
      </div>

      <label className="field-label">Layout mode
        <select value={settings.layoutMode} onChange={updateLayoutMode}>
          <option value="classicColumns">Classic columns</option>
          <option value="smartAutoFit">Smart auto-fit</option>
          <option value="manualDesigner">Manual designer</option>
        </select>
      </label>
      {settings.layoutMode === 'classicColumns' ? (
        <label className="field-label">Classic columns
          <select value={settings.classicColumns} onChange={updateClassicColumns}>
            {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      ) : null}
      <label className="field-label">Card style
        <select value={settings.cardStyle} onChange={updateCardStyle}>
          <option value="imageTop">Image top</option>
          <option value="imageLeft">Image left</option>
          <option value="imageRight">Image right</option>
          <option value="textOnly">Text only</option>
        </select>
      </label>
      {settings.layoutMode === 'manualDesigner' ? (
        <p className="muted-text">Manual designer uses free positioning and free resize inside the printable content area.</p>
      ) : null}

      <section className="settings-block image-settings-block">
        <h3>Image display</h3>
        <label className="toggle-label">
          <input type="checkbox" checked={settings.showImages} onChange={update('showImages')} />
          Show images
        </label>
        <label className="field-label">Image position
          <select value={settings.imagePosition} onChange={update('imagePosition')} disabled={!settings.showImages || settings.cardStyle === 'textOnly'}>
            <option value="center">Center</option>
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label className="slider-label"><span>Image zoom<strong>{settings.imageZoom}%</strong></span><input type="range" min="50" max="200" value={settings.imageZoom} onChange={updateNumber('imageZoom')} disabled={!settings.showImages || settings.cardStyle === 'textOnly'} /></label>
        <label className="slider-label"><span>Image area<strong>{settings.imageAreaPercent}%</strong></span><input type="range" min="10" max="80" value={settings.imageAreaPercent} onChange={updateNumber('imageAreaPercent')} disabled={!settings.showImages || settings.cardStyle === 'textOnly'} /></label>
      </section>

      <section className="settings-block content-settings-block">
        <h3>Content</h3>
        <label className="toggle-label">
          <input type="checkbox" checked={settings.showDescriptions} onChange={update('showDescriptions')} />
          Show descriptions
        </label>
        <p className="muted-text">Prices always stay pinned to the bottom of every card.</p>
      </section>

      <section className="inline-advanced-controls settings-block item-number-settings-block">
        <h3>Item numbers</h3>
        <label className="toggle-label">
          <input type="checkbox" checked={numberBadge.enabled} onChange={(event) => updateItemNumberBadge({ enabled: event.target.checked })} />
          Show item numbers
        </label>
        <label className="slider-label"><span>Number size<strong>{numberBadge.size}%</strong></span><input type="range" min="55" max="170" value={numberBadge.size} onChange={(event) => updateItemNumberBadge({ size: Number(event.target.value) })} /></label>
        <label className="field-label">Number shape
          <select value={numberBadge.shape} onChange={(event) => updateItemNumberBadge({ shape: event.target.value })}>
            <option value="circle">Circle</option>
            <option value="rounded">Rounded</option>
            <option value="square">Square</option>
            <option value="outlineCircle">Outline circle</option>
            <option value="outlineRounded">Outline rounded</option>
          </select>
        </label>
        <label className="color-label">Fill<span><input type="color" value={numberBadge.backgroundColor} onChange={(event) => updateItemNumberBadge({ backgroundColor: event.target.value })} /><input value={numberBadge.backgroundColor} onChange={(event) => updateItemNumberBadge({ backgroundColor: event.target.value })} /></span></label>
        <label className="color-label">Text<span><input type="color" value={numberBadge.textColor} onChange={(event) => updateItemNumberBadge({ textColor: event.target.value })} /><input value={numberBadge.textColor} onChange={(event) => updateItemNumberBadge({ textColor: event.target.value })} /></span></label>
        <label className="color-label">Border<span><input type="color" value={numberBadge.borderColor} onChange={(event) => updateItemNumberBadge({ borderColor: event.target.value })} /><input value={numberBadge.borderColor} onChange={(event) => updateItemNumberBadge({ borderColor: event.target.value })} /></span></label>
        <label className="slider-label"><span>Border width<strong>{numberBadge.borderWidth}px</strong></span><input type="range" min="0" max="8" value={numberBadge.borderWidth} onChange={(event) => updateItemNumberBadge({ borderWidth: Number(event.target.value) })} /></label>
        <label className="slider-label"><span>Opacity<strong>{numberBadge.opacity}%</strong></span><input type="range" min="10" max="100" value={numberBadge.opacity} onChange={(event) => updateItemNumberBadge({ opacity: Number(event.target.value) })} /></label>
      </section>

      {settings.layoutMode === 'manualDesigner' ? (
        <SelectedCardControls page={page} actions={actions} selectedDish={selectedDish} placement={selectedPlacement} />
      ) : null}

      <section className="inline-advanced-controls settings-block badge-settings-block">
        <h3>Badge style</h3>
        <label className="field-label">Badge position
          <select value={settings.badgePosition} onChange={update('badgePosition')}>
            <option value="topLeft">Top left</option>
            <option value="topRight">Top right</option>
            <option value="bottomLeft">Bottom left</option>
            <option value="bottomRight">Bottom right</option>
          </select>
        </label>
        <label className="color-label">Badge background<span><input type="color" value={settings.badgeStyle.backgroundColor} onChange={(event) => actions.updateSelectedPageDesign('badgeStyle', { ...settings.badgeStyle, backgroundColor: event.target.value })} /><input value={settings.badgeStyle.backgroundColor} onChange={(event) => actions.updateSelectedPageDesign('badgeStyle', { ...settings.badgeStyle, backgroundColor: event.target.value })} /></span></label>
        <label className="color-label">Badge text<span><input type="color" value={settings.badgeStyle.textColor} onChange={(event) => actions.updateSelectedPageDesign('badgeStyle', { ...settings.badgeStyle, textColor: event.target.value })} /><input value={settings.badgeStyle.textColor} onChange={(event) => actions.updateSelectedPageDesign('badgeStyle', { ...settings.badgeStyle, textColor: event.target.value })} /></span></label>
        <label className="color-label">Badge border<span><input type="color" value={settings.badgeStyle.borderColor === 'transparent' ? '#000000' : settings.badgeStyle.borderColor} onChange={(event) => actions.updateSelectedPageDesign('badgeStyle', { ...settings.badgeStyle, borderColor: event.target.value })} /><input value={settings.badgeStyle.borderColor} onChange={(event) => actions.updateSelectedPageDesign('badgeStyle', { ...settings.badgeStyle, borderColor: event.target.value })} /></span></label>
        <label className="slider-label"><span>Badge border width<strong>{settings.badgeStyle.borderWidth}px</strong></span><input type="range" min="0" max="8" value={settings.badgeStyle.borderWidth} onChange={(event) => actions.updateSelectedPageDesign('badgeStyle', { ...settings.badgeStyle, borderWidth: Number(event.target.value) })} /></label>
        <label className="slider-label"><span>Badge opacity<strong>{settings.badgeStyle.opacity}%</strong></span><input type="range" min="0" max="100" value={settings.badgeStyle.opacity} onChange={(event) => actions.updateSelectedPageDesign('badgeStyle', { ...settings.badgeStyle, opacity: Number(event.target.value) })} /></label>
        <label className="field-label">Badge shape<select value={settings.badgeStyle.shape} onChange={(event) => actions.updateSelectedPageDesign('badgeStyle', { ...settings.badgeStyle, shape: event.target.value })}><option value="pill">Pill</option><option value="rounded">Rounded</option><option value="square">Square</option><option value="circle">Circle</option><option value="ribbon">Ribbon</option></select></label>
      </section>

      <section className="inline-advanced-controls settings-block">
        <h3>Card border</h3>
        <label className="toggle-label"><input type="checkbox" checked={settings.cardBorderEnabled} onChange={update('cardBorderEnabled')} /> Border enabled</label>
        <label className="color-label">Card border color<span><input type="color" value={settings.cardBorderColor} onChange={update('cardBorderColor')} disabled={!settings.cardBorderEnabled} /><input value={settings.cardBorderColor} onChange={update('cardBorderColor')} disabled={!settings.cardBorderEnabled} /></span></label>
        <label className="slider-label"><span>Card border width<strong>{settings.cardBorderWidth}px</strong></span><input type="range" min="0" max="12" step="1" value={settings.cardBorderWidth} disabled={!settings.cardBorderEnabled} onChange={updateNumber('cardBorderWidth')} /></label>
        <label className="slider-label"><span>Card border opacity<strong>{settings.cardBorderOpacity}%</strong></span><input type="range" min="0" max="100" step="1" value={settings.cardBorderOpacity} disabled={!settings.cardBorderEnabled} onChange={updateNumber('cardBorderOpacity')} /></label>
      </section>
    </div>
  );
}

function ItemNumberBadgeStyle({ page }) {
  const badge = itemNumberBadgeSettings(page);
  const isOutline = badge.shape === 'outlineCircle' || badge.shape === 'outlineRounded';
  const radius = badge.shape === 'square' ? '0px' : badge.shape === 'rounded' || badge.shape === 'outlineRounded' ? '8px' : '999px';
  const background = isOutline ? 'transparent' : safeCssColor(badge.backgroundColor, DEFAULT_ITEM_NUMBER_BADGE.backgroundColor);
  const borderWidth = isOutline ? Math.max(1, Number(badge.borderWidth ?? 1)) : Number(badge.borderWidth ?? 0);
  const css = `.print-page .preview-image-box::after{--item-number-scale:${Number(badge.size ?? 100) / 100};background:${background};color:${safeCssColor(badge.textColor, DEFAULT_ITEM_NUMBER_BADGE.textColor)};border-color:${safeCssColor(badge.borderColor, DEFAULT_ITEM_NUMBER_BADGE.borderColor)};border-width:${borderWidth}px;border-radius:${radius};opacity:${Number(badge.opacity ?? 100) / 100};display:${badge.enabled ? 'inline-grid' : 'none'};}`;
  return <style>{css}</style>;
}

function columnPresetFor(columns) {
  return { 1: 'oneColumn', 2: 'twoColumns', 3: 'threeColumns', 4: 'fourColumns', 5: 'fiveColumns' }[columns] ?? 'twoColumns';
}

function SelectedCardControls({ page, actions, selectedDish, placement }) {
  const current = {
    mode: 'free',
    xPercent: placement?.xPercent ?? 0,
    yPercent: placement?.yPercent ?? 0,
    widthPercent: placement?.widthPercent ?? 30,
    heightPercent: placement?.heightPercent ?? 22,
    zIndex: placement?.zIndex ?? 1,
  };
  const updatePlacement = (changes) => {
    if (!selectedDish) return;
    actions.updateSelectedPageItemPlacement(selectedDish.id, { ...current, ...changes, mode: 'free' });
  };
  const updatePercent = (field) => (event) => {
    const value = Number(event.target.value);
    if (field === 'xPercent') updatePlacement({ xPercent: Math.min(value, 100 - current.widthPercent) });
    else if (field === 'yPercent') updatePlacement({ yPercent: Math.min(value, 100 - current.heightPercent) });
    else if (field === 'widthPercent') updatePlacement({ widthPercent: value, xPercent: Math.min(current.xPercent, 100 - value) });
    else if (field === 'heightPercent') updatePlacement({ heightPercent: value, yPercent: Math.min(current.yPercent, 100 - value) });
    else updatePlacement({ [field]: value });
  };

  return (
    <div className="selected-card-controls" aria-live="polite">
      <div>
        <p className="eyebrow">Selected card</p>
        <strong>{selectedDish?.nameEn || 'Click a preview card'}</strong>
        <small>{selectedDish ? `${current.widthPercent}% × ${current.heightPercent}%` : 'Select a preview card to edit its size.'}</small>
      </div>
      <div className="selected-free-controls">
        <label className="field-label">Width %<input type="number" min="10" max="100" value={current.widthPercent} onChange={updatePercent('widthPercent')} disabled={!selectedDish} /></label>
        <label className="field-label">Height %<input type="number" min="8" max="100" value={current.heightPercent} onChange={updatePercent('heightPercent')} disabled={!selectedDish} /></label>
        <label className="field-label">X %<input type="number" min="0" max="100" value={current.xPercent} onChange={updatePercent('xPercent')} disabled={!selectedDish} /></label>
        <label className="field-label">Y %<input type="number" min="0" max="100" value={current.yPercent} onChange={updatePercent('yPercent')} disabled={!selectedDish} /></label>
        <label className="field-label">Z-index<input type="number" min="1" max="999" value={current.zIndex} onChange={updatePercent('zIndex')} disabled={!selectedDish} /></label>
      </div>
      <div className="print-action-row">
        <button className="secondary-action compact" type="button" onClick={() => selectedDish && actions.resetSelectedPageItemPlacement(selectedDish.id)} disabled={!selectedDish}>Reset selected card</button>
        <button className="secondary-action compact" type="button" onClick={actions.resetSelectedPageItemPlacements}>Reset all card sizes</button>
      </div>
    </div>
  );
}

function SavePdfModal({ onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="instruction-modal" role="dialog" aria-modal="true" aria-labelledby="save-pdf-title">
        <p className="eyebrow">Browser PDF export</p>
        <h2 id="save-pdf-title">Save as PDF</h2>
        <p>
          Choose Save as PDF in the browser print dialog. Set scale to 100%, select correct paper size, and enable background graphics.
        </p>
        <div className="modal-actions">
          <button className="secondary-action compact" type="button" onClick={onCancel}>Cancel</button>
          <button className="primary-action compact" type="button" onClick={onConfirm}>Open print dialog</button>
        </div>
      </div>
    </div>
  );
}

function projectWithPageOrder(project, page) {
  const selectedCategoryIds = page.selectedCategoryIds ?? [];
  const selectedDishIds = page.selectedDishIds ?? [];
  const categoryOrder = new Map(selectedCategoryIds.map((categoryId, index) => [categoryId, index]));
  const dishOrder = new Map(selectedDishIds.map((dishId, index) => [dishId, index]));
  return {
    ...project,
    categories: [...project.categories].sort((a, b) => (categoryOrder.get(a.id) ?? 99999) - (categoryOrder.get(b.id) ?? 99999)),
    dishes: [...project.dishes].sort((a, b) => {
      const categoryCompare = (categoryOrder.get(a.categoryId) ?? 99999) - (categoryOrder.get(b.categoryId) ?? 99999);
      if (categoryCompare !== 0) return categoryCompare;
      return (dishOrder.get(a.id) ?? 99999) - (dishOrder.get(b.id) ?? 99999);
    }),
  };
}

function getFitWarning(project, page) {
  if (!page.designSettings.fitAllItems) return '';
  const selectedCategoryIds = new Set(page.selectedCategoryIds ?? []);
  const selectedDishIds = new Set(page.selectedDishIds ?? []);
  const itemCount = project.dishes.filter((dish) => dish.visible && selectedCategoryIds.has(dish.categoryId) && selectedDishIds.has(dish.id)).length;
  const paper = paperDimensions(page.paperSize, page.orientation);
  const layout = calculateFitAllLayout({
    itemCount,
    pageWidthPx: paper.width,
    pageHeightPx: paper.height,
    headerHeight: page.header?.enabled ? page.header?.height : 0,
    footerHeight: page.footer?.enabled ? page.footer?.height : 0,
    pageMargin: page.designSettings.pageMargin,
    cardGap: page.designSettings.cardGap,
    baseDesignSettings: page.designSettings,
    fitStrategy: page.designSettings.fitStrategy,
  });
  return layout.success ? '' : layout.warning;
}
