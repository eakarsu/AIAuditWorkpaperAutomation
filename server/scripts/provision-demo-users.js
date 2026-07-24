'use strict';

const bcrypt = require('bcryptjs');
const pool = require('../db');

const demoUsers = [
  { name: 'Sarah Mitchell', email: 'admin@auditpro.com', role: 'admin' },
  { name: 'John Anderson', email: 'john@auditpro.com', role: 'senior_auditor' },
  { name: 'Emily Chen', email: 'emily@auditpro.com', role: 'auditor' },
];

async function provisionDemoUsers() {
  if (process.env.NODE_ENV === 'production' || process.env.CONFIRM_DEMO_SEED !== 'yes') {
    throw new Error('Demo-user provisioning is allowed only for an explicitly confirmed non-production seed');
  }
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 12) throw new Error('DEMO_PASSWORD must contain at least 12 characters');
  const passwordHash = await bcrypt.hash(password, 10);
  for (const user of demoUsers) {
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
       SET name=EXCLUDED.name, password_hash=EXCLUDED.password_hash, role=EXCLUDED.role`,
      [user.name, user.email, passwordHash, user.role]
    );
  }
  console.log(`Provisioned ${demoUsers.length} local demo users.`);
}

provisionDemoUsers()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error.message);
    await pool.end().catch(() => {});
    process.exitCode = 1;
  });
