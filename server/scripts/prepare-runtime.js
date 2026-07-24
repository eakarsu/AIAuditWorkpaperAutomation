'use strict';

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('../db');

async function prepareRuntime() {
  if (process.env.MIGRATE_ON_START !== 'true') return;

  const client = await pool.connect();
  try {
    const schema = await client.query("SELECT to_regclass('public.users') AS users");
    if (!schema.rows[0].users) {
      const initialSchema = fs.readFileSync(path.join(__dirname, '..', 'seed', 'init.sql'), 'utf8');
      await client.query(initialSchema);
    }

    const migrationsDir = path.join(__dirname, '..', 'migrations');
    for (const filename of fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort()) {
      await client.query(fs.readFileSync(path.join(migrationsDir, filename), 'utf8'));
    }

    const email = process.env.PROVISION_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
    const password = process.env.PROVISION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
    if (email && password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'admin')
         ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, role='admin'`,
        ['Runtime Administrator', email.trim().toLowerCase(), passwordHash]
      );
    }
  } finally {
    client.release();
    await pool.end();
  }
}

prepareRuntime().catch((error) => {
  console.error(`Runtime preparation failed: ${error.message}`);
  process.exitCode = 1;
});
