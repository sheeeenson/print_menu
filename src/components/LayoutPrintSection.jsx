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
  const selectedPage = project.pages.find((page) => page.id === project.selectedPageId) ?? project.pages[0];
  const fitWarning = selectedPage ? getFitWarning(project, selectedPage) : '';
  const printPage = () => window.print();
  const confirmSaveAsPdf = () => {
    setIsPdfModalOpen(false);
    window.print();
  };

  return (
    <section className="layout-print-section" aria-label="Layout and print workspace">
      <aside className="layout-admin-panel layout-sidebar">
        <div className="panel-section print-actions-panel preview-controls">
          <p className="eyebrow">Output</p>
          <h2>Print &amp; export</h2>
          <div className="print-action-row">
            <button className="primary-action compact" type="button" onClick={printPage}>Print</button>
            <button className="secondary-action compact" type="button" onClick={() => setIsPdfModalOpen(true)}>Save as PDF</button>
          </div>
        </div>
        {fitWarning ? <div className="panel-fit-warning" role="alert">{fitWarning}</div> : null}

        {selectedPage ? <LayoutPrintControls page={selectedPage} actions={actions} /> : null}
        <PageList project={project} actions={actions} />
        {selectedPage ? <PageSettingsPanel page={selectedPage} actions={actions} /> : null}
        {selectedPage ? <PageContentSelector project={project} page={selectedPage} actions={actions} /> : null}
        {selectedPage ? <HeaderSettingsPanel page={selectedPage} actions={actions} /> : null}
        {selectedPage ? <FooterSettingsPanel page={selectedPage} actions={actions} /> : null}
        {selectedPage ? <DesignControls page={selectedPage} actions={actions} /> : null}
      </aside>
      {selectedPage ? <PagePreview project={project} page={selectedPage} /> : <div className="empty-state">Add a page to preview your menu.</div>}
      {isPdfModalOpen ? <SavePdfModal onCancel={() => setIsPdfModalOpen(false)} onConfirm={confirmSaveAsPdf} /> : null}
    </section>
  );
}


function LayoutPrintControls({ page, actions }) {
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
