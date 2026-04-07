type RuntimeEnv = {
  VITE_API_URL?: string;
  VITE_SOCKET_URL?: string;
};

const getRuntimeEnv = (): RuntimeEnv => {
  return ((import.meta as unknown as { env?: RuntimeEnv }).env || {});
};

export function getApiUrl(): string {
  const envUrl = getRuntimeEnv().VITE_API_URL;
  if (envUrl) return envUrl;

  const host = window.location.hostname;
  return `http://${host}:3333/api`;
}

export function getSocketUrl(): string {
  const envUrl = getRuntimeEnv().VITE_SOCKET_URL;
  if (envUrl) return envUrl;

  const host = window.location.hostname;
  return `http://${host}:3333`;
}
