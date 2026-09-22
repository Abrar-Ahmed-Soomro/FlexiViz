import mongoose, { Schema, models, Model } from 'mongoose';

const ChartSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  datasetId: {
    type: Schema.Types.ObjectId,
    ref: 'Dataset',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  config: {
    chartType: { type: String, required: true },
    labelColumn: { type: String, required: true },
    legendColumn: { type: String },
    valueColumn: { type: String, required: true },
    aggregation: { type: String, required: true },
    filters: [{
      column: String,
      operator: String,
      value: String,
      value2: String,
    }],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Chart: Model<Record<string, unknown>> = models.Chart || mongoose.model('Chart', ChartSchema);
export default Chart;
