import { useRef } from 'react';
import { APP_SECTIONS } from '../models/menu.js';
import { downloadProjectJson, parseProjectImport, PROJECT_IMPORT_ERROR_MESSAGE } from '../utils/projectFiles.js';

export function MainNavigation({ snapshot, actions }) {
  const { project, saveStatus } = snapshot;
  const importInputRef = useRef(null);
  const saveStatusClass = saveStatus === 'Unsaved' || saveStatus === 'Saving' ? 'unsaved' : saveStatus.startsWith('Could not import') ? 'error' : 'saved';
  const isLayout = project.selectedSection === APP_SECTIONS.LAYOUT_PRINT;
  const isImageMenu = project.selectedSection === APP_SECTIONS.IMAGE_MENU;
  const isTvPromo = project.selectedSection === APP_SECTIONS.TV_PROMO;
  const isSiteBanner = project.selectedSection === APP_SECTIONS.SITE_BANNER;
  const canPrint = isLayout || isImageMenu;

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportChange = async (event) => {
    const [file] = event.target.files ?? [];
    event.target.value = '';

    if (!file) return;

    try {
      const importedProject = await parseProjectImport(file);
      const shouldImport = window.confirm('Importing this project will replace the current project in this browser. Continue?');
      if (!shouldImport) return;
      actions.importProject(importedProject);
    } catch (error) {
      actions.showProjectImportError(PROJECT_IMPORT_ERROR_MESSAGE);
    }
  };

  const handleResetDemoData = () => {
    const shouldReset = window.confirm('This will clear local data and reload demo project. Continue?');
    if (shouldReset) {
      actions.resetDemoData();
    }
  };

  const handleSaveAsPdf = () => {
    window.print();
  };

  return (
    <nav className="main-navigation top-nav" aria-label="Main navigation">
      <div className="brand-block compact-brand-block">
        <span className="brand-mark" aria-label="Restaurant Menu Studio">✏️</span>
      </div>
      <div className="section-tabs" role="tablist" aria-label="Application sections">
        <button
          className={project.selectedSection === APP_SECTIONS.CONTENT ? 'active' : ''}
          type="button"
          onClick={() => actions.setSection(APP_SECTIONS.CONTENT)}
        >
          Content
        </button>
        <button
          className={isLayout ? 'active' : ''}
          type="button"
          onClick={() => actions.setSection(APP_SECTIONS.LAYOUT_PRINT)}
        >
          Layout
        </button>
        <button
          className={isImageMenu ? 'active' : ''}
          type="button"
          onClick={() => actions.setSection(APP_SECTIONS.IMAGE_MENU)}
        >
          Image Menu
        </button>
        <button
          className={isTvPromo ? 'active' : ''}
          type="button"
          onClick={() => actions.setSection(APP_SECTIONS.TV_PROMO)}
        >
          TV Promo
        </button>
        <button
          className={isSiteBanner ? 'active' : ''}
          type="button"
          onClick={() => actions.setSection(APP_SECTIONS.SITE_BANNER)}
        >
          Site Banner
        </button>
      </div>
      <div className="project-actions" aria-label="Project actions">
        {canPrint ? <button className="primary-action compact" type="button" onClick={() => window.print()}>Print</button> : null}
        {isLayout ? <button className="secondary-action compact" type="button" onClick={handleSaveAsPdf}>Save as PDF</button> : null}
        <button type="button" onClick={handleImportClick}>Import project</button>
        <button type="button" onClick={() => downloadProjectJson(project)}>Export project</button>
        <button type="button" onClick={handleResetDemoData}>Reset demo data</button>
        <input
          ref={importInputRef}
          type="file"
          accept=".json,application/json"
          className="visually-hidden-file"
          onChange={handleImportChange}
          tabIndex={-1}
        />
      </div>
      <div className={`save-status ${saveStatusClass}`} aria-live="polite">
        {saveStatus}
      </div>
    </nav>
  );
}
