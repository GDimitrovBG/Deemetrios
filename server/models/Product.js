import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  ref:                { type: String, required: true, unique: true },
  name_bg:            { type: String, required: true },
  name_en:            { type: String, default: '' },
  collection:         { type: String, default: 'cosmobella' },
  silhouette:         { type: String, default: '' },
  silhouette_en:      { type: String, default: '' },
  price:              { type: Number, default: 0 },
  img:                { type: String, default: '' },
  imgs:               [String],
  fabric:             { type: String, default: '' },
  badge:              { type: String, default: '' },
  description_bg:     { type: String, default: '' },
  description_en:     { type: String, default: '' },
  seo_title_bg:       { type: String, default: '' },
  seo_description_bg: { type: String, default: '' },
  seo_title_en:       { type: String, default: '' },
  seo_description_en: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
