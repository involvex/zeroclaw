import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface SystemInfo {
    version: string;
    platform: string;
    arch: string;
    rust_version: string;
}

export interface DaemonStatus {
    status: string;
    paired: boolean;
    runtime: {
        components: unknown;
    };
    pid: number;
    uptime_seconds: number;
}

export interface ConfigResponse {
    [key: string]: unknown;
}

// API base URL - relative path for proxy
const API_BASE = '/api';

const api = {
  request: async (url: string, options: RequestInit = {}) => {
    console.log(`[API] ${options.method || 'GET'} ${url}`);
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    console.log(`[API] Response status: ${response.status}`);

    if (!response.ok) {
      // Try to get error message from response body
      let errorMessage = `API error: ${response.status}`;
      try {
        const errorBody = await response.json();
        if (errorBody.error) {
          errorMessage = errorBody.error;
        } else if (errorBody.message) {
          errorMessage = errorBody.message;
        }
      } catch (e) {
        // If parsing fails, use status text
        errorMessage = `API error: ${response.status} ${response.statusText}`;
      }
      console.error(`[API] Error:`, errorMessage);
      throw new Error(errorMessage);
    }
    return response.json();
  },
};

// Config APIs
export const configApi = {
  get: () => api.request(`${API_BASE}/config`),
  update: (patch: Record<string, unknown>) =>
    api.request(`${API_BASE}/config`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),
  save: () =>
    api.request(`${API_BASE}/config/save`, { method: 'POST' }),
  reload: () =>
    api.request(`${API_BASE}/config/reload`, { method: 'POST' }),
};

// Provider APIs
export const providerApi = {
  list: () => api.request(`${API_BASE}/providers`),
  test: (id: string) =>
    api.request(`${API_BASE}/providers/${id}/test`, { method: 'POST' }),
};

// Channel APIs
export const channelApi = {
  list: () => api.request(`${API_BASE}/channels`),
  get: (id: string) => api.request(`${API_BASE}/channels/${id}`),
  update: (id: string, patch: Record<string, unknown>) =>
    api.request(`${API_BASE}/channels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),
  test: (id: string) =>
    api.request(`${API_BASE}/channels/${id}/test`, { method: 'POST' }),
  status: (id: string) => api.request(`${API_BASE}/channels/${id}/status`),
};

// Daemon APIs
export const daemonApi = {
  status: () => api.request(`${API_BASE}/daemon/status`),
  restart: () =>
    api.request(`${API_BASE}/daemon/restart`, { method: 'POST' }),
  health: () => api.request(`${API_BASE}/daemon/health`),
};

// System APIs
export const systemApi = {
  info: () => api.request(`${API_BASE}/system/info`),
  metrics: () => api.request(`${API_BASE}/system/metrics`),
};

// React Query hooks
export const useConfig = () => {
  return useQuery({
    queryKey: ['config'],
    queryFn: configApi.get,
    staleTime: 60000,
  });
};

export const useSystemInfo = () => {
  return useQuery<SystemInfo>({
    queryKey: ['system', 'info'],
    queryFn: systemApi.info,
    refetchInterval: 60000,
  });
};

export const useDaemonStatus = () => {
  return useQuery<DaemonStatus>({
    queryKey: ['daemon', 'status'],
    queryFn: daemonApi.status,
    refetchInterval: 5000,
  });
};

export const useProviders = () => {
  return useQuery<string[]>({
    queryKey: ['providers'],
    queryFn: providerApi.list,
  });
};

export const useChannels = () => {
  return useQuery({
    queryKey: ['channels'],
    queryFn: channelApi.list,
  });
};

export const useSaveConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      await configApi.update(data);
      await configApi.save();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });
};

export const useReloadConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: configApi.reload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });
};

export const useTestProvider = () => {
  return useMutation({
    mutationFn: (id: string) => providerApi.test(id),
  });
};

export const useTestChannel = () => {
  return useMutation({
    mutationFn: (id: string) => channelApi.test(id),
  });
};

export const useRestartDaemon = () => {
  return useMutation({
    mutationFn: daemonApi.restart,
  });
};
