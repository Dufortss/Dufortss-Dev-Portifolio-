const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'dufort_blog';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!MONGODB_URI || !ADMIN_TOKEN) {
  console.error('Defina MONGODB_URI e ADMIN_TOKEN no .env');
  process.exit(1);
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true }));
app.use(express.json({ limit: '20kb' }));
app.use(express.static(__dirname));

const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos.' }
});

function cleanText(value, max) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}

function cleanImageUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.toString().slice(0, 500);
  } catch {
    return '';
  }
}

function isAdmin(req) {
  return req.get('Authorization') === `Bearer ${ADMIN_TOKEN}`;
}

let comments;
const client = new MongoClient(MONGODB_URI);

app.get('/api/comments', async (_req, res) => {
  const docs = await comments.find({ deleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  res.json(docs.map(({ _id, name, idea, imageUrl, createdAt, reply }) => ({
    id: _id.toString(), name, idea, imageUrl, createdAt, reply: reply || null
  })));
});

app.post('/api/comments', commentLimiter, async (req, res) => {
  const name = cleanText(req.body.name, 40);
  const idea = cleanText(req.body.idea, 800);
  const imageUrl = cleanImageUrl(req.body.imageUrl);

  if (name.length < 2 || idea.length < 5) {
    return res.status(400).json({ error: 'Nome e ideia são obrigatórios.' });
  }

  const doc = {
    name,
    idea,
    imageUrl,
    createdAt: new Date(),
    reply: null,
    deleted: false
  };

  const result = await comments.insertOne(doc);
  res.status(201).json({
    id: result.insertedId.toString(),
    name: doc.name,
    idea: doc.idea,
    imageUrl: doc.imageUrl,
    createdAt: doc.createdAt,
    reply: null
  });
});

app.delete('/api/comments/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Não autorizado.' });
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido.' });
  await comments.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { deleted: true, deletedAt: new Date() } });
  res.json({ ok: true });
});

app.post('/api/comments/:id/reply', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Não autorizado.' });
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'ID inválido.' });
  const reply = cleanText(req.body.reply, 800);
  if (!reply) return res.status(400).json({ error: 'Resposta vazia.' });
  await comments.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { reply, repliedAt: new Date() } });
  res.json({ ok: true });
});

async function start() {
  await client.connect();
  comments = client.db(DB_NAME).collection('comments');
  await comments.createIndex({ createdAt: -1 });
  app.listen(PORT, () => console.log(`Dufort Blog: http://localhost:${PORT}`));
}

start().catch(err => { console.error(err); process.exit(1); });
