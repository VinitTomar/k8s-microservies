import 'dotenv/config';

import { trace } from '@opentelemetry/api';
import express, { RequestHandler } from 'express';
import promBundle from 'express-prom-bundle';


import { pool } from 'mysql-conn';
import {Channel, ChannelModel, getChannel } from 'rabbit-mq-conn';

const app = express();
app.use(express.json());

const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  metricsPath: "/metrics",
  httpDurationMetricName: 'todo_apis_http_request_duration_seconds'
}) as unknown as RequestHandler;
app.use(metricsMiddleware);

let channel: Channel | null = null;
let channelModel: ChannelModel | null = null;

async function initRabbitMQ() {
  const conn = await getChannel();
  channel = conn.channel;
  channelModel = conn.channelModel;
}

type TodoQueueMsg = {
  id: number | string;
  title: string;
}

function sendToQueue(action: string, todo:TodoQueueMsg) {
  const tracer = trace.getTracer('todo-api');
  
  tracer.startActiveSpan('sendToQueue', span => {
    span.setAttribute('todo-title', todo.title);
    span.setAttribute('todo-id', todo.id);
    
    try {
      if (!channel) return;

      const queueName = process.env.RABBIT_MQ_NAME!;
      const payload = {
        action,
        todo,
        time: new Date().toISOString(),
      };
      channel.sendToQueue(queueName, Buffer.from(JSON.stringify(payload)), {
        persistent: true,
      });
      console.log(`📩 Sent to queue:`, payload);

    } finally {
      span.end();
    }
  });

}

// --- DB init ---
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT false
    )
  `);
  console.log('✅ Database initialized');
}

// --- Routes ---
app.get('/', (req, res) => {
  res.send('Welcome to Todo APIs with MySQL + K8s + RabbitMQ');
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err });
  }
});

app.get('/todos', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM todos');
  res.json(rows);
});

app.get('/todos/:id', async (req, res) => {
  const [rows]: any = await pool.query('SELECT * FROM todos WHERE id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.post('/todos', async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  const [result]: any = await pool.query(
    'INSERT INTO todos (title, completed) VALUES (?, ?)',
    [title, false]
  );
  const [rows]: any = await pool.query('SELECT * FROM todos WHERE id = ?', [result.insertId]);

  sendToQueue('created', rows[0]);

  res.status(201).json(rows[0]);
});

app.put('/todos/:id', async (req, res) => {
  const { title, completed } = req.body;
  const [rows]: any = await pool.query('SELECT * FROM todos WHERE id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

  await pool.query(
    'UPDATE todos SET title = COALESCE(?, title), completed = COALESCE(?, completed) WHERE id = ?',
    [title, completed, req.params.id]
  );
  const [updated]: any = await pool.query('SELECT * FROM todos WHERE id = ?', [req.params.id]);

  sendToQueue('updated', updated[0]);

  res.json(updated[0]);
});

app.delete('/todos/:id', async (req, res) => {
  const [rows]: any = await pool.query('SELECT * FROM todos WHERE id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

  await pool.query('DELETE FROM todos WHERE id = ?', [req.params.id]);

  sendToQueue('deleted', rows[0]);

  res.status(204).send();
});

// --- Graceful shutdown ---
async function shutdown() {
  console.log('🛑 Shutting down...');
  try {
    if (channel && channelModel) {
      await channel.close();
      await channelModel.close();
      console.log('✅ RabbitMQ channel & connection closed');
    }
    await pool.end();
    console.log('✅ MySQL pool closed');
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// --- App startup ---
const PORT = process.env.PORT || 3080;
Promise.all(
  [initDb(), initRabbitMQ()]
)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Todo app listening on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Failed to initialize app:', err);
    process.exit(1);
  });
