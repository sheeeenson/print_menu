import { useMemo, useState } from 'react';
import { ContentSection } from './components/ContentSection.jsx';
import { LayoutPrintSection } from './components/LayoutPrintSection.jsx';
import { MainNavigation } from './components/MainNavigation.jsx';
import { ImageMenuSection } from './image-menu/ImageMenuSection.jsx';
import { APP_SECTIONS } from './models/menu.js';
import { PromoSection } from './promo-generator/PromoSection.jsx';
import { createProjectStore } from './state/projectStore.js';
import { useProjectStore } from './state/useProjectStore.js';

export function App() {
  const store = useMemo(() => createProjectStore(), []);
  const snapshot = useProjectStore(store);
  const [searchTerm, setSearchTerm] = useState('');
  const { project } = snapshot;

  const renderSection = () => {
    if (project.selectedSection === APP_SECTIONS.CONTENT) {
      return <ContentSection project={project} searchTerm={searchTerm} onSearchChange={setSearchTerm} actions={store.actions} />;
    }

    if (project.selectedSection === APP_SECTIONS.IMAGE_MENU) {
      return <ImageMenuSection project={project} />;
    }

    if (project.selectedSection === APP_SECTIONS.TV_PROMO) {
      return <PromoSection project={project} />;
    }

    return <LayoutPrintSection project={project} actions={store.actions} />;
  };

  return (
    <div className="app-shell">
      <MainNavigation snapshot={snapshot} actions={store.actions} />
      <main className="workspace">
        {renderSection()}
      </main>
    </div>
  );
}
