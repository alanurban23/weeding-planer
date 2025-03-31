// api.ts
export interface Note {
    id: string;
    content: string;
    created_at: string;
    category?: string; // Dodajemy opcjonalne pole kategorii
}

export const getNotes = async (): Promise<Note[]> => {
    const response = await fetch('/api/notes', {
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
    category?: string; // Dodajemy opcjonalne pole kategorii
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
        throw new Error('Network response was not ok');
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
