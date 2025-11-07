# Instrukcja uruchomienia migracji bazy danych

## ⚠️ WAŻNE - Musisz uruchomić te migracje przed korzystaniem z nowych funkcji!

Aplikacja wymaga uruchomienia **4 migracji SQL** w Supabase:

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

### Krok 3: 🆕 Dodaj system historii płatności

**Plik:** `migrations/0004_add_payment_history.sql`

```sql
-- Create payment_history table
CREATE TABLE IF NOT EXISTS payment_history (
  id SERIAL PRIMARY KEY,
  cost_id INTEGER NOT NULL REFERENCES costs(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add amount_paid and payment_status to costs table
ALTER TABLE costs
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';

-- Create indexes
CREATE INDEX IF NOT EXISTS payment_history_cost_id_idx ON payment_history(cost_id);
CREATE INDEX IF NOT EXISTS payment_history_payment_date_idx ON payment_history(payment_date DESC);
```

## Jak uruchomić migracje?

### Opcja 1: Panel Supabase (Zalecane)

1. Otwórz panel Supabase: https://supabase.com/dashboard/project/qevzcmejngifsqxbmesr/sql
2. Kliknij "New query" lub "+ New"
3. Skopiuj i wklej **całą zawartość** pliku `fix-costs-table-migration.sql`
4. Kliknij "Run" (lub Ctrl+Enter)
5. Powtórz kroki 2-4 dla pliku `migrations/0003_add_payment_tracking_to_costs.sql`
6. Powtórz kroki 2-4 dla pliku `migrations/0004_add_payment_history.sql`

### Opcja 2: Jedna migracja (wszystko naraz)

Możesz uruchomić wszystkie migracje jednocześnie:

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

-- Migracja 3: payment history system
CREATE TABLE IF NOT EXISTS payment_history (
  id SERIAL PRIMARY KEY,
  cost_id INTEGER NOT NULL REFERENCES costs(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE costs
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';

CREATE INDEX IF NOT EXISTS payment_history_cost_id_idx ON payment_history(cost_id);
CREATE INDEX IF NOT EXISTS payment_history_payment_date_idx ON payment_history(payment_date DESC);
```

## Weryfikacja

Po uruchomieniu migracji sprawdź, czy wszystko działa:

```sql
-- Sprawdź strukturę tabeli costs
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
- ✅ amount_paid (NOWE - historia płatności)
- ✅ payment_status (NOWE - historia płatności)

Sprawdź też czy tabela payment_history została utworzona:
```sql
SELECT * FROM payment_history LIMIT 1;
```

## Co dalej?

Po uruchomieniu migracji aplikacja będzie działać z pełną funkcjonalnością:

### ✨ Nowe funkcje dostępne w aplikacji:

1. **Edycja kosztów** - kliknij ikonę ołówka przy koszcie
2. **Usuwanie kosztów** - kliknij ikonę kosza przy koszcie
3. **🆕 Historia płatności wieloetapowych:**
   - Dodawanie wielu płatności do jednego kosztu
   - Płatność kwotą (zł) lub procentem (%)
   - Automatyczne przeliczanie zapłaconej kwoty
   - Lista płatności z datami i notatkami
   - Checkbox "Zapłacono w całości"
   - Możliwość usuwania płatności
4. **Statusy płatności:**
   - 🟢 Zapłacone - gdy `amount_paid >= total_amount`
   - 🟡 Częściowo zapłacone - gdy `amount_paid > 0` ale mniej niż `total_amount`
   - 🔴 Nieopłacone - gdy `amount_paid = 0`

### 📝 Przykłady użycia:

**Przykład 1: Kaucja zapłacona, pozostała reszta (stary sposób)**
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

### 🆕 Przykłady z nowym systemem historii płatności:

**Przykład 4: Płatność w trzech ratach**
1. Edytuj koszt, ustaw całkowitą kwotę: 15000 PLN
2. W sekcji "Historia płatności":
   - Dodaj pierwszą płatność: 5000 PLN (lub 33.3%) - notatka: "Pierwsza rata"
   - Dodaj drugą płatność: 5000 PLN - notatka: "Druga rata"
   - Kliknij checkbox "Zapłacono w całości" - automatycznie doda 5000 PLN
→ Status: **Zapłacone** (15000/15000 PLN, 100%)

**Przykład 5: Płatność procentowa**
1. Całkowita kwota: 10000 PLN
2. W sekcji "Historia płatności":
   - Wybierz "Procent (%)"
   - Wprowadź: 50%
   - System automatycznie przeliczy: 5000 PLN
3. Pozostało: 5000 PLN (50%)
→ Status: **Częściowo zapłacone**

**Przykład 6: Śledzenie wielu płatności**
- Koszt całkowity: 8000 PLN
- Płatności:
  - 2000 PLN (25%) - "Zaliczka" - 2025-01-15
  - 3000 PLN (37.5%) - "Druga rata" - 2025-02-20
  - 3000 PLN (37.5%) - "Finalna płatność" - 2025-03-10
- Suma zapłacona: 8000 PLN
- Status: **Zapłacone** ✅

## 🚀 Główne zalety nowego systemu:

- ✅ **Wieloetapowe płatności** - śledź każdą ratę osobno
- ✅ **Elastyczność** - płać kwotą lub procentem
- ✅ **Pełna historia** - każda płatność z datą i notatką
- ✅ **Automatyka** - system sam przelicza statusy i sumuje kwoty
- ✅ **Łatwość użycia** - checkbox "Zapłacono w całości" jednym kliknięciem
- ✅ **Kontrola** - możliwość usuwania błędnych płatności
- ✅ **Przejrzystość** - wizualne statusy i procenty

## Potrzebujesz pomocy?

Jeśli migracja nie działa, sprawdź logi błędów w panelu Supabase lub skontaktuj się ze mną.
