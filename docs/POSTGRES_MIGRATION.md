# PostgreSQL Migration Guide

This app now stores runtime data in PostgreSQL. Existing MongoDB data can be copied with an explicit migration command so the website is not changed during normal startup.

## 1. Create a Least-Privilege Database User

Run this as a PostgreSQL admin and change the password:

```sql
CREATE DATABASE suraj_prime_tally;
CREATE USER tally_app WITH PASSWORD 'change-this-password';
GRANT CONNECT ON DATABASE suraj_prime_tally TO tally_app;
\c suraj_prime_tally
GRANT USAGE, CREATE ON SCHEMA public TO tally_app;
```

Use SSL in hosted or production databases:

```env
DATABASE_URL=postgres://tally_app:change-this-password@host:5432/suraj_prime_tally
POSTGRES_SSL=true
POSTGRES_SSL_REJECT_UNAUTHORIZED=true
```

## 2. Back Up MongoDB First

```bash
mongodump --uri="$MONGODB_URI" --out ./mongo-backup-before-postgres
```

Keep this backup until PostgreSQL reports, login, company access, vouchers, and reports have been checked.

## 3. Copy Data

From `server`:

```bash
npm install
npm run migrate:mongo-postgres -- --reset
npm run verify:postgres-migration
```

The script copies MongoDB `_id` values as strings, so existing frontend URLs and references keep working. `--reset` clears the PostgreSQL target tables first. Use `--merge` only when you intentionally want to upsert into an existing PostgreSQL target.

The verifier compares every migrated MongoDB collection count with the PostgreSQL target and exits with an error if anything is missing.

## 4. Verify Before Switching Traffic

Start the API with `DATABASE_URL` set and check:

- Register/login still works.
- Existing users can see their companies.
- Company users and permissions load.
- Ledgers, vouchers, reports, GST, banking, and payroll screens open.
- Creating two vouchers quickly gives unique voucher numbers.

## 5. ACID and Accounting Safety

- PostgreSQL commits each write atomically.
- Voucher/document counters are incremented in serializable transactions with the created voucher/document.
- Unique indexes are created for accounting keys such as company ledger names, voucher numbers, users, counters, and financial years.
- Secrets stay in environment variables; do not commit real `DATABASE_URL`, `JWT_SECRET`, SMTP credentials, or backups.
