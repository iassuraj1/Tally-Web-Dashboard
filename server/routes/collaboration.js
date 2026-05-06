const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const router = express.Router({ mergeParams: true });
const Attachment = require('../models/Attachment');
const Comment = require('../models/Comment');
const Ledger = require('../models/Ledger');
const Voucher = require('../models/Voucher');
const { protect, companyAccess } = require('../middleware/auth');

router.use(protect, companyAccess);

const models = { Voucher, Ledger };
const uploadRoot = path.resolve(__dirname, '..', 'uploads');

const sanitize = (value) => String(value || 'file').replace(/[^a-z0-9._-]/gi, '_').slice(0, 120);

const getEntity = async (req) => {
  const Model = models[req.params.entityType];
  if (!Model) return null;
  return Model.findOne({ _id: req.params.entityId, company: req.params.companyId }).select('_id');
};

router.get('/:entityType/:entityId', async (req, res) => {
  try {
    const entity = await getEntity(req);
    if (!entity) return res.status(404).json({ success: false, message: 'Entity not found' });

    const filter = {
      company: req.params.companyId,
      entityType: req.params.entityType,
      entity: req.params.entityId,
    };
    const [comments, attachments] = await Promise.all([
      Comment.find(filter).populate('createdBy', 'name email').sort({ createdAt: -1 }).limit(100),
      Attachment.find(filter).populate('uploadedBy', 'name email').sort({ createdAt: -1 }).limit(100),
    ]);
    res.json({ success: true, data: { comments, attachments } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:entityType/:entityId/comments', async (req, res) => {
  try {
    const entity = await getEntity(req);
    if (!entity) return res.status(404).json({ success: false, message: 'Entity not found' });
    if (!String(req.body.body || '').trim()) return res.status(400).json({ success: false, message: 'Comment is required' });

    const comment = await Comment.create({
      company: req.params.companyId,
      entityType: req.params.entityType,
      entity: req.params.entityId,
      body: req.body.body,
      createdBy: req.user._id,
    });
    await comment.populate('createdBy', 'name email');
    res.status(201).json({ success: true, data: comment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:entityType/:entityId/attachments', async (req, res) => {
  try {
    const entity = await getEntity(req);
    if (!entity) return res.status(404).json({ success: false, message: 'Entity not found' });

    const originalName = sanitize(req.body.fileName || req.body.originalName);
    if (!originalName) return res.status(400).json({ success: false, message: 'File name is required' });

    let filePath = '';
    let storage = 'url';
    let size = Number(req.body.size || 0);
    const url = String(req.body.url || '').trim();
    const encoded = String(req.body.fileData || '').replace(/^data:.*;base64,/, '');

    if (encoded) {
      const buffer = Buffer.from(encoded, 'base64');
      size = buffer.length;
      const companyDir = path.join(uploadRoot, sanitize(req.params.companyId));
      await fs.mkdir(companyDir, { recursive: true });
      const filename = `${Date.now()}_${originalName}`;
      filePath = path.join(companyDir, filename);
      await fs.writeFile(filePath, buffer);
      storage = 'local';
    } else if (!url) {
      return res.status(400).json({ success: false, message: 'Attachment file or URL is required' });
    }

    const attachment = await Attachment.create({
      company: req.params.companyId,
      entityType: req.params.entityType,
      entity: req.params.entityId,
      originalName,
      mimeType: req.body.mimeType,
      size,
      storage,
      path: filePath,
      url,
      note: req.body.note,
      uploadedBy: req.user._id,
    });
    await attachment.populate('uploadedBy', 'name email');
    res.status(201).json({ success: true, data: attachment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/attachments/:id/download', async (req, res) => {
  try {
    const attachment = await Attachment.findOne({ _id: req.params.id, company: req.params.companyId });
    if (!attachment) return res.status(404).json({ success: false, message: 'Attachment not found' });
    if (attachment.storage === 'url') return res.redirect(attachment.url);
    return res.download(attachment.path, attachment.originalName);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/attachments/:id', async (req, res) => {
  try {
    const attachment = await Attachment.findOne({ _id: req.params.id, company: req.params.companyId });
    if (!attachment) return res.status(404).json({ success: false, message: 'Attachment not found' });
    if (attachment.storage === 'local' && attachment.path) {
      await fs.unlink(attachment.path).catch(() => {});
    }
    await attachment.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
