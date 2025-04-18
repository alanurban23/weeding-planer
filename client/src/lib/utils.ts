import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Convert Roman numerals to integers
export function romanToInt(s: string): number {
  const romanMap: Record<string, number> = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000,
  };
  
  let result = 0;
  
  for (let i = 0; i < s.length; i++) {
    // If current value is less than next value, subtract it
    if (i + 1 < s.length && romanMap[s[i]] < romanMap[s[i + 1]]) {
      result -= romanMap[s[i]];
    } else {
      result += romanMap[s[i]];
    }
  }
  
  return result;
}

// Extract Roman numeral from category name (e.g. "I. Category Name" -> "I")
export function extractRomanNumeral(category: string): string {
  if (!category || typeof category !== 'string') {
    return '';
  }
  const match = category.match(/^([IVXLCDM]+)\./);
  return match ? match[1] : '';
}
