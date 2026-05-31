import { useMemo, useState } from 'react';
import { ContentSection } from './components/ContentSection.jsx';
import { LayoutPrintSection } from './components/LayoutPrintSection.jsx';
import { MainNavigation } from './components/MainNavigation.jsx';
import { APP_SECTIONS } from './models/menu.js';
import { createProjectStore } from './state/projectStore.js';
import { useProjectStore } from './state/useProjectStore.js';

export function App() {
  const store = useMemo(() => createProjectStore(), []);
  const snapshot = useProjectStore(store);
  const [searchTerm, setSearchTerm] = useState('');
  const { project } = snapshot;

  return (
    <div className="app-shell">
      <MainNavigation snapshot={snapshot} actions={store.actions} />
      <main className="workspace">
        {project.selectedSection === APP_SECTIONS.CONTENT ? (
          <ContentSection project={project} searchTerm={searchTerm} onSearchChange={setSearchTerm} actions={store.actions} />
        ) : (
          <LayoutPrintSection project={project} actions={store.actions} />
        )}
      </main>
    </div>
  );
}
