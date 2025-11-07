# Instrukcja uruchomienia migracji bazy danych

## ⚠️ WAŻNE - Musisz uruchomić te migracje przed korzystaniem z nowych funkcji!

Aplikacja wymaga uruchomienia 2 migracji SQL w Supabase:

### Krok 1: Dodaj kolumnę category_id

**Plik:** `fix-costs-table-migration.sql`

```sql
ALTER TABLE costs
ADD COLUMN IF NOT EXISTS category_id INT2 REFERENCES categories(id);

CREATE INDEX IF NOT EXISTS costs_category_id_idx ON costs(category_id);
```

### Krok 2: Dodaj pola śledzenia płatności

**Plik:** `migrations/0003_add_payment_tracking_to_costs.sql`

```sql
ALTER TABLE costs
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS paid_date DATE,
ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS costs_due_date_idx ON costs(due_date);
CREATE INDEX IF NOT EXISTS costs_paid_date_idx ON costs(paid_date);
```

## Jak uruchomić migracje?

### Opcja 1: Panel Supabase (Zalecane)

1. Otwórz panel Supabase: https://supabase.com/dashboard/project/qevzcmejngifsqxbmesr/sql
2. Kliknij "New query" lub "+ New"
3. Skopiuj i wklej **całą zawartość** pliku `fix-costs-table-migration.sql`
4. Kliknij "Run" (lub Ctrl+Enter)
5. Powtórz kroki 2-4 dla pliku `migrations/0003_add_payment_tracking_to_costs.sql`

### Opcja 2: Jedna migracja (wszystko naraz)

Możesz uruchomić obie migracje jednocześnie:

```sql
-- Migracja 1: category_id
ALTER TABLE costs
ADD COLUMN IF NOT EXISTS category_id INT2 REFERENCES categories(id);

CREATE INDEX IF NOT EXISTS costs_category_id_idx ON costs(category_id);

-- Migracja 2: payment tracking
ALTER TABLE costs
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS paid_date DATE,
ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS costs_due_date_idx ON costs(due_date);
CREATE INDEX IF NOT EXISTS costs_paid_date_idx ON costs(paid_date);
```

## Weryfikacja

Po uruchomieniu migracji sprawdź, czy wszystko działa:

```sql
-- Sprawdź strukturę tabeli
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'costs'
ORDER BY ordinal_position;
```

Powinieneś zobaczyć wszystkie pola:
- ✅ id
- ✅ name
- ✅ value
- ✅ created_at
- ✅ category_id (NOWE)
- ✅ total_amount (NOWE)
- ✅ due_date (NOWE)
- ✅ paid_date (NOWE)
- ✅ notes (NOWE)

## Co dalej?

Po uruchomieniu migracji aplikacja będzie działać z pełną funkcjonalnością:

### ✨ Nowe funkcje dostępne w aplikacji:

1. **Edycja kosztów** - kliknij ikonę ołówka przy koszcie
2. **Usuwanie kosztów** - kliknij ikonę kosza przy koszcie
3. **Statusy płatności:**
   - 🟢 Zapłacone - gdy ustawisz `paid_date`
   - 🟡 Częściowo zapłacone - gdy `value < total_amount` i ustawisz `paid_date`
   - 🔴 Przeterminowane - gdy `due_date` minął
   - ⏰ Do zapłaty za X dni - gdy `due_date` jest w przyszłości

### 📝 Przykłady użycia:

**Przykład 1: Kaucja zapłacona, pozostała reszta**
- Nazwa: "Sala weselna"
- Kwota (value): 3500 PLN (zapłacona kaucja)
- Całkowita kwota (total_amount): 10000 PLN
- Data zapłaty (paid_date): 2025-04-04
- Termin płatności (due_date): 2025-06-01 (dla reszty)
- Status: **Częściowo zapłacone** (3500 z 10000 PLN)

**Przykład 2: Do zapłaty za tydzień**
- Nazwa: "Zespół weselny"
- Kwota (value): 5000 PLN
- Termin płatności (due_date): 2025-11-14
- Status: **Do zapłaty za 7 dni**

**Przykład 3: Zapłacone tydzień temu**
- Nazwa: "Ksiądz"
- Kwota (value): 200 PLN
- Data zapłaty (paid_date): 2025-10-31
- Status: **Zapłacone**

## Potrzebujesz pomocy?

Jeśli migracja nie działa, sprawdź logi błędów w panelu Supabase lub skontaktuj się ze mną.
