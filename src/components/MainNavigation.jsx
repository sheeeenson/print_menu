import { APP_SECTIONS } from '../models/menu.js';

export function MainNavigation({ snapshot, actions }) {
  const { project, saveStatus } = snapshot;

  return (
    <nav className="main-navigation" aria-label="Main navigation">
      <div className="brand-block">
        <span className="brand-mark">RMS</span>
        <input
          aria-label="Project name"
          className="project-name-input"
          value={project.projectName}
          onChange={(event) => actions.setProjectName(event.target.value)}
        />
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
          className={project.selectedSection === APP_SECTIONS.LAYOUT_PRINT ? 'active' : ''}
          type="button"
          onClick={() => actions.setSection(APP_SECTIONS.LAYOUT_PRINT)}
        >
          Layout &amp; Print
        </button>
      </div>
      <div className={`save-status ${saveStatus.toLowerCase()}`} aria-live="polite">
        {saveStatus}
      </div>
    </nav>
  );
}
