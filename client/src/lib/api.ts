// api.ts
export interface Note {
    id: string;
    content: string;
    created_at: string;
    category?: string | number | null; // Kategoria może być stringiem, liczbą lub null
}

export const getNotes = async (onlyWithoutCategory = false): Promise<Note[]> => {
    // Jeśli chcemy pobrać tylko notatki bez kategorii, dodajemy parametr category=''
    const url = onlyWithoutCategory ? '/api/notes?category=' : '/api/notes';
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json();
};

export interface NoteInput {
    content: string;
    category?: string | number | null; // Kategoria może być stringiem, liczbą lub null
    id_category?: string | number | null; // ID kategorii może być stringiem, liczbą lub null
}

export const addNote = async (note: NoteInput) => {
    const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(note),
    });
    if (!response.ok) {
        throw new Error('Błąd podczas dodawania notatki');
    }
    return response.json();
};

export const updateNote = async (id: string, note: NoteInput) => {
    const response = await fetch(`/api/notes/${id}`, { // Corrected URL
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(note),
    });
    if (!response.ok) {
        throw new Error('Błąd podczas aktualizacji notatki');
    }
    return response.json();
};

export const deleteNote = async (id: string) => {
    const response = await fetch(`/api/notes/${id}`, { // Corrected URL
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Błąd podczas usuwania notatki');
    }
    return response.json();
};

export interface Category {
    id: string;
    name: string;
}

export const getCategories = async (): Promise<Category[]> => {
    const response = await fetch('/api/categories', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json();
};

export const addCategory = async (name: string): Promise<Category> => {
    const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
    });
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json();
};

export const deleteCategory = async (id: string): Promise<void> => {
    const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
};
