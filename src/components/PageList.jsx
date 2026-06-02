export function PageList({ project, actions }) {
  return (
    <section className="panel-section" aria-labelledby="page-list-title">
      <div className="subsection-title">
        <div>
          <p className="eyebrow">Pages</p>
          <h2 id="page-list-title">Menu pages</h2>
        </div>
      </div>
      <div className="page-list">
        {project.pages.map((page) => (
          <button
            key={page.id}
            className={`page-list-item ${page.id === project.selectedPageId ? 'selected' : ''}`}
            type="button"
            onClick={() => actions.selectPage(page.id)}
          >
            <span>{page.name || 'Untitled page'}</span>
            <small>{page.paperSize} · {page.orientation}</small>
          </button>
        ))}
      </div>
      <div className="action-row page-actions page-create-actions">
        <button className="primary-action compact" type="button" onClick={actions.addPage}>+ Add new page</button>
      </div>
      <div className="action-row page-actions">
        <button type="button" onClick={actions.duplicateSelectedPage}>Duplicate</button>
        <button className="danger" type="button" onClick={actions.deleteSelectedPage}>Delete</button>
      </div>
    </section>
  );
}
