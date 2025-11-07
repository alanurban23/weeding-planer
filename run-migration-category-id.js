import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not found in environment variables');
  process.exit(1);
}

console.log('Connecting to database...');

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1,
});

async function runMigration() {
  try {
    console.log('Running migration: Add category_id to costs table...');

    // Add category_id column
    await sql`
      ALTER TABLE costs
      ADD COLUMN IF NOT EXISTS category_id INT2 REFERENCES categories(id)
    `;
    console.log('✓ Added category_id column');

    // Add index
    await sql`
      CREATE INDEX IF NOT EXISTS costs_category_id_idx ON costs(category_id)
    `;
    console.log('✓ Created index on category_id');

    // Verify the column exists
    const result = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'costs' AND column_name = 'category_id'
    `;

    if (result.length > 0) {
      console.log('✓ Migration successful! Column category_id exists:', result[0]);
    } else {
      console.error('✗ Migration failed - column not found');
    }

    // Check current costs
    const costs = await sql`SELECT id, name, value, category_id FROM costs ORDER BY id`;
    console.log(`\n✓ Found ${costs.length} costs in database:`);
    costs.forEach(cost => {
      console.log(`  - ID ${cost.id}: ${cost.name} (${cost.value} PLN) - category_id: ${cost.category_id ?? 'null'}`);
    });

  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    await sql.end();
    console.log('\nDatabase connection closed.');
  }
}

runMigration();
