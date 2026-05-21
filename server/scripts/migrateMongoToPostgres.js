require('dotenv').config();

const { MongoClient } = require('mongodb');
const { closeDB, connectDB } = require('../config/db');
const MANIFEST = require('./migrationManifest');

const MODELS = MANIFEST.map(([name, collection, modelPath]) => [name, collection, require(modelPath)]);

const args = new Set(process.argv.slice(2));
const resetTarget = args.has('--reset') || process.env.RESET_POSTGRES === 'true';
const allowMerge = args.has('--merge') || process.env.MIGRATE_ALLOW_MERGE === 'true';

const normalizeBson = (value) => {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return value.toString('base64');
  if (Array.isArray(value)) return value.map(normalizeBson);

  if (typeof value === 'object') {
    if (value._bsontype === 'ObjectId' && typeof value.toHexString === 'function') {
      return value.toHexString();
    }
    if (value._bsontype === 'Decimal128') return Number(value.toString());
    if (value._bsontype === 'Long' || value._bsontype === 'Int32' || value._bsontype === 'Double') {
      return Number(value);
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, normalizeBson(child)])
    );
  }

  return value;
};

const assertTargetIsSafe = async () => {
  if (resetTarget || allowMerge) return;

  const nonEmpty = [];
  for (const [name, , Model] of MODELS) {
    const count = await Model.countDocuments({});
    if (count > 0) nonEmpty.push(`${name}:${count}`);
  }

  if (nonEmpty.length) {
    throw new Error(
      `PostgreSQL target already has data (${nonEmpty.join(', ')}). Use --merge to upsert or --reset to clear target tables first.`
    );
  }
};

const truncateTarget = async () => {
  for (const [name, , Model] of [...MODELS].reverse()) {
    await Model.__truncate();
    console.log(`Cleared PostgreSQL ${name}`);
  }
};

const migrate = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) throw new Error('Set MONGODB_URI to the source MongoDB database.');

  await connectDB();
  await assertTargetIsSafe();
  if (resetTarget) await truncateTarget();

  const mongo = new MongoClient(mongoUri, {
    appName: 'suraj-prime-tally-postgres-migration',
  });

  await mongo.connect();
  const mongoDb = mongo.db();

  try {
    for (const [name, collectionName, Model] of MODELS) {
      const docs = await mongoDb.collection(collectionName).find({}).toArray();
      if (!docs.length) {
        console.log(`${name}: no source documents`);
        continue;
      }

      await Model.__rawUpsertMany(docs.map(normalizeBson));
      console.log(`${name}: migrated ${docs.length}`);
    }
  } finally {
    await mongo.close();
    await closeDB();
  }
};

migrate().catch((error) => {
  console.error(`Migration failed: ${error.message}`);
  process.exit(1);
});
