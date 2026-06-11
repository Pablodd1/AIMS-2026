const mongoose = require('mongoose');
const { Schema } = mongoose;

const FavoriteCodeSchema = new Schema({
  docId: {
    type: String,
    required: true,
  },
  codeId: {
    type: Schema.Types.ObjectId,
    ref: 'MedicalCode',
    required: true,
  },
  type: {
    type: String,
    enum: ['icd10', 'cpt'],
    required: true,
  },
}, { timestamps: true });

FavoriteCodeSchema.index({ docId: 1, codeId: 1 }, { unique: true });

module.exports = mongoose.model('FavoriteCode', FavoriteCodeSchema);
