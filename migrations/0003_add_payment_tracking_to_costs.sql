-- Migration: Add payment tracking fields to costs table
-- This allows tracking: due dates, payment dates, partial payments, and notes

-- Add new columns for payment tracking
ALTER TABLE costs
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2), -- Całkowita kwota do zapłaty (jeśli value to tylko część, np. kaucja)
ADD COLUMN IF NOT EXISTS due_date DATE, -- Termin płatności (kiedy trzeba zapłacić)
ADD COLUMN IF NOT EXISTS paid_date DATE, -- Data faktycznej płatności (kiedy zapłacono)
ADD COLUMN IF NOT EXISTS notes TEXT; -- Dodatkowe notatki o płatności

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS costs_due_date_idx ON costs(due_date);
CREATE INDEX IF NOT EXISTS costs_paid_date_idx ON costs(paid_date);

-- Add comments for documentation
COMMENT ON COLUMN costs.value IS 'Kwota zapłacona lub do zapłaty (może być kaucją lub częścią płatności)';
COMMENT ON COLUMN costs.total_amount IS 'Całkowita kwota do zapłaty (opcjonalne, jeśli value to tylko część płatności)';
COMMENT ON COLUMN costs.due_date IS 'Termin płatności - kiedy należy zapłacić';
COMMENT ON COLUMN costs.paid_date IS 'Data faktycznej płatności - kiedy zapłacono';
COMMENT ON COLUMN costs.notes IS 'Dodatkowe notatki o płatności';

-- Examples of usage:
-- 1. Kaucja zapłacona, pozostała reszta:
--    value: 3500 (zapłacone), total_amount: 10000, paid_date: '2025-04-04', due_date: null/future
--
-- 2. Do zapłaty za tydzień:
--    value: 1000, total_amount: null, paid_date: null, due_date: '2025-11-14'
--
-- 3. Zapłacone tydzień temu:
--    value: 1000, total_amount: null, paid_date: '2025-10-31', due_date: null
