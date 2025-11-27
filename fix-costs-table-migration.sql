-- Migration: Add category_id column to costs table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/qevzcmejngifsqxbmesr/sql

-- Add category_id column if it doesn't exist
ALTER TABLE costs
ADD COLUMN IF NOT EXISTS category_id INT2 REFERENCES categories(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS costs_category_id_idx ON costs(category_id);

-- Verify the migration
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'costs'
ORDER BY ordinal_position;

-- Check current costs
SELECT id, name, value, category_id, created_at
FROM costs
ORDER BY created_at DESC;
