import { getApiUrl } from '../../../config/api';
import { AppointmentFormData, AppointmentResponse } from '../types/appointment';

const withHeaders = (token?: string | null): HeadersInit => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const response = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers: {
      ...withHeaders(token),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const message = errorData?.message || errorData?.erro || 'Erro na requisicao com o servidor';
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const AppointmentService = {
  create: (data: AppointmentFormData, token?: string | null): Promise<AppointmentResponse> => {
    return request<AppointmentResponse>('/agendamentos', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token);
  },

  update: (id: string, data: Partial<AppointmentFormData>, token?: string | null): Promise<AppointmentResponse> => {
    return request<AppointmentResponse>(`/agendamentos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, token);
  },

  remove: (id: string, token?: string | null): Promise<void> => {
    return request<void>(`/agendamentos/${id}`, {
      method: 'DELETE',
    }, token);
  },
};
