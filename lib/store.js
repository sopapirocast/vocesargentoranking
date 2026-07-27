// Camada de dados: usa Upstash Redis quando as variáveis de ambiente da
// integração existem (produção na Vercel, Marketplace), e cai para um
// arquivo JSON local (data/rankings.json) em desenvolvimento.
//
// A integração "Upstash for Redis" da Vercel Marketplace injeta
// KV_REST_API_URL / KV_REST_API_TOKEN (nomes herdados do antigo Vercel KV).
// Também aceitamos UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN caso
// uma integração diferente use esses nomes.

const fs = require('fs');
const path = require('path');

const HASH_KEY = 'rankings:data';
const ZSET_KEY = 'rankings:index';

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const usingRedis = Boolean(REDIS_URL && REDIS_TOKEN);

const DATA_FILE = path.join(__dirname, '..', 'data', 'rankings.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
  }
}

function readLocal() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8').trim();
  if (!raw) return [];
  return JSON.parse(raw);
}

function writeLocal(list) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf8');
}

let redisClient = null;
function getRedis() {
  if (!redisClient) {
    // Import tardio: só carrega o pacote @upstash/redis quando ele é realmente necessário.
    const { Redis } = require('@upstash/redis');
    redisClient = new Redis({
      url: REDIS_URL,
      token: REDIS_TOKEN,
    });
  }
  return redisClient;
}

async function getAll() {
  if (usingRedis) {
    const redis = getRedis();
    const ids = await redis.zrange(ZSET_KEY, 0, -1, { rev: true });
    if (!ids || ids.length === 0) return [];
    const all = await redis.hgetall(HASH_KEY);
    if (!all) return [];
    return ids
      .map((id) => all[id])
      .filter(Boolean)
      .map((entry) => (typeof entry === 'string' ? JSON.parse(entry) : entry));
  }

  const list = readLocal();
  return list.slice().sort((a, b) => b.acertos - a.acertos || new Date(a.data) - new Date(b.data));
}

async function addEntry(entry) {
  if (usingRedis) {
    const redis = getRedis();
    await redis.hset(HASH_KEY, { [entry.id]: JSON.stringify(entry) });
    await redis.zadd(ZSET_KEY, { score: entry.acertos, member: entry.id });
    return entry;
  }

  const list = readLocal();
  list.push(entry);
  writeLocal(list);
  return entry;
}

async function removeEntry(id) {
  if (usingRedis) {
    const redis = getRedis();
    await redis.hdel(HASH_KEY, id);
    await redis.zrem(ZSET_KEY, id);
    return;
  }

  const list = readLocal();
  writeLocal(list.filter((e) => e.id !== id));
}

module.exports = { getAll, addEntry, removeEntry, usingRedis };
