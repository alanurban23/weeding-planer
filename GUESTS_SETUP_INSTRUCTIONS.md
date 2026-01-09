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
  - `full_name` - imię i nazwisko (wymagane)
  - `email` - adres email (opcjonalny)
  - `phone` - numer telefonu (opcjonalny)
  - `side` - strona wesela: panna młoda/pan młody (opcjonalny)
  - `rsvp_status` - status RSVP: pending/confirmed/declined (domyślnie: pending)
  - `notes` - dodatkowe notatki (opcjonalny)
  - `created_at` - data dodania (automatycznie)

- **Indeksy** dla lepszej wydajności:
  - Indeks na `rsvp_status`
  - Indeks na `full_name`

- **Row Level Security (RLS)** z polityką dostępu publicznego
  - ⚠️ **UWAGA**: W środowisku produkcyjnym powinieneś ograniczyć dostęp tylko dla uwierzytelnionych użytkowników

## Po uruchomieniu skryptu

Po utworzeniu tabeli:
1. Aplikacja powinna automatycznie zacząć działać
2. Możesz dodawać gości przez interfejs użytkownika
3. Import z pliku CSV również będzie działał

## Pliki
- `create-guests-table.sql` - standalone skrypt do uruchomienia w Supabase
- `migrations/0005_create_guests_table.sql` - plik migracji (dla systemów migracji)
