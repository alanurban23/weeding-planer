-- Migration: Add payment history tracking for costs
-- This creates a separate table for tracking multiple payments per cost

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

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS payment_history_cost_id_idx ON payment_history(cost_id);
CREATE INDEX IF NOT EXISTS payment_history_payment_date_idx ON payment_history(payment_date DESC);

-- Add comments for documentation
COMMENT ON TABLE payment_history IS 'Tracks individual payments made towards costs';
COMMENT ON COLUMN payment_history.cost_id IS 'Reference to the cost being paid';
COMMENT ON COLUMN payment_history.amount IS 'Amount of this payment';
COMMENT ON COLUMN payment_history.payment_date IS 'When this payment was made';
COMMENT ON COLUMN payment_history.note IS 'Optional note about this payment';

COMMENT ON COLUMN costs.amount_paid IS 'Total sum of all payments made (auto-calculated)';
COMMENT ON COLUMN costs.payment_status IS 'Status: unpaid, partial, paid';

-- Migration notes:
-- After running this migration, existing costs will have:
-- - amount_paid = 0
-- - payment_status = 'unpaid'
--
-- You can optionally run this to migrate existing paid costs:
-- UPDATE costs
-- SET amount_paid = value, payment_status = 'paid'
-- WHERE paid_date IS NOT NULL;
