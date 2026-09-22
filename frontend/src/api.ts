import { auth } from './firebase';
const API_URL =import.meta.env.VITE_API_URL || '/api';

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  requiresAuth = false,
): Promise<T> {
  const headers =
    new Headers(
      options.headers,
    );

  headers.set(
    'Content-Type',
    'application/json',
  );

  if (requiresAuth) {
    const user =
      auth.currentUser;

    if (!user) {
      throw new Error(
        'Not authenticated.',
      );
    }

    const token =
      await user.getIdToken();

    headers.set(
      'Authorization',
      `Bearer ${token}`,
    );
  }

  const response =
    await fetch(
      `${API_URL}${path}`,
      {
        ...options,
        headers,
      },
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
      'Request failed.',
    );
  }

  return data;
}