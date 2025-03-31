import { QueryClient } from '@tanstack/react-query';

// Inicjalizacja klienta React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  }
});

// Funkcja do wykonywania żądań API
export async function apiRequest(endpoint: string, method: string = 'GET', data?: any) {
  try {
    console.log(`Wykonywanie żądania do ${endpoint}, metoda: ${method}`);
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    // Dodaj dane do body dla żądań POST, PUT, PATCH
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      // Jeśli to żądanie POST do /api/notes, usuń pole id z danych
      if (method === 'POST' && endpoint.includes('/api/notes') && data.id) {
        const processedData = { ...data };
        delete processedData.id;
        console.log('Usunięto pole id z danych POST dla /api/notes:', processedData);
        options.body = JSON.stringify(processedData);
      } else {
        options.body = JSON.stringify(data);
      }
    }
    
    const response = await fetch(endpoint, options);

    if (!response.ok) {
      console.error(`Błąd odpowiedzi: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`Treść błędu: ${errorText}`);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log(`Otrzymano odpowiedź z ${endpoint}:`, responseData);
    return responseData;
  } catch (error) {
    console.error(`Błąd podczas wykonywania żądania do ${endpoint}:`, error);
    throw error;
  }
}

// Funkcja pomocnicza do transformacji odpowiedzi z API
const transformTaskResponse = (task: any) => {
  if (!task) return task;
  
  const transformed = { ...task };
  
  // Konwertuj due_date na dueDate
  if ('due_date' in transformed) {
    transformed.dueDate = transformed.due_date;
    delete transformed.due_date;
  }
  
  // Konwertuj created_at na createdAt
  if ('created_at' in transformed) {
    transformed.createdAt = transformed.created_at;
    delete transformed.created_at;
  }
  
  return transformed;
};

// Funkcja do pobierania danych z API
type UnauthorizedBehavior = "returnNull" | "throw";

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
