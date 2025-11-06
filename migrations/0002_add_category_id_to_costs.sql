ALTER TABLE costs
ADD COLUMN IF NOT EXISTS category_id INT2 REFERENCES categories(id);

CREATE INDEX IF NOT EXISTS costs_category_id_idx ON costs(category_id);
