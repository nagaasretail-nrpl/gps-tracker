import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

/**
 * Build URL from queryKey, supporting optional query params object
 * Pattern: ["/api/endpoint"] or ["/api/endpoint", { params: { key: value } }]
 */
function buildUrlFromQueryKey(queryKey: readonly unknown[]): string {
  if (queryKey.length === 1) {
    // Simple endpoint with no params
    return queryKey[0] as string;
  }
  
  if (queryKey.length === 2 && typeof queryKey[1] === "object" && queryKey[1] !== null) {
    const endpoint = queryKey[0] as string;
    const paramsObj = queryKey[1] as Record<string, unknown>;
    
    // Build query string from params object
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(paramsObj)) {
      if (value !== null && value !== undefined) {
        params.append(key, String(value));
      }
    }
    
    const queryString = params.toString();
    return queryString ? `${endpoint}?${queryString}` : endpoint;
  }
  
  // Fallback to old behavior for compatibility
  return queryKey.join("/") as string;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = buildUrlFromQueryKey(queryKey);
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
