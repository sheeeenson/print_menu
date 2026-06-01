import { useState } from 'react';
import { DesignControls } from './DesignControls.jsx';
import { FooterSettingsPanel } from './FooterSettingsPanel.jsx';
import { HeaderSettingsPanel } from './HeaderSettingsPanel.jsx';
import { PageContentSelector } from './PageContentSelector.jsx';
import { PageList } from './PageList.jsx';
import { PagePreview } from './PagePreview.jsx';
import { PageSettingsPanel } from './PageSettingsPanel.jsx';
import { calculateFitAllLayout, paperDimensions } from '../utils/fitAll.js';

export function LayoutPrintSection({ project, actions }) {
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedPreviewDishId, setSelectedPreviewDishId] = useState('');
  const selectedPage = project.pages.find((page) => page.id === project.selectedPageId) ?? project.pages[0];
  const fitWarning = selectedPage ? getFitWarning(project, selectedPage) : '';
  const selectedPreviewDish = selectedPage && selectedPreviewDishId
    ? project.dishes.find((dish) => dish.id === selectedPreviewDishId && selectedPage.selectedDishIds?.includes(dish.id))
    : null;
  const printPage = () => window.print();
  const confirmSaveAsPdf = () => {
    setIsPdfModalOpen(false);
    window.print();
  };

  return (
    <section className="layout-print-section" aria-label="Layout and print workspace">
      <aside className="layout-admin-panel layout-sidebar">
        {fitWarning ? <div className="panel-fit-warning" role="alert">{fitWarning}</div> : null}

        {selectedPage ? (
          <LayoutPrintControls
            page={selectedPage}
            actions={actions}
            onPrint={printPage}
            onSaveAsPdf={() => setIsPdfModalOpen(true)}
            selectedDish={selectedPreviewDish}
          />
        ) : null}
        <PageList project={project} actions={actions} />
        {selectedPage ? <PageSettingsPanel page={selectedPage} actions={actions} /> : null}
        {selectedPage ? <PageContentSelector project={project} page={selectedPage} actions={actions} /> : null}
        {selectedPage ? <HeaderSettingsPanel page={selectedPage} actions={actions} /> : null}
        {selectedPage ? <FooterSettingsPanel page={selectedPage} actions={actions} /> : null}
        {selectedPage ? (
          <details className="panel-section advanced-layout-section">
            <summary>Advanced layout controls</summary>
            <p className="muted-text">Legacy grid, fitting, typography, and technical fit-all controls remain available here.</p>
            <DesignControls page={selectedPage} actions={actions} />
          </details>
        ) : null}
      </aside>
      {selectedPage ? <PagePreview project={project} page={selectedPage} selectedPreviewDishId={selectedPreviewDishId} onSelectPreviewDish={setSelectedPreviewDishId} onResizePreviewDish={actions.updateSelectedPageItemPlacement} /> : <div className="empty-state">Add a page to preview your menu.</div>}
      {isPdfModalOpen ? <SavePdfModal onCancel={() => setIsPdfModalOpen(false)} onConfirm={confirmSaveAsPdf} /> : null}
    </section>
  );
}


function LayoutPrintControls({ page, actions, onPrint, onSaveAsPdf, selectedDish }) {
  const settings = page.designSettings;
  const selectedPlacement = selectedDish ? page.itemPlacements?.[selectedDish.id] : null;
  const update = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    actions.updateSelectedPageDesign(field, value);
  };
  const updateNumber = (field) => (event) => actions.updateSelectedPageDesign(field, Number(event.target.value));
  const updateLayoutMode = (event) => {
    const layoutMode = event.target.value;
    actions.updateSelectedPage({
      designSettings: {
        ...settings,
        layoutMode,
        gridMode: layoutMode === 'smartAutoFit' ? 'autoFill' : (layoutMode === 'manualDesigner' || layoutMode === 'elasticGrid') ? 'custom' : 'preset',
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
      <p className="eyebrow">Layout &amp; Print</p>
      <h2>Layout</h2>
      <div className="print-action-row" aria-label="Print and demo actions">
        <button className="primary-action compact" type="button" onClick={onPrint}>Print</button>
        <button className="secondary-action compact" type="button" onClick={onSaveAsPdf}>Save as PDF</button>
        <button className="secondary-action compact" type="button" onClick={actions.resetDemoData}>Reset demo data</button>
      </div>

      <label className="field-label">Layout mode
        <select value={settings.layoutMode} onChange={updateLayoutMode}>
          <option value="classicColumns">Classic columns</option>
          <option value="smartAutoFit">Smart auto-fit</option>
          <option value="manualDesigner">Manual designer</option>
          <option value="elasticGrid">Elastic grid</option>
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
        <label className="field-label">Resize mode
          <select value={settings.resizeMode} onChange={update('resizeMode')}>
            <option value="snapToGrid">Snap to grid</option>
            <option value="freeResize">Free resize</option>
          </select>
        </label>
      ) : null}
      {settings.layoutMode === 'elasticGrid' ? (
        <div className="elastic-grid-controls">
          <h3>Elastic Grid</h3>
          <div className="two-column-fields">
            <label className="field-label">Columns<input type="number" min="1" max="6" value={settings.customGrid.columns} onChange={(event) => actions.updateSelectedPageCustomGrid('columns', Number(event.target.value))} /></label>
            <label className="field-label">Rows<input type="number" min="1" max="12" value={settings.customGrid.rows} onChange={(event) => actions.updateSelectedPageCustomGrid('rows', Number(event.target.value))} /></label>
          </div>
          <label className="slider-label"><span>Gap<strong>{settings.customGrid.gap}px</strong></span><input type="range" min="0" max="64" value={settings.customGrid.gap} onChange={(event) => actions.updateSelectedPageCustomGrid('gap', Number(event.target.value))} /></label>
          <label className="toggle-label"><input type="checkbox" checked={settings.customGrid.densePacking} onChange={(event) => actions.updateSelectedPageCustomGrid('densePacking', event.target.checked)} /> Dense packing</label>
        </div>
      ) : null}

      <h3>Image display</h3>
      <label className="toggle-label">
        <input type="checkbox" checked={settings.showImages} onChange={update('showImages')} />
        Show images
      </label>
      <label className="field-label">Image fit
        <select value={settings.imageFitMode} onChange={update('imageFitMode')} disabled={!settings.showImages || settings.cardStyle === 'textOnly'}>
          <option value="contain">Contain full image</option>
          <option value="cover">Cover crop</option>
          <option value="fill">Stretch</option>
        </select>
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
      <label className="slider-label"><span>Image pan X<strong>{settings.imagePanX}</strong></span><input type="range" min="-50" max="50" value={settings.imagePanX} onChange={updateNumber('imagePanX')} disabled={!settings.showImages || settings.cardStyle === 'textOnly' || settings.imagePosition !== 'custom'} /></label>
      <label className="slider-label"><span>Image pan Y<strong>{settings.imagePanY}</strong></span><input type="range" min="-50" max="50" value={settings.imagePanY} onChange={updateNumber('imagePanY')} disabled={!settings.showImages || settings.cardStyle === 'textOnly' || settings.imagePosition !== 'custom'} /></label>
      <label className="slider-label"><span>Image area<strong>{settings.imageAreaPercent}%</strong></span><input type="range" min="10" max="80" value={settings.imageAreaPercent} onChange={updateNumber('imageAreaPercent')} disabled={!settings.showImages || settings.cardStyle === 'textOnly'} /></label>

      <h3>Content</h3>
      <label className="toggle-label">
        <input type="checkbox" checked={settings.showDescriptions} onChange={update('showDescriptions')} />
        Show descriptions
      </label>
      <p className="muted-text">Prices always stay pinned to the bottom of every card.</p>
      <label className="field-label">Configurable dish display
        <select value={settings.configurableDisplayMode} onChange={update('configurableDisplayMode')}>
          <option value="compactOptions">Compact options</option>
          <option value="stepList">Step list</option>
        </select>
      </label>

      {(settings.layoutMode === 'manualDesigner' || settings.layoutMode === 'elasticGrid') ? (
        <SelectedCardControls page={page} actions={actions} selectedDish={selectedDish} placement={selectedPlacement} />
      ) : null}

      <details className="inline-advanced-controls" open>
        <summary>Badge style</summary>
        <label className="color-label">Badge background<span><input type="color" value={settings.badgeStyle.backgroundColor} onChange={(event) => actions.updateSelectedPageDesign('badgeStyle', { ...settings.badgeStyle, backgroundColor: event.target.value })} /><input value={settings.badgeStyle.backgroundColor} onChange={(event) => actions.updateSelectedPageDesign('badgeStyle', { ...settings.badgeStyle, backgroundColor: event.target.value })} /></span></label>
        <label className="color-label">Badge text<span><input type="color" value={settings.badgeStyle.textColor} onChange={(event) => actions.updateSelectedPageDesign('badgeStyle', { ...settings.badgeStyle, textColor: event.target.value })} /><input value={settings.badgeStyle.textColor} onChange={(event) => actions.updateSelectedPageDesign('badgeStyle', { ...settings.badgeStyle, textColor: event.target.value })} /></span></label>
        <label className="color-label">Badge border<span><input type="color" value={settings.badgeStyle.borderColor === 'transparent' ? '#000000' : settings.badgeStyle.borderColor} onChange={(event) => actions.updateSelectedPageDesign('badgeStyle', { ...settings.badgeStyle, borderColor: event.target.value })} /><input value={settings.badgeStyle.borderColor} onChange={(event) => actions.updateSelectedPageDesign('badgeStyle', { ...settings.badgeStyle, borderColor: event.target.value })} /></span></label>
        <label className="slider-label"><span>Badge border width<strong>{settings.badgeStyle.borderWidth}px</strong></span><input type="range" min="0" max="8" value={settings.badgeStyle.borderWidth} onChange={(event) => actions.updateSelectedPageDesign('badgeStyle', { ...settings.badgeStyle, borderWidth: Number(event.target.value) })} /></label>
        <label className="slider-label"><span>Badge opacity<strong>{settings.badgeStyle.opacity}%</strong></span><input type="range" min="0" max="100" value={settings.badgeStyle.opacity} onChange={(event) => actions.updateSelectedPageDesign('badgeStyle', { ...settings.badgeStyle, opacity: Number(event.target.value) })} /></label>
        <label className="field-label">Badge shape<select value={settings.badgeStyle.shape} onChange={(event) => actions.updateSelectedPageDesign('badgeStyle', { ...settings.badgeStyle, shape: event.target.value })}><option value="pill">Pill</option><option value="rounded">Rounded</option><option value="square">Square</option><option value="circle">Circle</option><option value="ribbon">Ribbon</option></select></label>
      </details>

      <details className="inline-advanced-controls">
        <summary>Card border</summary>
        <label className="toggle-label"><input type="checkbox" checked={settings.cardBorderEnabled} onChange={update('cardBorderEnabled')} /> Border enabled</label>
        <label className="color-label">Card border color<span><input type="color" value={settings.cardBorderColor} onChange={update('cardBorderColor')} disabled={!settings.cardBorderEnabled} /><input value={settings.cardBorderColor} onChange={update('cardBorderColor')} disabled={!settings.cardBorderEnabled} /></span></label>
        <label className="slider-label"><span>Card border width<strong>{settings.cardBorderWidth}px</strong></span><input type="range" min="0" max="8" step="1" value={settings.cardBorderWidth} disabled={!settings.cardBorderEnabled} onChange={updateNumber('cardBorderWidth')} /></label>
        <label className="slider-label"><span>Card border opacity<strong>{settings.cardBorderOpacity}%</strong></span><input type="range" min="0" max="100" step="1" value={settings.cardBorderOpacity} disabled={!settings.cardBorderEnabled} onChange={updateNumber('cardBorderOpacity')} /></label>
      </details>
    </div>
  );
}

function columnPresetFor(columns) {
  return { 1: 'oneColumn', 2: 'twoColumns', 3: 'threeColumns', 4: 'fourColumns', 5: 'fiveColumns' }[columns] ?? 'twoColumns';
}

const MANUAL_GRID_SPANS = Object.freeze(['1x1', '2x1', '1x2', '2x2', '3x2', '3x3']);

function SelectedCardControls({ page, actions, selectedDish, placement }) {
  const isElastic = page.designSettings.layoutMode === 'elasticGrid';
  const isFreeResize = !isElastic && page.designSettings.resizeMode === 'freeResize';
  const current = {
    mode: isFreeResize ? 'free' : 'grid',
    colSpan: placement?.colSpan ?? 1,
    rowSpan: placement?.rowSpan ?? 1,
    xPercent: placement?.xPercent ?? 0,
    yPercent: placement?.yPercent ?? 0,
    widthPercent: placement?.widthPercent ?? 30,
    heightPercent: placement?.heightPercent ?? 22,
    zIndex: placement?.zIndex ?? 1,
    priority: placement?.priority ?? 0,
  };
  const maxColumns = page.designSettings.customGrid.columns;
  const maxRows = page.designSettings.customGrid.rows;
  const spanOptions = MANUAL_GRID_SPANS.map((span) => span.split('x').map(Number)).filter(([columns, rows]) => columns <= maxColumns && rows <= maxRows);
  const colSpanOptions = [...new Set(spanOptions.filter(([, rows]) => rows === current.rowSpan).map(([columns]) => columns))];
  const rowSpanOptions = [...new Set(spanOptions.filter(([columns]) => columns === current.colSpan).map(([, rows]) => rows))];
  const updatePlacement = (changes) => {
    if (!selectedDish) return;
    actions.updateSelectedPageItemPlacement(selectedDish.id, { ...current, ...changes });
  };
  const updatePercent = (field) => (event) => {
    const value = Number(event.target.value);
    if (field === 'xPercent') updatePlacement({ xPercent: Math.min(value, 100 - current.widthPercent), mode: 'free' });
    else if (field === 'yPercent') updatePlacement({ yPercent: Math.min(value, 100 - current.heightPercent), mode: 'free' });
    else if (field === 'widthPercent') updatePlacement({ widthPercent: value, xPercent: Math.min(current.xPercent, 100 - value), mode: 'free' });
    else if (field === 'heightPercent') updatePlacement({ heightPercent: value, yPercent: Math.min(current.yPercent, 100 - value), mode: 'free' });
    else updatePlacement({ [field]: value, mode: 'free' });
  };

  return (
    <div className="selected-card-controls" aria-live="polite">
      <div>
        <p className="eyebrow">Selected card</p>
        <strong>{selectedDish?.nameEn || 'Click a preview card'}</strong>
        <small>{selectedDish ? (isFreeResize ? `${current.widthPercent}% × ${current.heightPercent}%` : `${current.colSpan} columns × ${current.rowSpan} rows`) : 'Select a preview card to edit its size.'}</small>
      </div>
      {isFreeResize ? (
        <div className="selected-free-controls">
          <label className="field-label">Width %<input type="number" min="10" max="100" value={current.widthPercent} onChange={updatePercent('widthPercent')} disabled={!selectedDish} /></label>
          <label className="field-label">Height %<input type="number" min="8" max="100" value={current.heightPercent} onChange={updatePercent('heightPercent')} disabled={!selectedDish} /></label>
          <label className="field-label">X %<input type="number" min="0" max="100" value={current.xPercent} onChange={updatePercent('xPercent')} disabled={!selectedDish} /></label>
          <label className="field-label">Y %<input type="number" min="0" max="100" value={current.yPercent} onChange={updatePercent('yPercent')} disabled={!selectedDish} /></label>
          <label className="field-label">Z-index<input type="number" min="1" max="999" value={current.zIndex} onChange={updatePercent('zIndex')} disabled={!selectedDish} /></label>
        </div>
      ) : (
        <div className="selected-card-span-controls">
          <label className="field-label">Col span<select value={current.colSpan} onChange={(event) => updatePlacement({ colSpan: Number(event.target.value), mode: 'grid' })} disabled={!selectedDish}>{(colSpanOptions.length ? colSpanOptions : [1]).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="field-label">Row span<select value={current.rowSpan} onChange={(event) => updatePlacement({ rowSpan: Number(event.target.value), mode: 'grid' })} disabled={!selectedDish}>{(rowSpanOptions.length ? rowSpanOptions : [1]).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        </div>
      )}
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
