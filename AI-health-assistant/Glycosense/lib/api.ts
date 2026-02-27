import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type ApiError = {
  detail?: string;
  message?: string;
  error?: string;
};

function isLocalhost(url: string) {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(url);
}

function getHostFromHostUri(hostUri?: string | null) {
  if (!hostUri) return null;
  const [host] = hostUri.split(':');
  return host || null;
}

export function getApiBaseUrl() {
  // Use Platform.OS for more reliable detection
  const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';
  
  if (isMobile) {
    const url = 'http://192.168.0.6:8080';
    console.log('📱 Mobile device detected, using:', url);
    return url;
  }
  
  // Use localhost for web
  const url = 'http://localhost:8080';
  console.log('🌐 Web detected, using:', url);
  return url;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const message =
      payload?.detail ||
      payload?.message ||
      payload?.error ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }

  return payload as T;
}
