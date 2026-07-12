// Attaches the logged-in user's JWT to API requests and normalizes
// auth failures so callers can redirect to /login on 401/403 instead of
// rendering a broken screen.

export class ApiAuthError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
    const body = await res.json().catch(() => ({}));
    throw new ApiAuthError(res.status, body.message || 'You are not authorized to view this.');
  }

  return res;
}

// Fetches a file endpoint (CSV export, etc.) with the auth header attached
// and triggers a browser download of the response body.
export async function downloadFile(url, filename) {
  const res = await authFetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Download failed.');
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
