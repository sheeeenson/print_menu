import { useState } from 'react';
import { DesignControls } from './DesignControls.jsx';
import { FooterSettingsPanel } from './FooterSettingsPanel.jsx';
import { HeaderSettingsPanel } from './HeaderSettingsPanel.jsx';
import { PageContentSelector } from './PageContentSelector.jsx';
import { PageList } from './PageList.jsx';
import { PagePreview } from './PagePreview.jsx';
import { PageSettingsPanel } from './PageSettingsPanel.jsx';

export function LayoutPrintSection({ project, actions }) {
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const selectedPage = project.pages.find((page) => page.id === project.selectedPageId) ?? project.pages[0];
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

function SavePdfModal({ onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="instruction-modal" role="dialog" aria-modal="true" aria-labelledby="save-pdf-title">
        <p className="eyebrow">Browser PDF export</p>
        <h2 id="save-pdf-title">Save as PDF</h2>
        <p>
          In the browser print dialog, choose Save as PDF, set scale to 100%, choose correct paper size, and enable background graphics.
        </p>
        <div className="modal-actions">
          <button className="secondary-action compact" type="button" onClick={onCancel}>Cancel</button>
          <button className="primary-action compact" type="button" onClick={onConfirm}>Open print dialog</button>
        </div>
      </div>
    </div>
  );
}
