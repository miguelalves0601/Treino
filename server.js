const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*', // set to your GitHub Pages URL in production
}));
app.use(express.json());

// ─── Database ─────────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ─── Init DB tables ───────────────────────────────────────────────────────────
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id          BIGSERIAL PRIMARY KEY,
        day         CHAR(1)      NOT NULL CHECK (day IN ('A','B')),
        date_label  TEXT         NOT NULL,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        done_count  INT          NOT NULL DEFAULT 0,
        total_exs   INT          NOT NULL DEFAULT 0,
        total_sets  INT          NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS session_exercises (
        id          BIGSERIAL PRIMARY KEY,
        session_id  BIGINT       NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        ex_id       TEXT         NOT NULL,
        num         INT          NOT NULL,
        name        TEXT         NOT NULL,
        sets_label  TEXT,
        done        BOOLEAN      NOT NULL DEFAULT FALSE,
        load_kg     TEXT,
        time_val    TEXT,
        sets_done   INT,
        notes       TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_ses_exercises_session ON session_exercises(session_id);
    `);
    console.log('✅ DB ready');
  } finally {
    client.release();
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (_, res) => res.json({ ok: true }));

// GET /sessions — list all sessions (summary only)
app.get('/sessions', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, day, date_label, created_at, done_count, total_exs, total_sets
       FROM sessions
       ORDER BY created_at DESC
       LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// GET /sessions/:id — full session with exercises
app.get('/sessions/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { rows: [session] } = await pool.query(
      `SELECT * FROM sessions WHERE id = $1`, [id]
    );
    if (!session) return res.status(404).json({ error: 'Not found' });

    const { rows: exercises } = await pool.query(
      `SELECT * FROM session_exercises WHERE session_id = $1 ORDER BY num`, [id]
    );

    res.json({ ...session, exercises });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// POST /sessions — save a new session
app.post('/sessions', async (req, res) => {
  const { day, date_label, done_count, total_exs, total_sets, exercises } = req.body;

  if (!day || !['A','B'].includes(day)) {
    return res.status(400).json({ error: 'day must be A or B' });
  }
  if (!Array.isArray(exercises) || exercises.length === 0) {
    return res.status(400).json({ error: 'exercises array required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [session] } = await client.query(
      `INSERT INTO sessions (day, date_label, done_count, total_exs, total_sets)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [day, date_label || '', done_count || 0, total_exs || exercises.length, total_sets || 0]
    );

    for (const ex of exercises) {
      await client.query(
        `INSERT INTO session_exercises
           (session_id, ex_id, num, name, sets_label, done, load_kg, time_val, sets_done, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          session.id,
          ex.id,
          ex.num,
          ex.name,
          ex.sets || '',
          !!ex.done,
          ex.load || null,
          ex.time_val || null,
          ex.sets_done ? parseInt(ex.sets_done) : null,
          ex.notes || null,
        ]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(session);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to save session' });
  } finally {
    client.release();
  }
});

// DELETE /sessions/:id
app.delete('/sessions/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    await pool.query('DELETE FROM sessions WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
initDB()
  .then(() => app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`)))
  .catch(err => { console.error('DB init failed:', err); process.exit(1); });
