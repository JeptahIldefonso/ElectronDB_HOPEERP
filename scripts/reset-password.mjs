#!/usr/bin/env node
// scripts/reset-password.mjs
// Safely resets or creates a user password in local SQLite (hope.work.db) or Turso cloud libSQL.
// Also supports generating the base64 hash format for Vercel environment variables (--hash).
// Never prints raw passwords. Reads hidden input from terminal.

import readline from 'node:readline';
import { Writable } from 'node:stream';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { createClient } from '@libsql/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let rlNonTTY = null;
let itNonTTY = null;

function ask(promptText, hidden = false) {
  if (!process.stdin.isTTY) {
    if (!rlNonTTY) {
      rlNonTTY = readline.createInterface({ input: process.stdin, terminal: false });
      itNonTTY = rlNonTTY[Symbol.asyncIterator]();
    }
    process.stdout.write(promptText);
    return itNonTTY.next().then((res) => (res.value || '').trim());
  }

  return new Promise((resolve) => {
    let muted = false;
    const mutableStdout = new Writable({
      write(chunk, encoding, callback) {
        if (!muted || !hidden) {
          process.stdout.write(chunk, encoding);
        }
        callback();
      },
    });

    const rl = readline.createInterface({
      input: process.stdin,
      output: mutableStdout,
      terminal: true,
    });

    process.stdout.write(promptText);
    if (hidden) muted = true;

    rl.question('', (answer) => {
      muted = false;
      if (hidden) process.stdout.write('\n');
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('====================================================');
  console.log(' Hope, Inc. ERP — Secure Account Password Recovery');
  console.log('====================================================\n');

  // Mode: Generate Vercel environment variable base64 hash
  if (process.argv.includes('--hash')) {
    console.log('[Mode: Generate Vercel DEV_ADMIN_PASSWORD_HASH]');
    const pass = await ask('Enter password: ', true);
    if (!pass || pass.length < 8) {
      console.error('Error: Password must be at least 8 characters long.');
      process.exit(1);
    }
    const confirm = await ask('Confirm password: ', true);
    if (pass !== confirm) {
      console.error('Error: Passwords do not match.');
      process.exit(1);
    }

    const saltRounds = 10;
    const rawHash = bcrypt.hashSync(pass, saltRounds);
    const b64Hash = 'base64:' + Buffer.from(rawHash, 'utf8').toString('base64');

    console.log('\n--- Vercel Environment Variable Value ---');
    console.log('Set DEV_ADMIN_PASSWORD_HASH in Vercel to:\n');
    console.log(b64Hash);
    console.log('\n(Copy this value into Vercel Project Settings -> Environment Variables)');
    process.exit(0);
  }

  // Load environment variables from .env.local if present
  const envLocalPath = path.join(rootDir, '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const lines = fs.readFileSync(envLocalPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }

  // Determine target database: Turso cloud if credentials configured, otherwise local hope.work.db
  const isTurso = Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
  let dbClient;

  if (isTurso) {
    console.log('[reset-password] Target: Hosted Turso Database (' + process.env.TURSO_DATABASE_URL + ')');
    dbClient = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  } else {
    const localDbPath = path.join(rootDir, 'hope.work.db').replace(/\\/g, '/');
    console.log(`[reset-password] Target: Local Working Copy (file:${localDbPath})`);
    dbClient = createClient({
      url: `file:${localDbPath}`,
    });
  }

  let emailArg = process.argv[2]?.trim();
  if (!emailArg || emailArg.startsWith('-')) {
    emailArg = await ask('Enter user email: ', false);
  }

  if (!emailArg) {
    console.error('Error: Email address is required.');
    process.exit(1);
  }

  const email = emailArg.toLowerCase();

  // Query existing account
  const res = await dbClient.execute({
    sql: 'SELECT userId, firstName, lastName, email, role, isBlocked, status FROM USERS WHERE LOWER(email) = LOWER(?)',
    args: [email],
  });

  let userId;
  let role = 'Superadmin';
  const existing = res.rows[0];

  if (!existing) {
    console.log(`Account '${email}' does not exist on the target database.`);
    const createChoice = await ask('Would you like to create this account now? (y/N): ', false);
    if (createChoice.toLowerCase() !== 'y') {
      console.log('Operation cancelled.');
      process.exit(0);
    }
    const firstName = (await ask('First Name: ', false)) || 'User';
    const lastName = (await ask('Last Name: ', false)) || 'Account';
    const roleChoice = (await ask('Role (Superadmin / Admin / User) [default: Superadmin]: ', false)) || 'Superadmin';
    role = roleChoice === 'Admin' ? 'Admin' : roleChoice === 'User' ? 'User' : 'Superadmin';

    userId = `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const newPassword = await ask('Enter new password (min 8 characters): ', true);
    if (!newPassword || newPassword.length < 8) {
      console.error('Error: Password must be at least 8 characters long.');
      process.exit(1);
    }

    const confirmPassword = await ask('Confirm new password: ', true);
    if (newPassword !== confirmPassword) {
      console.error('Error: Passwords do not match.');
      process.exit(1);
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);

    await dbClient.execute({
      sql: `INSERT INTO USERS (userId, firstName, lastName, email, passwordHash, role, isBlocked, status, stamp, mustChangePassword, sessionVersion)
            VALUES (?, ?, ?, ?, ?, ?, 0, 'Active', 'CREATED script', 0, 1)`,
      args: [userId, firstName, lastName, email, passwordHash, role],
    });

    console.log(`✓ Account '${email}' created successfully with role '${role}'.`);
  } else {
    userId = String(existing.userId);
    console.log(`Found account: ${existing.firstName} ${existing.lastName} (${existing.role})`);

    const newPassword = await ask('Enter new password (min 8 characters): ', true);
    if (!newPassword || newPassword.length < 8) {
      console.error('Error: Password must be at least 8 characters long.');
      process.exit(1);
    }

    const confirmPassword = await ask('Confirm new password: ', true);
    if (newPassword !== confirmPassword) {
      console.error('Error: Passwords do not match.');
      process.exit(1);
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);

    await dbClient.execute({
      sql: `UPDATE USERS 
            SET passwordHash = ?, 
                mustChangePassword = 0, 
                isBlocked = 0, 
                status = 'Active', 
                sessionVersion = COALESCE(sessionVersion, 1) + 1 
            WHERE userId = ?`,
      args: [passwordHash, userId],
    });

    console.log(`✓ Password successfully updated and account unblocked for '${email}'.`);
  }

  // Grant all canonical rights if Superadmin or Admin
  if (role === 'Superadmin' || role === 'Admin') {
    const rightsRes = await dbClient.execute('SELECT rightCode FROM RIGHTS');
    for (const r of rightsRes.rows) {
      await dbClient.execute({
        sql: 'INSERT OR IGNORE INTO USERRIGHTS (userId, rightCode) VALUES (?, ?)',
        args: [userId, String(r.rightCode)],
      });
    }
    console.log(`✓ Canonical rights verified for ${email}.`);
  }

  console.log('\n[Done] You may now sign in with your updated credentials.');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n[Error]:', err?.message || err);
  process.exit(1);
});
