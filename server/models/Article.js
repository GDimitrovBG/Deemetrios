import mongoose from 'mongoose';

const articleSchema = new mongoose.Schema({
  title_bg:        { type: String, required: true },
  title_en:        { type: String, default: '' },
  excerpt_bg:      { type: String, default: '' },
  excerpt_en:      { type: String, default: '' },
  content:         { type: String, default: '' },
  img:             { type: String, default: '' },
  date:            { type: String, default: '' },
  category:        { type: String, default: 'Блог' },
  visible:         { type: Boolean, default: true },
  relatedRefs:     [String],
  seo_title:       { type: String, default: '' },
  seo_description: { type: String, default: '' },
  author:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('Article', articleSchema);
