const { AsyncLocalStorage } = require('async_hooks');
const { Pool } = require('pg');

let pool;

const transactionContext = new AsyncLocalStorage();

const sslConfig = () => {
  const mode = String(process.env.PGSSLMODE || '').toLowerCase();
  const explicit = String(process.env.POSTGRES_SSL || '').toLowerCase();

  if (explicit === 'false' || mode === 'disable') return false;
  if (explicit === 'true' || mode === 'require' || process.env.NODE_ENV === 'production') {
    return {
      rejectUnauthorized: process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED !== 'false',
    };
  }
  return false;
};

const databaseUrl = () => (
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URI
);

const connectDB = async () => {
  if (pool) return pool;

  const connectionString = databaseUrl();
  if (!connectionString) {
    throw new Error('PostgreSQL connection missing. Set DATABASE_URL in server/.env.');
  }

  pool = new Pool({
    connectionString,
    max: Number(process.env.POSTGRES_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.POSTGRES_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.POSTGRES_CONNECT_TIMEOUT_MS || 10000),
    application_name: process.env.POSTGRES_APPLICATION_NAME || 'suraj-prime-tally-api',
    ssl: sslConfig(),
  });

  pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL client error:', error.message);
  });

  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('PostgreSQL connected');
  } finally {
    client.release();
  }

  return pool;
};

const getPool = () => {
  if (!pool) {
    throw new Error('PostgreSQL is not connected. Call connectDB() before using models.');
  }
  return pool;
};

const query = (text, params = []) => {
  const client = transactionContext.getStore();
  if (client) return client.query(text, params);
  return getPool().query(text, params);
};

const withTransaction = async (work, options = {}) => {
  const existingClient = transactionContext.getStore();
  if (existingClient) return work(existingClient);

  const isolationLevel = options.isolationLevel || 'READ COMMITTED';
  const allowedIsolationLevels = new Set(['READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE']);
  if (!allowedIsolationLevels.has(isolationLevel)) {
    throw new Error(`Unsupported PostgreSQL isolation level: ${isolationLevel}`);
  }

  const retries = Number(options.retries ?? 2);
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
      await client.query('SELECT set_config($1, $2, true)', [
        'idle_in_transaction_session_timeout',
        String(process.env.POSTGRES_IDLE_IN_TX_TIMEOUT || '15000ms'),
      ]);
      await client.query('SELECT set_config($1, $2, true)', [
        'statement_timeout',
        String(process.env.POSTGRES_STATEMENT_TIMEOUT || '15000ms'),
      ]);

      const result = await transactionContext.run(client, () => work(client));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('PostgreSQL rollback failed:', rollbackError.message);
      }

      if (attempt < retries && ['40001', '40P01'].includes(error.code)) {
        continue;
      }
      throw error;
    } finally {
      client.release();
    }
  }

  throw new Error('PostgreSQL transaction failed after retries');
};

const closeDB = async () => {
  if (!pool) return;
  await pool.end();
  pool = undefined;
};

module.exports = {
  closeDB,
  connectDB,
  getPool,
  query,
  withTransaction,
};
