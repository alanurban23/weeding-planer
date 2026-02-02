-- Tabela do przechowywania notatki listy gości (jedna notatka tekstowa)
CREATE TABLE IF NOT EXISTS guest_list_note (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Wstaw domyślny pusty wiersz
INSERT INTO guest_list_note (content) VALUES ('') ON CONFLICT DO NOTHING;

-- Włącz RLS
ALTER TABLE guest_list_note ENABLE ROW LEVEL SECURITY;

-- Polityka publicznego dostępu (w produkcji ograniczyć do uwierzytelnionych użytkowników)
CREATE POLICY "Allow public access to guest_list_note"
    ON guest_list_note
    FOR ALL
    USING (true)
    WITH CHECK (true);
