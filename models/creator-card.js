const { ModelSchema, SchemaTypes, DatabaseModel } = require('@app-core/mongoose');

const modelName = 'creator_cards';

const schemaConfig = {
  _id: { type: SchemaTypes.ULID },
  slug: { type: SchemaTypes.String, required: true, unique: true, index: true },
  title: { type: SchemaTypes.String, required: true },
  description: { type: SchemaTypes.String },
  creator_reference: { type: SchemaTypes.String, required: true },
  links: { type: SchemaTypes.Mixed },
  service_rates: { type: SchemaTypes.Mixed },
  status: { type: SchemaTypes.String, required: true },
  access_type: { type: SchemaTypes.String, default: 'public' },
  access_code: { type: SchemaTypes.String },
  created: { type: SchemaTypes.Number },
  updated: { type: SchemaTypes.Number },
};

const modelSchema = new ModelSchema(schemaConfig, { collection: modelName });

module.exports = DatabaseModel.model(modelName, modelSchema, { paranoid: true });
