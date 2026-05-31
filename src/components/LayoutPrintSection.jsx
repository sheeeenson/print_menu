import { DesignControls } from './DesignControls.jsx';
import { FooterSettingsPanel } from './FooterSettingsPanel.jsx';
import { HeaderSettingsPanel } from './HeaderSettingsPanel.jsx';
import { PageContentSelector } from './PageContentSelector.jsx';
import { PageList } from './PageList.jsx';
import { PagePreview } from './PagePreview.jsx';
import { PageSettingsPanel } from './PageSettingsPanel.jsx';

export function LayoutPrintSection({ project, actions }) {
  const selectedPage = project.pages.find((page) => page.id === project.selectedPageId) ?? project.pages[0];

  return (
    <section className="layout-print-section" aria-label="Layout and print workspace">
      <aside className="layout-admin-panel">
        <PageList project={project} actions={actions} />
        {selectedPage ? <PageSettingsPanel page={selectedPage} actions={actions} /> : null}
        {selectedPage ? <PageContentSelector project={project} page={selectedPage} actions={actions} /> : null}
        {selectedPage ? <HeaderSettingsPanel page={selectedPage} actions={actions} /> : null}
        {selectedPage ? <FooterSettingsPanel page={selectedPage} actions={actions} /> : null}
        {selectedPage ? <DesignControls page={selectedPage} actions={actions} /> : null}
      </aside>
      {selectedPage ? <PagePreview project={project} page={selectedPage} /> : <div className="empty-state">Add a page to preview your menu.</div>}
    </section>
  );
}
