require('dotenv').config();

const { MongoClient } = require('mongodb');
const { closeDB, connectDB } = require('../config/db');
const MANIFEST = require('./migrationManifest');

const verify = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) throw new Error('Set MONGODB_URI to the source MongoDB database.');

  const mongo = new MongoClient(mongoUri, {
    appName: 'suraj-prime-tally-postgres-migration-verify',
  });

  await mongo.connect();
  await connectDB();

  const mongoDb = mongo.db();
  const mismatches = [];

  try {
    for (const [name, collectionName, modelPath] of MANIFEST) {
      const Model = require(modelPath);
      const [mongoCount, postgresCount] = await Promise.all([
        mongoDb.collection(collectionName).countDocuments({}),
        Model.countDocuments({}),
      ]);

      if (mongoCount !== postgresCount) {
        mismatches.push({ name, mongoCount, postgresCount });
        console.log(`${name}: MongoDB=${mongoCount} PostgreSQL=${postgresCount} DIFF`);
      } else {
        console.log(`${name}: ${postgresCount} ok`);
      }
    }
  } finally {
    await mongo.close();
    await closeDB();
  }

  if (mismatches.length) {
    throw new Error(`${mismatches.length} collection(s) differ between MongoDB and PostgreSQL.`);
  }

  console.log('PostgreSQL migration verification passed.');
};

verify().catch((error) => {
  console.error(`Migration verification failed: ${error.message}`);
  process.exit(1);
});
