# Instrukcja konfiguracji tabeli Guests w Supabase

## Problem
Aplikacja zwracała błąd: `relation "public.guests" does not exist` - tabela guests nie istniała w bazie danych.

## Rozwiązanie

### Krok 1: Zaloguj się do Supabase
1. Przejdź do https://supabase.com
2. Zaloguj się do swojego projektu

### Krok 2: Otwórz SQL Editor
1. W menu bocznym wybierz **SQL Editor**
2. Kliknij **New query** lub wybierz istniejące zapytanie

### Krok 3: Uruchom skrypt SQL
1. Skopiuj zawartość pliku `create-guests-table.sql`
2. Wklej do SQL Editor
3. Kliknij **Run** (lub naciśnij Ctrl+Enter)

### Krok 4: Zweryfikuj utworzenie tabeli
Po uruchomieniu skryptu powinieneś zobaczyć komunikat o powodzeniu. Możesz zweryfikować, że tabela została utworzona:

```sql
SELECT * FROM public.guests;
```

## Co robi ten skrypt?

Skrypt tworzy:
- **Tabelę `guests`** z następującymi kolumnami:
  - `id` - unikalny identyfikator (auto-increment)
  - `full_name` - nazwa grupy gości (wymagane)
  - `guest_count` - liczba osób w grupie (domyślnie: 1)
  - `email` - adres email grupy/osoby kontaktowej (opcjonalny)
  - `phone` - numer telefonu grupy/osoby kontaktowej (opcjonalny)
  - `side` - strona wesela: panna młoda/pan młody (opcjonalny)
  - `rsvp_status` - status RSVP: pending/confirmed/declined (domyślnie: pending)
  - `notes` - dodatkowe notatki (opcjonalny)
  - `created_at` - data dodania (automatycznie)

**UWAGA**: System wspiera grupowanie gości. Możesz dodać grupę np.:
- "Zespół muzyczny" z guest_count = 5
- "Andzia z mężem i dzieckiem" z guest_count = 3
- "Jan Kowalski" z guest_count = 1 (pojedyncza osoba)

- **Indeksy** dla lepszej wydajności:
  - Indeks na `rsvp_status`
  - Indeks na `full_name`

- **Row Level Security (RLS)** z polityką dostępu publicznego
  - ⚠️ **UWAGA**: W środowisku produkcyjnym powinieneś ograniczyć dostęp tylko dla uwierzytelnionych użytkowników

## Aktualizacja dla istniejących instalacji

Jeśli masz już tabelę `guests` bez pola `guest_count`, uruchom tę migrację:

1. Otwórz SQL Editor w Supabase
2. Uruchom zawartość pliku `migrations/0006_add_guest_count_to_guests.sql`:

```sql
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS guest_count INTEGER NOT NULL DEFAULT 1;

ALTER TABLE guests
ADD CONSTRAINT check_guest_count_positive CHECK (guest_count >= 1);
```

## Po uruchomieniu skryptu

Po utworzeniu/zaktualizowaniu tabeli:
1. Aplikacja powinna automatycznie zacząć działać
2. Możesz dodawać grupy gości przez interfejs użytkownika
3. Import z pliku CSV również będzie działał
4. Statystyki będą pokazywać łączną liczbę osób (sumę wszystkich guest_count)

## Pliki
- `create-guests-table.sql` - standalone skrypt do uruchomienia w Supabase (zawiera guest_count)
- `migrations/0005_create_guests_table.sql` - migracja tworzenia tabeli (stara wersja)
- `migrations/0006_add_guest_count_to_guests.sql` - migracja dodająca pole guest_count
