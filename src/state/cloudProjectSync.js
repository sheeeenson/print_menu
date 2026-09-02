const PROJECT_PARAM = 'project';
const LAST_PROJECT_ID_KEY = 'restaurant-menu-studio.cloud-project-id.v1';

const createCloudProjectId = () => `pm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const getCloudProjectIdFromUrl = () => {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(PROJECT_PARAM) || '';
};

export const ensureCloudProjectIdInUrl = () => {
  if (typeof window === 'undefined') return '';

  const url = new URL(window.location.href);
  let projectId = url.searchParams.get(PROJECT_PARAM) || window.localStorage.getItem(LAST_PROJECT_ID_KEY) || '';

  if (!projectId) projectId = createCloudProjectId();
  if (url.searchParams.get(PROJECT_PARAM) !== projectId) {
    url.searchParams.set(PROJECT_PARAM, projectId);
    window.history.replaceState({}, '', url.toString());
  }

  window.localStorage.setItem(LAST_PROJECT_ID_KEY, projectId);
  return projectId;
};

export const loadCloudProject = async (projectId) => {
  if (!projectId) return null;
  const response = await fetch(`/api/project-sync?id=${encodeURIComponent(projectId)}`, { cache: 'no-store' });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || 'Cloud project load failed.');
  return payload?.data?.project || null;
};

export const saveCloudProject = async (projectId, project) => {
  if (!projectId) return null;
  const response = await fetch(`/api/project-sync?id=${encodeURIComponent(projectId)}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ project }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || 'Cloud project save failed.');
  return payload?.data || null;
};
