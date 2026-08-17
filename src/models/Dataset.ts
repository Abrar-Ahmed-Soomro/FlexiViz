import mongoose, { Schema, models, Model } from 'mongoose';

const DatasetSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  fileName: {
    type: String,
    required: true,
    trim: true,
  },
  sourceType: {
    type: String,
    enum: ['upload', 'link'],
    required: true,
  },
  duckDbTableName: {
    type: String,
    required: true,
    unique: true,
  },
  columns: [{
    name: { type: String, required: true },
    type: { type: String, required: true },
  }],
  rowCount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  publicSlug: {
    type: String,
    unique: true,
    sparse: true,
  },
});

const Dataset: Model<Record<string, unknown>> = models.Dataset || mongoose.model('Dataset', DatasetSchema);
export default Dataset;
