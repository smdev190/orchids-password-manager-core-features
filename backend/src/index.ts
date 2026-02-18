import { Hono } from 'hono';
import { cors } from 'hono/cors';
import auth from './routes/auth';
import vault from './routes/vault';

const app = new Hono();

// Enable CORS for all routes
app.use(
  '*',
  cors({
    credentials: true,
    origin: (origin) => origin || '*',
  })
);

app.get('/', (c) => {
  return c.json({ status: 'ok', service: 'VaultGuard API', version: '1.0.0' });
});

app.route('/auth', auth);
app.route('/vault', vault);

export default {
  fetch: app.fetch,
  port: 3002,
};
