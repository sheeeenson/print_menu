const APP_NAME = 'Restaurant Menu Studio';
const EXPORT_VERSION = 1;
const IMPORT_ERROR_MESSAGE = 'Could not import project. Please check that this is a valid Restaurant Menu Studio JSON file.';

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const padDatePart = (value) => String(value).padStart(2, '0');

const validateProjectShape = (project) => {
  if (!isPlainObject(project)) {
    throw new Error(IMPORT_ERROR_MESSAGE);
  }

  if (!Array.isArray(project.categories) || !Array.isArray(project.dishes)) {
    throw new Error(IMPORT_ERROR_MESSAGE);
  }

  if (project.pages !== undefined && !Array.isArray(project.pages)) {
    throw new Error(IMPORT_ERROR_MESSAGE);
  }

  if (project.projectName !== undefined && typeof project.projectName !== 'string') {
    throw new Error(IMPORT_ERROR_MESSAGE);
  }
};

const extractProject = (parsed) => {
  if (!isPlainObject(parsed)) {
    throw new Error(IMPORT_ERROR_MESSAGE);
  }

  if ('exportVersion' in parsed || 'appName' in parsed || 'exportedAt' in parsed || 'project' in parsed) {
    if (parsed.appName !== APP_NAME || parsed.exportVersion !== EXPORT_VERSION || !isPlainObject(parsed.project)) {
      throw new Error(IMPORT_ERROR_MESSAGE);
    }

    validateProjectShape(parsed.project);
    return parsed.project;
  }

  validateProjectShape(parsed);
  return parsed;
};

export function createProjectExport(project) {
  return {
    appName: APP_NAME,
    exportVersion: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    project,
  };
}

export function buildExportFilename() {
  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    padDatePart(now.getMonth() + 1),
    padDatePart(now.getDate()),
  ].join('-');
  const time = [padDatePart(now.getHours()), padDatePart(now.getMinutes())].join('-');
  return `restaurant-menu-project-${timestamp}-${time}.json`;
}

export function downloadProjectJson(project) {
  const exportData = createProjectExport(project);
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = buildExportFilename(project);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function parseProjectImport(file) {
  const text = await file.text();
  if (!text.trim()) {
    throw new Error(IMPORT_ERROR_MESSAGE);
  }

  try {
    return extractProject(JSON.parse(text));
  } catch (error) {
    throw new Error(IMPORT_ERROR_MESSAGE, { cause: error });
  }
}

export { APP_NAME as PROJECT_EXPORT_APP_NAME, EXPORT_VERSION as PROJECT_EXPORT_VERSION, IMPORT_ERROR_MESSAGE as PROJECT_IMPORT_ERROR_MESSAGE };
