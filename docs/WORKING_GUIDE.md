# Suraj Prime Tally Working Guide

This project is a Tally-style accounting web app with:

- React/Vite frontend in `client`
- Express API in `server`
- PostgreSQL database through the server document model layer
- JWT login for users
- Company-scoped accounting data so each company has separate books
- Multi-user company access with owner, admin, accountant, and viewer roles

## 1. First Setup

Install dependencies from the project root:

```bash
npm run install-all
```

Create or update `server/.env`:

```env
PORT=5000
DATABASE_URL=postgres://tally_app:change-this-password@127.0.0.1:5432/suraj_prime_tally
POSTGRES_SSL=false
JWT_SECRET=change-this-to-a-long-random-secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

Start PostgreSQL, then run the app:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

## 2. Normal Working Flow

1. Register the first user.
2. Go to `/app/companies`.
3. Create a company.
4. Select that company.
5. Add masters such as groups, ledgers, stock items, units, godowns, employees, and pay heads.
6. Enter vouchers from the Transactions menu.
7. View reports such as Day Book, Trial Balance, Balance Sheet, Profit and Loss, Cash Flow, GST reports, payroll, and banking.

When a company is created, the server seeds default Tally-style groups and ledgers for that company.

## 3. Multi-User Company Access

Users must register first. After that, an owner or admin can add them to a company from:

```text
/app/companies -> Users button
```

Roles:

- `owner`: created the company, can edit company details, add/remove users, and delete the company.
- `admin`: can manage company details and users.
- `accountant`: can create and edit accounting data.
- `viewer`: can read company data and reports only. The API blocks create/edit/delete requests.

Company data is always accessed through URLs like:

```text
/api/companies/:companyId/ledgers
/api/companies/:companyId/vouchers
/api/companies/:companyId/reports/trial-balance
```

The API checks that the logged-in user owns the company or is an active member before returning data.

## 4. Database Structure

Important PostgreSQL document tables:

- `users`: login accounts.
- `companies`: company profile, owner, and member list.
- `groups`: account groups per company.
- `ledgers`: ledgers per company.
- `vouchers`: accounting and inventory vouchers per company.
- `stockitems`, `stockgroups`, `units`, `godowns`: inventory masters.
- `employees`, `payheads`, `payrollvouchers`: payroll.
- `counters`: transactional sequence numbers for vouchers.

Every accounting collection stores a `company` field. This keeps each company's books separate, even when many users are using the app at the same time.

## 5. Concurrent Voucher Numbers

Voucher numbers are generated through the `counters` table with a PostgreSQL transaction and row lock.

That means if two users create a Sales voucher at the same time, PostgreSQL atomically gives them different numbers:

```text
SI-0001
SI-0002
```

This avoids duplicate voucher numbers under normal multi-user usage, and the voucher insert is committed with the counter update.

## 6. Useful API Examples

Register:

```http
POST /api/auth/register
{
  "name": "Suraj",
  "email": "suraj@example.com",
  "password": "secret123"
}
```

Create company:

```http
POST /api/companies
Authorization: Bearer TOKEN
{
  "name": "Demo Traders",
  "state": "Maharashtra",
  "gstin": "27ABCDE1234F1Z5"
}
```

Add a registered user to a company:

```http
POST /api/companies/COMPANY_ID/users
Authorization: Bearer TOKEN
{
  "email": "accountant@example.com",
  "role": "accountant"
}
```

Create voucher:

```http
POST /api/companies/COMPANY_ID/vouchers
Authorization: Bearer TOKEN
{
  "voucherType": "Journal",
  "date": "2026-04-30",
  "entries": [
    { "ledger": "LEDGER_ID_1", "type": "Dr", "amount": 1000 },
    { "ledger": "LEDGER_ID_2", "type": "Cr", "amount": 1000 }
  ],
  "narration": "Opening adjustment"
}
```

## 7. Troubleshooting

If login works but app pages fail:

- Check that `server/.env` has `JWT_SECRET`.
- Check that PostgreSQL is running and `DATABASE_URL` is correct.
- Check browser dev tools for failed `/api/...` requests.

If a user cannot see a company:

- Confirm the user has registered.
- Add the user from the company Users modal.
- Confirm their status is `active`.

If a viewer cannot save:

- That is expected. Change the user role to `accountant` or `admin`.

If the frontend cannot reach the backend:

- In development, Vite should proxy `/api` to the Express server.
- Confirm the server is running on port `5000`.
- Confirm the frontend is running on port `5173`.
