export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Verified against the server by PasswordModal and kept in memory only, so it's
// gone on reload and never written to the bundle or storage.
let adminPassword: string | null = null;

export function setAdminPassword(password: string) {
  adminPassword = password;
}

// This device's push subscription; sent with every request so the server can skip
// notifying the person who caused an event.
let pushEndpoint: string | null = null;

export function setPushEndpoint(endpoint: string | null) {
  pushEndpoint = endpoint;
}

export async function api(path: string, options: { method?: string; body?: unknown; admin?: boolean } = {}) {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.admin && adminPassword) headers['x-admin-password'] = adminPassword;
  if (pushEndpoint) headers['x-push-endpoint'] = pushEndpoint;

  const response = await fetch(path, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response.ok) throw new ApiError(response.status, `${method} ${path} failed with ${response.status}`);
  return response;
}
