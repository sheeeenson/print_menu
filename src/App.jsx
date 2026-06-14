import { useEffect, useMemo, useRef, useState } from 'react';
import { ContentSection } from './components/ContentSection.jsx';
import { LayoutPrintSection } from './components/LayoutPrintSection.jsx';
import { MainNavigation } from './components/MainNavigation.jsx';
import { ImageMenuSection } from './image-menu/ImageMenuSection.jsx';
import { APP_SECTIONS } from './models/menu.js';
import { installPromoHtmlDownloadButton } from './promo-generator/promoHtmlDownload.js';
import { PromoSectionV2 } from './promo-generator/PromoSectionV2.jsx';
import { SiteBannerSection } from './site-banner/SiteBannerSection.jsx';
import { ensureCloudProjectIdInUrl, loadCloudProject, saveCloudProject } from './state/cloudProjectSync.js';
import { createProjectStore } from './state/projectStore.js';
import { useProjectStore } from './state/useProjectStore.js';

export function App() {
  const store = useMemo(() => createProjectStore(), []);
  const snapshot = useProjectStore(store);
  const [searchTerm, setSearchTerm] = useState('');
  const [cloudProjectId] = useState(() => ensureCloudProjectIdInUrl());
  const [cloudReady, setCloudReady] = useState(false);
  const cloudLoadFinishedRef = useRef(false);
  const lastSavedProjectRef = useRef('');
  const { project } = snapshot;

  useEffect(() => {
    installPromoHtmlDownloadButton();
  }, []);

  useEffect(() => {
    if (!cloudProjectId) {
      setCloudReady(true);
      return;
    }

    let cancelled = false;

    loadCloudProject(cloudProjectId)
      .then((cloudProject) => {
        if (cancelled) return;
        if (cloudProject) {
          store.actions.importProject(cloudProject);
          lastSavedProjectRef.current = JSON.stringify(cloudProject);
        }
      })
      .catch((error) => {
        console.warn('Cloud project load failed. Continuing with local project.', error);
      })
      .finally(() => {
        if (!cancelled) {
          cloudLoadFinishedRef.current = true;
          setCloudReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cloudProjectId, store]);

  useEffect(() => {
    if (!cloudReady || !cloudLoadFinishedRef.current || !cloudProjectId) return undefined;

    const serializedProject = JSON.stringify(project);
    if (serializedProject === lastSavedProjectRef.current) return undefined;

    const saveTimer = window.setTimeout(() => {
      saveCloudProject(cloudProjectId, project)
        .then(() => {
          lastSavedProjectRef.current = serializedProject;
        })
        .catch((error) => {
          console.warn('Cloud project save failed. Local save is still active.', error);
        });
    }, 900);

    return () => window.clearTimeout(saveTimer);
  }, [cloudReady, cloudProjectId, project]);

  const renderSection = () => {
    if (project.selectedSection === APP_SECTIONS.CONTENT) {
      return <ContentSection project={project} searchTerm={searchTerm} onSearchChange={setSearchTerm} actions={store.actions} />;
    }

    if (project.selectedSection === APP_SECTIONS.IMAGE_MENU) {
      return <ImageMenuSection project={project} />;
    }

    if (project.selectedSection === APP_SECTIONS.TV_PROMO) {
      return <PromoSectionV2 project={project} />;
    }

    if (project.selectedSection === APP_SECTIONS.SITE_BANNER) {
      return <SiteBannerSection project={project} />;
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
