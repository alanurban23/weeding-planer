export interface Category {
  id: number;
  name: string;
  created_at?: string;
}

export interface CategoryInput {
  name: string;
}

import { apiRequest } from './queryClient';

export const getCategories = async (): Promise<Category[]> => {
  return apiRequest('/api/categories', 'GET');
};

export const addCategory = async (category: CategoryInput): Promise<Category> => {
  return apiRequest('/api/categories', 'POST', category);
};
