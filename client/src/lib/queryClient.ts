import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export const apiRequest = async (url: string, method: string = 'GET', data?: any) => {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    // Upewnij się, że daty są poprawnie serializowane
    const processedData = JSON.parse(JSON.stringify(data));
    options.body = JSON.stringify(processedData);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Wystąpił błąd podczas komunikacji z API');
  }
  
  const responseData = await response.json();
  
  // Konwertuj pola due_date na dueDate i created_at na createdAt
  if (Array.isArray(responseData)) {
    return responseData.map(transformTaskResponse);
  } else if (responseData && typeof responseData === 'object') {
    return transformTaskResponse(responseData);
  }
  
  return responseData;
};

// Funkcja pomocnicza do transformacji odpowiedzi z API
const transformTaskResponse = (task: any) => {
  if (!task) return task;
  
  const transformed: any = { ...task };
  
  // Konwertuj due_date na dueDate
  if ('due_date' in task) {
    transformed.dueDate = task.due_date;
    // Nie usuwamy oryginalnego pola, aby zachować kompatybilność
  }
  
  // Konwertuj created_at na createdAt
  if ('created_at' in task) {
    transformed.createdAt = task.created_at;
    // Nie usuwamy oryginalnego pola, aby zachować kompatybilność
  }
  
  return transformed;
};

type UnauthorizedBehavior = "returnNull" | "throw";

// Poprawiona funkcja getQueryFn z generycznym typem T
export function getQueryFn<T>({ url, unauthorizedBehavior = "throw" }: {
  url: string;
  unauthorizedBehavior?: UnauthorizedBehavior;
}): () => Promise<T> {
  return async () => {
    try {
      // Jeśli url jest pusty, używamy queryKey z kontekstu React Query
      const actualUrl = url || '/api/tasks';
      return await apiRequest(actualUrl) as T;
    } catch (e) {
      if (unauthorizedBehavior === "returnNull") {
        return null as unknown as T;
      }
      throw e;
    }
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Używamy bardziej ogólnego typu any, ponieważ nie znamy dokładnego typu danych
      queryFn: getQueryFn<any>({ url: '', unauthorizedBehavior: "throw" }),
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
