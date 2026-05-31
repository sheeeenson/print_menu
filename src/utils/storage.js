export const PROJECT_STORAGE_KEY = 'restaurant-menu-studio.project.v1';

export function loadProject() {
  const serialized = localStorage.getItem(PROJECT_STORAGE_KEY);
  return serialized ? JSON.parse(serialized) : null;
}

export function saveProject(project) {
  localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
}
