const crypto = require('crypto');
const { query, withTransaction } = require('../config/db');

const MODEL_REGISTRY = new Map();
const TABLE_READY = new Map();

class ObjectIdValue {
  constructor(value) {
    this.value = value ? String(value) : generateObjectId();
  }

  toString() {
    return this.value;
  }

  toJSON() {
    return this.value;
  }

  valueOf() {
    return this.value;
  }

  equals(other) {
    return String(this.value) === String(unwrapComparable(other));
  }
}

const ObjectIdType = function ObjectId(value) {
  return new ObjectIdValue(value);
};

ObjectIdType.isValid = (value) => /^[a-f\d]{24}$/i.test(String(unwrapComparable(value) || ''));

class Schema {
  constructor(definition = {}, options = {}) {
    this.definition = definition;
    this.options = options;
    this.indexes = [];
    this.pres = {};
    this.methods = {};
    this.paths = {};
    this.refs = {};
    this.arrayPaths = new Set();
    collectPaths(this, definition);
  }

  index(fields, options = {}) {
    this.indexes.push({ fields, options });
  }

  pre(event, fn) {
    if (!this.pres[event]) this.pres[event] = [];
    this.pres[event].push(fn);
  }
}

Schema.Types = {
  Mixed: Symbol('Mixed'),
  ObjectId: ObjectIdType,
};

const Types = { ObjectId: ObjectIdType };

class ValidationError extends Error {
  constructor(errors) {
    super(Object.values(errors).map((error) => error.message).join(' '));
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

class Document {
  constructor(modelDef, data = {}, options = {}) {
    Object.defineProperty(this, '$__modelDef', { enumerable: false, value: modelDef });
    Object.defineProperty(this, '$__isNew', { enumerable: false, writable: true, value: Boolean(options.isNew) });
    Object.defineProperty(this, '$__validationErrors', { enumerable: false, writable: true, value: {} });
    Object.defineProperty(this, '$__original', {
      enumerable: false,
      writable: true,
      value: deepClone(serializeForStorage(data)),
    });

    const hydrated = hydrateValue(data, modelDef.schema, '');
    Object.assign(this, hydrated);
    applyTopLevelArrayDefaults(modelDef.schema, this);

    if (!this._id) this._id = new ObjectIdValue();

    Object.entries(modelDef.schema.methods || {}).forEach(([name, method]) => {
      Object.defineProperty(this, name, {
        enumerable: false,
        value: method.bind(this),
      });
    });
  }

  equals(other) {
    return String(this._id) === String(unwrapComparable(other));
  }

  invalidate(path, message) {
    this.$__validationErrors[path] = { path, message };
  }

  isModified(path) {
    if (this.$__isNew) return true;
    return JSON.stringify(serializeForStorage(getPath(this, path))) !==
      JSON.stringify(getPath(this.$__original, path));
  }

  toObject() {
    return clonePlain(this);
  }

  toJSON() {
    return this.toObject();
  }

  async populate(path, select) {
    const populates = normalizePopulateArgs(path, select);
    for (const populateSpec of populates) {
      await populateDocuments(this.$__modelDef, [this], populateSpec);
    }
    return this;
  }

  async save() {
    await runHooks(this.$__modelDef.schema, 'validate', this);
    validateDocument(this.$__modelDef.schema, this);
    await runHooks(this.$__modelDef.schema, 'save', this);

    applyDefaultsAndTransforms(this.$__modelDef.schema, this, { includeNested: true });
    await this.$__modelDef.saveDocument(this);
    this.$__isNew = false;
    this.$__original = deepClone(serializeForStorage(this.toObject()));
    return this;
  }

  async deleteOne() {
    const result = await this.$__modelDef.deleteOne({ _id: this._id });
    return result;
  }
}

class Query {
  constructor(modelDef, operation, payload = {}) {
    this.modelDef = modelDef;
    this.operation = operation;
    this.payload = payload;
    this.populateSpecs = [];
    this.sortSpec = undefined;
    this.limitValue = undefined;
    this.skipValue = 0;
    this.selectSpec = undefined;
    this.leanMode = false;
    this.executed = false;
  }

  populate(path, select) {
    this.populateSpecs.push(...normalizePopulateArgs(path, select));
    return this;
  }

  sort(spec) {
    this.sortSpec = spec;
    return this;
  }

  limit(value) {
    this.limitValue = Number(value);
    return this;
  }

  skip(value) {
    this.skipValue = Number(value) || 0;
    return this;
  }

  select(spec) {
    this.selectSpec = spec;
    return this;
  }

  lean() {
    this.leanMode = true;
    return this;
  }

  async exec() {
    if (this.executed) throw new Error('Query was already executed');
    this.executed = true;

    let result;
    if (this.operation === 'find') {
      result = await this.modelDef.findMany(this.payload.filter || {});
      result = applySort(result, this.sortSpec);
      if (this.skipValue) result = result.slice(this.skipValue);
      if (Number.isFinite(this.limitValue)) result = result.slice(0, this.limitValue);
    } else if (this.operation === 'findOne') {
      const rows = await this.modelDef.findMany(this.payload.filter || {});
      result = rows[0] || null;
    } else if (this.operation === 'findOneAndUpdate') {
      result = await this.modelDef.findOneAndUpdate(
        this.payload.filter || {},
        this.payload.update || {},
        this.payload.options || {}
      );
    } else if (this.operation === 'findOneAndDelete') {
      result = await this.modelDef.findOneAndDelete(this.payload.filter || {});
    } else {
      throw new Error(`Unsupported query operation: ${this.operation}`);
    }

    const docs = Array.isArray(result) ? result : (result ? [result] : []);
    for (const populateSpec of this.populateSpecs) {
      await populateDocuments(this.modelDef, docs, populateSpec);
    }

    const projected = applyProjectionToResult(result, this.selectSpec);
    return this.leanMode ? toLean(projected) : projected;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }

  finally(callback) {
    return this.exec().finally(callback);
  }
}

const model = (name, schema) => {
  if (!schema) {
    const existing = MODEL_REGISTRY.get(name);
    if (!existing) throw new Error(`Model "${name}" has not been registered`);
    return existing.Model;
  }

  if (MODEL_REGISTRY.has(name)) return MODEL_REGISTRY.get(name).Model;

  const modelDef = createModelDef(name, schema);

  function Model(data) {
    return new Document(modelDef, data, { isNew: true });
  }

  Model.modelName = name;
  Model.collection = { name: modelDef.tableName };
  Model.schema = schema;

  Model.create = async (data) => {
    if (Array.isArray(data)) return Promise.all(data.map((item) => Model.create(item)));
    const doc = new Document(modelDef, data, { isNew: true });
    applyDefaultsAndTransforms(schema, doc, { includeNested: true });
    await doc.save();
    return doc;
  };

  Model.insertMany = async (items = []) => Promise.all(items.map((item) => Model.create(item)));
  Model.find = (filter = {}) => new Query(modelDef, 'find', { filter });
  Model.findOne = (filter = {}) => new Query(modelDef, 'findOne', { filter });
  Model.findById = (id) => Model.findOne({ _id: id });
  Model.findOneAndUpdate = (filter, update, options = {}) =>
    new Query(modelDef, 'findOneAndUpdate', { filter, update, options });
  Model.findByIdAndUpdate = (id, update, options = {}) =>
    Model.findOneAndUpdate({ _id: id }, update, options);
  Model.findOneAndDelete = (filter) => new Query(modelDef, 'findOneAndDelete', { filter });
  Model.deleteOne = (filter) => modelDef.deleteOne(filter);
  Model.deleteMany = (filter = {}) => modelDef.deleteMany(filter);
  Model.updateOne = (filter, update, options = {}) => modelDef.updateOne(filter, update, options);
  Model.updateMany = (filter, update, options = {}) => modelDef.updateMany(filter, update, options);
  Model.countDocuments = (filter = {}) => modelDef.countDocuments(filter);
  Model.exists = async (filter = {}) => {
    const doc = await modelDef.findOne(filter);
    return doc ? { _id: doc._id } : null;
  };
  Model.__rawUpsertMany = (items = []) => modelDef.rawUpsertMany(items);
  Model.__truncate = () => modelDef.truncate();

  MODEL_REGISTRY.set(name, { Model, modelDef });
  return Model;
};

const createModelDef = (name, schema) => {
  const tableName = tableNameForModel(name);

  const modelDef = {
    name,
    schema,
    tableName,
    uniqueIndexes: new Map(),

    ensureReady: async () => {
      if (!TABLE_READY.has(name)) {
        TABLE_READY.set(name, ensureTable(modelDef));
      }
      return TABLE_READY.get(name);
    },

    hydrate: (row) => new Document(modelDef, row.data, { isNew: false }),

    findMany: async (filter = {}, options = {}) => {
      await modelDef.ensureReady();
      const lockSql = options.forUpdate ? ' FOR UPDATE' : '';
      const prefilter = sqlPrefilter(filter);
      const result = await query(
        `SELECT data FROM ${quoteIdent(tableName)}${prefilter.where} ORDER BY created_at ASC${lockSql}`,
        prefilter.params
      );
      return result.rows
        .map((row) => modelDef.hydrate(row))
        .filter((doc) => matchesFilter(doc, filter));
    },

    findOne: async (filter = {}, options = {}) => {
      const rows = await modelDef.findMany(filter, options);
      return rows[0] || null;
    },

    saveDocument: async (doc) => {
      await modelDef.ensureReady();
      const now = new Date();
      const plain = doc.toObject();
      applyTimestamps(schema, plain, doc.$__isNew, now);
      const serialized = serializeForStorage(plain);
      const id = String(serialized._id || generateObjectId());
      serialized._id = id;

      try {
        const result = await query(
          `INSERT INTO ${quoteIdent(tableName)} (id, data, created_at, updated_at)
           VALUES ($1, $2::jsonb, $3, $4)
           ON CONFLICT (id) DO UPDATE
           SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
           RETURNING data`,
          [
            id,
            JSON.stringify(serialized),
            timestampOrNow(serialized.createdAt, now),
            timestampOrNow(serialized.updatedAt, now),
          ]
        );
        Object.keys(doc).forEach((key) => delete doc[key]);
        Object.assign(doc, hydrateValue(result.rows[0].data, schema, ''));
      } catch (error) {
        throw translatePgError(error, modelDef);
      }
    },

    findOneAndUpdate: async (filter = {}, update = {}, options = {}) => {
      await modelDef.ensureReady();
      return withTransaction(async () => {
        if (options.upsert) {
          await query(`LOCK TABLE ${quoteIdent(tableName)} IN EXCLUSIVE MODE`);
        }
        const existing = await modelDef.findOne(filter, { forUpdate: true });
        if (!existing && !options.upsert) return null;

        const before = existing ? existing.toObject() : upsertBaseFromFilter(filter);
        const next = mergeUpdate(before, update);
        applyDefaultsAndTransforms(schema, next, {
          includeNested: true,
          setDefaultsOnly: !existing && options.setDefaultsOnInsert,
        });
        const doc = new Document(modelDef, next, { isNew: !existing });
        await doc.save();
        return options.new === false ? (existing || null) : doc;
      });
    },

    findOneAndDelete: async (filter = {}) => {
      await modelDef.ensureReady();
      return withTransaction(async () => {
        const doc = await modelDef.findOne(filter, { forUpdate: true });
        if (!doc) return null;
        await modelDef.deleteOne({ _id: doc._id });
        return doc;
      });
    },

    deleteOne: async (filter = {}) => {
      await modelDef.ensureReady();
      const doc = await modelDef.findOne(filter);
      if (!doc) return { acknowledged: true, deletedCount: 0 };
      await query(`DELETE FROM ${quoteIdent(tableName)} WHERE id = $1`, [String(doc._id)]);
      return { acknowledged: true, deletedCount: 1 };
    },

    deleteMany: async (filter = {}) => {
      await modelDef.ensureReady();
      const docs = await modelDef.findMany(filter);
      for (const doc of docs) {
        await query(`DELETE FROM ${quoteIdent(tableName)} WHERE id = $1`, [String(doc._id)]);
      }
      return { acknowledged: true, deletedCount: docs.length };
    },

    updateOne: async (filter = {}, update = {}, options = {}) => {
      const doc = await modelDef.findOneAndUpdate(filter, update, { ...options, new: true });
      return { acknowledged: true, matchedCount: doc ? 1 : 0, modifiedCount: doc ? 1 : 0 };
    },

    updateMany: async (filter = {}, update = {}) => {
      await modelDef.ensureReady();
      return withTransaction(async () => {
        const docs = await modelDef.findMany(filter, { forUpdate: true });
        for (const doc of docs) {
          const next = mergeUpdate(doc.toObject(), update);
          Object.keys(doc).forEach((key) => delete doc[key]);
          Object.assign(doc, hydrateValue(next, schema, ''));
          await doc.save();
        }
        return { acknowledged: true, matchedCount: docs.length, modifiedCount: docs.length };
      });
    },

    countDocuments: async (filter = {}) => {
      const docs = await modelDef.findMany(filter);
      return docs.length;
    },

    rawUpsertMany: async (items = []) => {
      await modelDef.ensureReady();
      return withTransaction(async () => {
        for (const item of items) {
          const serialized = serializeForStorage(item);
          const id = String(serialized._id || generateObjectId());
          serialized._id = id;
          await query(
            `INSERT INTO ${quoteIdent(tableName)} (id, data, created_at, updated_at)
             VALUES ($1, $2::jsonb, $3, $4)
             ON CONFLICT (id) DO UPDATE
             SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
            [
              id,
              JSON.stringify(serialized),
              timestampOrNow(serialized.createdAt, new Date()),
              timestampOrNow(serialized.updatedAt, serialized.createdAt || new Date()),
            ]
          );
        }
      });
    },

    truncate: async () => {
      await modelDef.ensureReady();
      await query(`TRUNCATE TABLE ${quoteIdent(tableName)}`);
    },
  };

  return modelDef;
};

const ensureTable = async (modelDef) => {
  const table = quoteIdent(modelDef.tableName);
  await query(`
    CREATE TABLE IF NOT EXISTS ${table} (
      id text PRIMARY KEY,
      data jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS ${quoteIdent(`${modelDef.tableName}_data_gin_idx`)} ON ${table} USING GIN (data jsonb_path_ops)`);
  await query(`CREATE INDEX IF NOT EXISTS ${quoteIdent(`${modelDef.tableName}_created_at_idx`)} ON ${table} (created_at DESC)`);

  const indexDefinitions = [
    ...uniquePathIndexes(modelDef.schema),
    ...modelDef.schema.indexes,
  ];

  for (const item of indexDefinitions) {
    const fields = item.fields || {};
    const options = item.options || {};
    const paths = Object.keys(fields);
    if (!paths.length || paths.some((path) => path.includes('.'))) continue;

    const name = indexName(modelDef.tableName, paths, options);
    const expressions = paths.map((path) => pathExpression(path)).join(', ');
    const unique = options.unique ? 'UNIQUE ' : '';
    const where = partialWhere(paths, options);

    if (options.unique) {
      modelDef.uniqueIndexes.set(name, paths);
    }

    await query(`CREATE ${unique}INDEX IF NOT EXISTS ${quoteIdent(name)} ON ${table} (${expressions})${where}`);
  }
};

const uniquePathIndexes = (schema) => Object.entries(schema.paths)
  .filter(([, meta]) => meta.config?.unique)
  .map(([path, meta]) => ({
    fields: { [path]: 1 },
    options: { unique: true, sparse: Boolean(meta.config?.sparse) },
  }));

const pathExpression = (path) => `(data #>> '{${path.split('.').join(',')}}')`;

const partialWhere = (paths, options) => {
  const clauses = [];
  if (options.sparse) {
    paths.forEach((path) => clauses.push(`${pathExpression(path)} IS NOT NULL AND ${pathExpression(path)} <> ''`));
  }
  if (options.partialFilterExpression) {
    Object.entries(options.partialFilterExpression).forEach(([path, value]) => {
      if (typeof value === 'boolean') clauses.push(`${pathExpression(path)} = '${value}'`);
      else clauses.push(`${pathExpression(path)} = '${escapeSqlLiteral(String(value))}'`);
    });
  }
  return clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
};

const sqlPrefilter = (filter = {}) => {
  if (filter._id !== undefined && !isOperatorObject(filter._id)) {
    return { where: ' WHERE id = $1', params: [String(unwrapComparable(filter._id))] };
  }
  if (filter.company !== undefined && !isOperatorObject(filter.company)) {
    return {
      where: ' WHERE data @> $1::jsonb',
      params: [JSON.stringify({ company: String(unwrapComparable(filter.company)) })],
    };
  }
  return { where: '', params: [] };
};

const indexName = (table, paths, options) => {
  const hash = crypto
    .createHash('sha1')
    .update(JSON.stringify({ paths, unique: options.unique, sparse: options.sparse, partial: options.partialFilterExpression }))
    .digest('hex')
    .slice(0, 10);
  return `${table}_${paths.join('_')}_${options.unique ? 'uniq' : 'idx'}_${hash}`.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 60);
};

const tableNameForModel = (name) => {
  const snake = name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
  if (snake.endsWith('y')) return `${snake.slice(0, -1)}ies`;
  if (snake.endsWith('s')) return snake;
  return `${snake}s`;
};

const collectPaths = (schema, definition, prefix = '') => {
  Object.entries(definition || {}).forEach(([key, raw]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    collectPath(schema, path, raw);
  });
};

const collectPath = (schema, path, raw) => {
  if (raw instanceof Schema) {
    mergeSubSchema(schema, path, raw);
    return;
  }

  if (Array.isArray(raw)) {
    schema.arrayPaths.add(path);
    const item = raw[0];
    if (item instanceof Schema) {
      mergeSubSchema(schema, path, item);
    } else if (isFieldConfig(item)) {
      schema.paths[path] = { config: item, array: true };
      if (item.ref) schema.refs[path] = item.ref;
    } else if (isPlainObject(item)) {
      collectPaths(schema, item, path);
    } else {
      schema.paths[path] = { config: { type: [item] }, array: true };
    }
    return;
  }

  if (isFieldConfig(raw)) {
    schema.paths[path] = { config: raw, array: Array.isArray(raw.type) };
    if (Array.isArray(raw.type)) schema.arrayPaths.add(path);
    if (raw.ref) schema.refs[path] = raw.ref;
    return;
  }

  if (isPlainObject(raw)) {
    collectPaths(schema, raw, path);
  }
};

const mergeSubSchema = (schema, path, subSchema) => {
  schema.arrayPaths.add(path);
  Object.entries(subSchema.paths).forEach(([subPath, meta]) => {
    const full = `${path}.${subPath}`;
    schema.paths[full] = meta;
    if (subSchema.refs[subPath]) schema.refs[full] = subSchema.refs[subPath];
  });
  subSchema.arrayPaths.forEach((subPath) => schema.arrayPaths.add(`${path}.${subPath}`));
};

const isFieldConfig = (value) => (
  isPlainObject(value) &&
  (
    Object.prototype.hasOwnProperty.call(value, 'type') ||
    Object.prototype.hasOwnProperty.call(value, 'required') ||
    Object.prototype.hasOwnProperty.call(value, 'default') ||
    Object.prototype.hasOwnProperty.call(value, 'enum') ||
    Object.prototype.hasOwnProperty.call(value, 'ref') ||
    Object.prototype.hasOwnProperty.call(value, 'unique')
  )
);

const applyDefaultsAndTransforms = (schema, target, options = {}) => {
  applyTopLevelArrayDefaults(schema, target);

  Object.entries(schema.paths).forEach(([path, meta]) => {
    const config = meta.config || {};
    const arrayParent = nestedArrayParent(schema, path);

    if (arrayParent) {
      const rows = getPath(target, arrayParent);
      if (!Array.isArray(rows)) return;
      const childPath = path.slice(arrayParent.length + 1);
      rows.forEach((row) => {
        if (!row || typeof row !== 'object') return;
        let itemValue = getPath(row, childPath);

        if (itemValue === undefined && Object.prototype.hasOwnProperty.call(config, 'default')) {
          itemValue = defaultValue(config.default, config.type);
          setPath(row, childPath, itemValue);
        }

        if (itemValue === undefined || itemValue === null) return;

        if (Array.isArray(itemValue)) {
          setPath(row, childPath, itemValue.map((item) => transformValue(item, config)));
        } else {
          setPath(row, childPath, transformValue(itemValue, config));
        }
      });
      return;
    }

    let value = getPath(target, path);

    if (value === undefined && Object.prototype.hasOwnProperty.call(config, 'default')) {
      value = defaultValue(config.default, config.type);
      setPath(target, path, value);
    }

    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      setPath(target, path, value.map((item) => transformValue(item, config)));
    } else {
      setPath(target, path, transformValue(value, config));
    }
  });

  if (options.includeNested) {
    applyNestedObjectHelpers(target);
  }
};

const applyTopLevelArrayDefaults = (schema, target) => {
  schema.arrayPaths.forEach((path) => {
    if (path.includes('.')) return;
    const value = getPath(target, path);
    if (!Array.isArray(value)) setPath(target, path, []);
  });
};

const nestedArrayParent = (schema, path) => [...schema.arrayPaths]
  .filter((arrayPath) => !arrayPath.includes('.') && path.startsWith(`${arrayPath}.`))
  .sort((a, b) => b.length - a.length)[0];

const transformValue = (value, config) => {
  if (typeof value === 'string') {
    let next = value;
    if (config.trim) next = next.trim();
    if (config.lowercase) next = next.toLowerCase();
    if (config.uppercase) next = next.toUpperCase();
    return next;
  }
  if (isObjectIdConfig(config) && value !== undefined && value !== null && !(value instanceof ObjectIdValue)) {
    return new ObjectIdValue(value);
  }
  return value;
};

const defaultValue = (value, type) => {
  const result = typeof value === 'function' ? value() : deepClone(value);
  if (type === Date && typeof result === 'number') return new Date(result);
  return result;
};

const validateDocument = (schema, doc) => {
  const errors = { ...doc.$__validationErrors };

  Object.entries(schema.paths).forEach(([path, meta]) => {
    const config = meta.config || {};
    const values = getValuesByPath(doc, path);
    const hasValue = values.some((value) => value !== undefined && value !== null && value !== '');

    if (config.required && !hasValue && !hasEmptyArrayParent(schema, doc, path)) {
      errors[path] = { path, message: `${path} is required` };
    }

    values.forEach((value) => {
      if (value === undefined || value === null || value === '') return;
      if (config.enum && !config.enum.includes(String(value))) {
        errors[path] = { path, message: `${path} must be one of ${config.enum.join(', ')}` };
      }
      if (config.min !== undefined && Number(value) < Number(config.min)) {
        errors[path] = { path, message: `${path} must be at least ${config.min}` };
      }
      if (config.minlength !== undefined && String(value).length < Number(config.minlength)) {
        errors[path] = { path, message: `${path} must be at least ${config.minlength} characters` };
      }
    });
  });

  if (Object.keys(errors).length) throw new ValidationError(errors);
};

const runHooks = async (schema, event, doc) => {
  doc.$__validationErrors = {};
  const hooks = schema.pres[event] || [];
  for (const hook of hooks) {
    if (hook.length > 0) {
      await new Promise((resolve, reject) => {
        hook.call(doc, (error) => (error ? reject(error) : resolve()));
      });
    } else {
      await hook.call(doc);
    }
  }
  if (Object.keys(doc.$__validationErrors).length) {
    throw new ValidationError(doc.$__validationErrors);
  }
};

const matchesFilter = (doc, filter = {}) => {
  if (!filter || !Object.keys(filter).length) return true;

  return Object.entries(filter).every(([key, condition]) => {
    if (key === '$or') return condition.some((item) => matchesFilter(doc, item));
    if (key === '$and') return condition.every((item) => matchesFilter(doc, item));

    if (isPlainObject(condition) && Object.prototype.hasOwnProperty.call(condition, '$elemMatch')) {
      const values = getPath(doc, key);
      return Array.isArray(values) && values.some((item) => matchesFilter(item, condition.$elemMatch));
    }

    const values = getValuesByPath(doc, key);
    return matchesCondition(values, condition);
  });
};

const matchesCondition = (values, condition) => {
  if (isOperatorObject(condition)) {
    return Object.entries(condition).every(([operator, expected]) => {
      if (operator === '$exists') {
        const exists = values.some((value) => value !== undefined);
        return Boolean(expected) ? exists : !exists;
      }
      if (operator === '$in') {
        return values.some((value) => expected.some((item) => equalsValue(value, item)));
      }
      if (operator === '$ne') {
        return values.every((value) => !equalsValue(value, expected));
      }
      if (operator === '$gte') {
        return values.some((value) => compareValues(value, expected) >= 0);
      }
      if (operator === '$lte') {
        return values.some((value) => compareValues(value, expected) <= 0);
      }
      if (operator === '$gt') {
        return values.some((value) => compareValues(value, expected) > 0);
      }
      if (operator === '$lt') {
        return values.some((value) => compareValues(value, expected) < 0);
      }
      if (operator === '$regex') {
        const flags = condition.$options || '';
        const regex = new RegExp(expected, flags);
        return values.some((value) => regex.test(String(value || '')));
      }
      if (operator === '$options') return true;
      return false;
    });
  }

  return values.some((value) => equalsValue(value, condition));
};

const isOperatorObject = (value) => (
  isPlainObject(value) &&
  Object.keys(value).some((key) => key.startsWith('$'))
);

const mergeUpdate = (source, update = {}) => {
  const next = deepClone(source || {});
  const operatorKeys = Object.keys(update).filter((key) => key.startsWith('$'));

  if (!operatorKeys.length) {
    Object.assign(next, deepClone(update));
    return next;
  }

  Object.entries(update).forEach(([key, value]) => {
    if (!key.startsWith('$')) setPath(next, key, deepClone(value));
  });

  if (update.$set) {
    Object.entries(update.$set).forEach(([path, value]) => setPath(next, path, deepClone(value)));
  }
  if (update.$inc) {
    Object.entries(update.$inc).forEach(([path, value]) => setPath(next, path, Number(getPath(next, path) || 0) + Number(value)));
  }
  if (update.$unset) {
    Object.keys(update.$unset).forEach((path) => unsetPath(next, path));
  }
  if (update.$addToSet) {
    Object.entries(update.$addToSet).forEach(([path, value]) => {
      const current = getPath(next, path);
      const array = Array.isArray(current) ? current : [];
      const values = value && value.$each ? value.$each : [value];
      values.forEach((item) => {
        if (!array.some((existing) => equalsValue(existing, item))) array.push(deepClone(item));
      });
      setPath(next, path, array);
    });
  }
  if (update.$pull) {
    Object.entries(update.$pull).forEach(([path, value]) => {
      const current = getPath(next, path);
      if (!Array.isArray(current)) return;
      setPath(next, path, current.filter((item) => !equalsValue(item, value)));
    });
  }
  return next;
};

const upsertBaseFromFilter = (filter = {}) => {
  const base = {};
  Object.entries(filter).forEach(([key, value]) => {
    if (key.startsWith('$')) return;
    if (isOperatorObject(value)) return;
    setPath(base, key, deepClone(value));
  });
  return base;
};

const applySort = (docs, spec) => {
  if (!spec) return docs;
  const entries = typeof spec === 'string'
    ? spec.split(/\s+/).filter(Boolean).map((field) => [field.replace(/^-/, ''), field.startsWith('-') ? -1 : 1])
    : Object.entries(spec);

  return [...docs].sort((a, b) => {
    for (const [field, direction] of entries) {
      const result = compareValues(firstValue(getValuesByPath(a, field)), firstValue(getValuesByPath(b, field)));
      if (result !== 0) return Number(direction) < 0 ? -result : result;
    }
    return 0;
  });
};

const normalizePopulateArgs = (path, select) => {
  if (!path) return [];
  if (Array.isArray(path)) return path.flatMap((item) => normalizePopulateArgs(item));
  if (isPlainObject(path)) return [{ ...path }];
  return [{ path, select }];
};

const populateDocuments = async (sourceModelDef, docs, spec) => {
  const refName = sourceModelDef.schema.refs[spec.path];
  if (!refName || !MODEL_REGISTRY.has(refName)) return;
  const target = MODEL_REGISTRY.get(refName).modelDef;
  const ids = uniqueIds(docs.flatMap((doc) => getValuesByPath(doc, spec.path)));
  if (!ids.length) return;

  const targetDocs = await target.findMany({ _id: { $in: ids } });
  const lookup = new Map(targetDocs.map((doc) => [String(doc._id), applyProjectionToDocument(doc, spec.select)]));

  docs.forEach((doc) => {
    setPopulatedPath(doc, spec.path.split('.'), lookup);
  });

  if (spec.populate) {
    const populatedDocs = docs.flatMap((doc) => getValuesByPath(doc, spec.path)).filter(Boolean);
    const targetSpecs = normalizePopulateArgs(spec.populate);
    for (const targetSpec of targetSpecs) {
      await populateDocuments(target, populatedDocs, targetSpec);
    }
  }
};

const setPopulatedPath = (target, parts, lookup) => {
  if (!target || !parts.length) return;
  const [part, ...rest] = parts;

  if (Array.isArray(target)) {
    target.forEach((item) => setPopulatedPath(item, parts, lookup));
    return;
  }

  if (!rest.length) {
    const value = target[part];
    if (Array.isArray(value)) {
      target[part] = value.map((id) => lookup.get(String(id)) || id);
    } else if (value !== undefined && value !== null) {
      target[part] = lookup.get(String(value)) || value;
    }
    return;
  }

  setPopulatedPath(target[part], rest, lookup);
};

const applyProjectionToResult = (result, select) => {
  if (!select) return result;
  if (Array.isArray(result)) return result.map((doc) => applyProjectionToDocument(doc, select));
  return result ? applyProjectionToDocument(result, select) : result;
};

const applyProjectionToDocument = (doc, select) => {
  if (!select) return doc;
  const plain = doc instanceof Document ? doc.toObject() : clonePlain(doc);
  const fields = parseSelect(select);
  if (!fields.length) return doc;

  const isExclusion = fields.every((field) => field.startsWith('-'));
  if (isExclusion) {
    fields.forEach((field) => unsetPath(plain, field.slice(1)));
    return doc instanceof Document ? new Document(doc.$__modelDef, plain, { isNew: false }) : plain;
  }

  const projected = {};
  fields.forEach((field) => {
    if (field.startsWith('-')) return;
    const value = getPath(plain, field);
    if (value !== undefined) setPath(projected, field, value);
  });
  if (!fields.includes('-_id') && plain._id !== undefined) projected._id = plain._id;
  return doc instanceof Document ? new Document(doc.$__modelDef, projected, { isNew: false }) : projected;
};

const parseSelect = (select) => {
  if (Array.isArray(select)) return select;
  if (typeof select === 'string') return select.split(/\s+/).filter(Boolean);
  if (isPlainObject(select)) {
    return Object.entries(select).map(([key, value]) => Number(value) === 0 ? `-${key}` : key);
  }
  return [];
};

const toLean = (result) => {
  if (Array.isArray(result)) return result.map((doc) => clonePlain(doc));
  return result ? clonePlain(result) : result;
};

const hydrateValue = (value, schema, path) => {
  if (value instanceof Document || value instanceof ObjectIdValue) return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((item) => hydrateValue(item, schema, path));
  if (!isPlainObject(value)) {
    const meta = schema?.paths?.[path];
    if (meta && isObjectIdConfig(meta.config) && value !== undefined && value !== null) {
      return new ObjectIdValue(value);
    }
    if (meta && meta.config?.type === Date && value) return new Date(value);
    if (looksLikeObjectId(value)) return new ObjectIdValue(value);
    return value;
  }

  const next = {};
  Object.entries(value).forEach(([key, child]) => {
    const childPath = path ? `${path}.${key}` : key;
    next[key] = hydrateValue(child, schema, childPath);
  });
  applyNestedObjectHelpers(next);
  return next;
};

const applyNestedObjectHelpers = (value) => {
  if (!value || typeof value !== 'object' || value instanceof Date || value instanceof ObjectIdValue) return value;
  if (Array.isArray(value)) {
    value.forEach(applyNestedObjectHelpers);
    return value;
  }
  if (!Object.prototype.hasOwnProperty.call(value, 'toObject')) {
    Object.defineProperty(value, 'toObject', {
      enumerable: false,
      value() {
        return clonePlain(this);
      },
    });
  }
  Object.values(value).forEach(applyNestedObjectHelpers);
  return value;
};

const serializeForStorage = (value) => {
  if (value instanceof ObjectIdValue) return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeForStorage);
  if (!value || typeof value !== 'object') return value;

  const next = {};
  Object.keys(value).forEach((key) => {
    if (key.startsWith('$__')) return;
    if (typeof value[key] === 'function') return;
    next[key] = serializeForStorage(value[key]);
  });
  return next;
};

const clonePlain = (value) => deepClone(serializeForStorage(value));

const deepClone = (value) => {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
};

const applyTimestamps = (schema, plain, isNew, now) => {
  const timestamps = schema.options?.timestamps;
  if (!timestamps) return;

  const createdEnabled = timestamps === true || timestamps.createdAt;
  const updatedEnabled = timestamps === true || timestamps.updatedAt !== false;
  if (createdEnabled && isNew && !plain.createdAt) plain.createdAt = now;
  if (updatedEnabled) plain.updatedAt = now;
};

const timestampOrNow = (value, fallback) => (value ? new Date(value) : fallback);

const getPath = (obj, path) => {
  if (!path) return obj;
  return path.split('.').reduce((current, part) => {
    if (current === undefined || current === null) return undefined;
    return current[part];
  }, obj);
};

const setPath = (obj, path, value) => {
  const parts = path.split('.');
  let current = obj;
  parts.slice(0, -1).forEach((part) => {
    if (!isPlainObject(current[part])) current[part] = {};
    current = current[part];
  });
  current[parts[parts.length - 1]] = value;
};

const unsetPath = (obj, path) => {
  const parts = path.split('.');
  let current = obj;
  parts.slice(0, -1).forEach((part) => {
    if (!current) return;
    current = current[part];
  });
  if (current) delete current[parts[parts.length - 1]];
};

const getValuesByPath = (obj, path) => {
  const parts = path.split('.');
  const walk = (value, remaining) => {
    if (remaining.length === 0) return [value];
    if (value === undefined || value === null) return [];
    if (Array.isArray(value)) return value.flatMap((item) => walk(item, remaining));
    return walk(value[remaining[0]], remaining.slice(1));
  };
  return walk(obj, parts).filter((value) => value !== undefined);
};

const firstValue = (values) => (Array.isArray(values) && values.length ? values[0] : undefined);

const hasEmptyArrayParent = (schema, doc, path) => [...schema.arrayPaths].some((arrayPath) => {
  if (!path.startsWith(`${arrayPath}.`)) return false;
  const value = getPath(doc, arrayPath);
  return !Array.isArray(value) || value.length === 0;
});

const equalsValue = (left, right) => {
  const a = unwrapComparable(left);
  const b = unwrapComparable(right);
  if (Array.isArray(a)) return a.some((item) => equalsValue(item, b));
  if (Array.isArray(b)) return b.some((item) => equalsValue(a, item));
  if (isDateLike(a) || isDateLike(b)) return Number(new Date(a)) === Number(new Date(b));
  return String(a) === String(b);
};

const compareValues = (left, right) => {
  const a = unwrapComparable(left);
  const b = unwrapComparable(right);
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return -1;
  if (b === undefined) return 1;
  if (isDateLike(a) || isDateLike(b)) return Number(new Date(a)) - Number(new Date(b));
  if (typeof a === 'number' || typeof b === 'number') return Number(a) - Number(b);
  return String(a).localeCompare(String(b));
};

const unwrapComparable = (value) => {
  if (value instanceof ObjectIdValue) return value.toString();
  if (value instanceof Document) return String(value._id);
  if (value && typeof value === 'object' && value._id && Object.keys(value).length <= 4) {
    return unwrapComparable(value._id);
  }
  return value;
};

const uniqueIds = (values) => [...new Set(values
  .filter((value) => value !== undefined && value !== null)
  .map((value) => String(unwrapComparable(value))))];

const isDateLike = (value) => (
  value instanceof Date ||
  (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) && !Number.isNaN(Number(new Date(value))))
);

const isObjectIdConfig = (config = {}) => (
  config.type === ObjectIdType ||
  (Array.isArray(config.type) && config.type[0] === ObjectIdType)
);

const looksLikeObjectId = (value) => typeof value === 'string' && ObjectIdType.isValid(value);

const generateObjectId = () => crypto.randomBytes(12).toString('hex');

const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;

const escapeSqlLiteral = (value) => value.replace(/'/g, "''");

const isPlainObject = (value) => (
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  !(value instanceof Date) &&
  !(value instanceof ObjectIdValue)
);

const translatePgError = (error, modelDef) => {
  if (error.code !== '23505') return error;
  const duplicate = new Error('Duplicate key error');
  duplicate.name = 'PostgresDuplicateKeyError';
  duplicate.code = 11000;
  duplicate.pgOriginalCode = error.code;
  duplicate.constraint = error.constraint;
  const paths = modelDef.uniqueIndexes.get(error.constraint) || [];
  duplicate.keyPattern = Object.fromEntries(paths.map((path) => [path, 1]));
  return duplicate;
};

module.exports = {
  Schema,
  Types,
  model,
  withTransaction,
};
