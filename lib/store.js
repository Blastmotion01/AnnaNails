/**
 * Хранилище занятых слотов.
 *
 * Где хранится:
 *  - Upstash Redis (бесплатно, подключается в Vercel → Storage). Переменные окружения
 *    KV_REST_API_URL / KV_REST_API_TOKEN (создаются автоматически при подключении)
 *    или UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.
 *  - Если Redis не подключён и сайт запущен локально — в памяти процесса (для проверки).
 *  - Если Redis не подключён на Vercel — учёт броней выключен (сайт работает как раньше).
 *
 * Структура: для каждой даты хеш  busy:ГГГГ-ММ-ДД  →  { "ЧЧ:ММ": JSON-описание брони }.
 * В описании — услуга, имя, телефон, Telegram, аллергия и статус: они нужны мастеру
 * для списка записей в боте. Хеш сам удаляется через 2 дня после даты визита.
 * HSETNX атомарен: если два клиента одновременно бронируют одно время, успеет только один.
 */

const memory = new Map(); // date → Map(time → value)
const onceKeys = new Set();

const key = (date) => `busy:${date}`;
const expireAt = (date) => {
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d + 2) / 1000);
};

function redisConfig(env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.trim().replace(/\/$/, ""), token: token.trim() } : null;
}

function createRedisStore({ url, token }) {
  async function request(path, body) {
    const res = await fetch(url + path, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json) throw new Error(`Redis HTTP ${res.status}`);
    return json;
  }
  const command = async (...args) => {
    const json = await request("", args);
    if (json.error) throw new Error(`Redis: ${json.error}`);
    return json.result;
  };

  return {
    kind: "redis",
    async reserve(date, time, value) {
      const created = await command("HSETNX", key(date), time, value);
      if (created === 1) await command("EXPIREAT", key(date), expireAt(date));
      return created === 1;
    },
    async release(date, time) {
      return (await command("HDEL", key(date), time)) === 1;
    },
    async get(date, time) {
      return command("HGET", key(date), time);
    },
    async update(date, time, value) {
      // Обновляем только существующую бронь (отменённую не воскрешаем)
      if (!(await command("HEXISTS", key(date), time))) return false;
      await command("HSET", key(date), time, value);
      return true;
    },
    /** Все брони на дату: { "ЧЧ:ММ": value } */
    async list(date) {
      const flat = (await command("HGETALL", key(date))) || [];
      const out = {};
      for (let i = 0; i < flat.length; i += 2) out[flat[i]] = flat[i + 1];
      return out;
    },
    /** Брони на несколько дат одним запросом: { "ГГГГ-ММ-ДД": { "ЧЧ:ММ": value } } */
    async listMany(dates) {
      if (!dates.length) return {};
      const results = await request("/pipeline", dates.map((d) => ["HGETALL", key(d)]));
      const out = {};
      dates.forEach((d, i) => {
        const flat = results[i]?.result || [];
        if (!flat.length) return;
        out[d] = {};
        for (let j = 0; j < flat.length; j += 2) out[d][flat[j]] = flat[j + 1];
      });
      return out;
    },
    /** true только при первом вызове с этим ключом (защита от повторной рассылки) */
    async once(name, ttlSeconds) {
      return (await command("SET", `once:${name}`, "1", "NX", "EX", ttlSeconds)) === "OK";
    },
    async busy(dates) {
      if (!dates.length) return {};
      const results = await request("/pipeline", dates.map((d) => ["HKEYS", key(d)]));
      const out = {};
      dates.forEach((d, i) => {
        const times = results[i]?.result;
        if (Array.isArray(times) && times.length) out[d] = times.sort();
      });
      return out;
    },
  };
}

const memoryStore = {
  kind: "memory",
  async reserve(date, time, value) {
    const day = memory.get(date) || new Map();
    if (day.has(time)) return false;
    day.set(time, value);
    memory.set(date, day);
    return true;
  },
  async release(date, time) {
    return memory.get(date)?.delete(time) ?? false;
  },
  async get(date, time) {
    return memory.get(date)?.get(time) ?? null;
  },
  async update(date, time, value) {
    const day = memory.get(date);
    if (!day?.has(time)) return false;
    day.set(time, value);
    return true;
  },
  async list(date) {
    return Object.fromEntries(memory.get(date) || []);
  },
  async listMany(dates) {
    const out = {};
    for (const d of dates) if (memory.get(d)?.size) out[d] = Object.fromEntries(memory.get(d));
    return out;
  },
  async once(name) {
    if (onceKeys.has(name)) return false;
    onceKeys.add(name);
    return true;
  },
  async busy(dates) {
    const out = {};
    for (const d of dates) {
      const times = [...(memory.get(d)?.keys() || [])];
      if (times.length) out[d] = times.sort();
    }
    return out;
  },
};

let warned = false;

/** @returns {null | {kind: string, reserve: Function, release: Function, busy: Function}} */
export function createStore(env) {
  const redis = redisConfig(env);
  if (redis) return createRedisStore(redis);
  if (env.VERCEL) {
    if (!warned) {
      console.warn("[store] База для учёта броней не подключена (Vercel → Storage → Upstash Redis). Время не блокируется.");
      warned = true;
    }
    return null;
  }
  return memoryStore;
}
