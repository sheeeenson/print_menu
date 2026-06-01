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
        {selectedPage ? <DesignControls page={selectedPage} actions={actions} /> : null}
      </aside>
      {selectedPage ? <PagePreview project={project} page={selectedPage} selectedPreviewDishId={selectedPreviewDishId} onSelectPreviewDish={setSelectedPreviewDishId} onResizePreviewDish={actions.updateSelectedPageItemPlacement} /> : <div className="empty-state">Add a page to preview your menu.</div>}
      {isPdfModalOpen ? <SavePdfModal onCancel={() => setIsPdfModalOpen(false)} onConfirm={confirmSaveAsPdf} /> : null}
    </section>
  );
}


function LayoutPrintControls({ page, actions, onPrint, onSaveAsPdf, selectedDish }) {
  const settings = page.designSettings;
  const update = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    actions.updateSelectedPageDesign(field, value);
  };
  const updateNumber = (field) => (event) => actions.updateSelectedPageDesign(field, Number(event.target.value));

  return (
    <div className="panel-section preview-controls layout-print-controls">
      <p className="eyebrow">Layout &amp; Print</p>
      <h2>Card display</h2>
      <p className="layout-debug-label" role="status">Layout controls loaded</p>
      <div className="print-action-row" aria-label="Print and demo actions">
        <button className="primary-action compact" type="button" onClick={onPrint}>Print</button>
        <button className="secondary-action compact" type="button" onClick={onSaveAsPdf}>Save as PDF</button>
        <button className="secondary-action compact" type="button" onClick={actions.resetDemoData}>Reset demo data</button>
      </div>
      {page.designSettings.gridMode === 'custom' ? (
        <SelectedCardControls page={page} actions={actions} selectedDish={selectedDish} />
      ) : null}
      <label className="toggle-label">
        <input type="checkbox" checked={settings.showImages} onChange={update('showImages')} />
        Show images
      </label>
      <label className="toggle-label">
        <input type="checkbox" checked={settings.showDescriptions} onChange={update('showDescriptions')} />
        Show descriptions
      </label>
      <label className="field-label">Card content layout
        <select value={settings.cardContentLayout} onChange={update('cardContentLayout')} disabled={!settings.showImages}>
          <option value="below">Below image</option>
          <option value="imageLeft">Image left</option>
          <option value="imageRight">Image right</option>
        </select>
      </label>
      <label className="toggle-label">
        <input type="checkbox" checked={settings.cardBorderEnabled} onChange={update('cardBorderEnabled')} />
        Border enabled
      </label>
      <label className="color-label">Card border color
        <span>
          <input type="color" value={settings.cardBorderColor} onChange={update('cardBorderColor')} disabled={!settings.cardBorderEnabled} />
          <input value={settings.cardBorderColor} onChange={update('cardBorderColor')} disabled={!settings.cardBorderEnabled} />
        </span>
      </label>
      <label className="slider-label">
        <span>Card border width<strong>{settings.cardBorderWidth}px</strong></span>
        <input
          type="range"
          min="0"
          max="8"
          step="1"
          value={settings.cardBorderWidth}
          disabled={!settings.cardBorderEnabled}
          onChange={updateNumber('cardBorderWidth')}
        />
      </label>
      <label className="slider-label">
        <span>Card border opacity<strong>{settings.cardBorderOpacity}%</strong></span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={settings.cardBorderOpacity}
          disabled={!settings.cardBorderEnabled}
          onChange={updateNumber('cardBorderOpacity')}
        />
      </label>
    </div>
  );
}

const MANUAL_GRID_SPANS = Object.freeze(['1x1', '2x1', '1x2', '2x2', '3x2', '3x3']);

function SelectedCardControls({ page, actions, selectedDish }) {
  const placement = selectedDish ? page.itemPlacements?.[selectedDish.id] : null;
  const colSpan = placement?.colSpan ?? 1;
  const rowSpan = placement?.rowSpan ?? 1;
  const maxColumns = page.designSettings.customGrid.columns;
  const maxRows = page.designSettings.customGrid.rows;
  const spanOptions = MANUAL_GRID_SPANS.map((span) => span.split('x').map(Number))
    .filter(([columns, rows]) => columns <= maxColumns && rows <= maxRows);
  const colSpanOptions = [...new Set(spanOptions.filter(([, rows]) => rows === rowSpan).map(([columns]) => columns))];
  const rowSpanOptions = [...new Set(spanOptions.filter(([columns]) => columns === colSpan).map(([, rows]) => rows))];
  const updatePlacement = (nextColSpan, nextRowSpan) => {
    if (!selectedDish) return;
    actions.updateSelectedPageItemPlacement(selectedDish.id, {
      colSpan: nextColSpan,
      rowSpan: nextRowSpan,
      priority: placement?.priority ?? 0,
    });
  };

  return (
    <div className="selected-card-controls" aria-live="polite">
      <div>
        <p className="eyebrow">Selected card</p>
        <strong>{selectedDish?.nameEn || 'Click a preview card'}</strong>
        <small>{selectedDish ? `${colSpan} columns × ${rowSpan} rows` : 'Manual Grid cards can be resized in the preview.'}</small>
      </div>
      <div className="selected-card-span-controls">
        <label className="field-label">Col span
          <select value={colSpan} onChange={(event) => updatePlacement(Number(event.target.value), rowSpan)} disabled={!selectedDish}>
            {(colSpanOptions.length ? colSpanOptions : [1]).map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="field-label">Row span
          <select value={rowSpan} onChange={(event) => updatePlacement(colSpan, Number(event.target.value))} disabled={!selectedDish}>
            {(rowSpanOptions.length ? rowSpanOptions : [1]).map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>
      <div className="print-action-row">
        <button
          className="secondary-action compact"
          type="button"
          onClick={() => selectedDish && actions.resetSelectedPageItemPlacement(selectedDish.id)}
          disabled={!selectedDish}
        >
          Reset selected card size
        </button>
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
