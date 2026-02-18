import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { supabase } from '../lib/supabase';

const vault = new Hono();

// Middleware: extract user from Bearer token
async function getUser(authHeader: string | undefined) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

const EntrySchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid().nullable().optional(),
  encrypted_data: z.string(),
  iv: z.string(),
  entry_type: z.enum(['login', 'note', 'card', 'wifi', 'identity']).default('login'),
  title_hint: z.string().nullable().optional(),
  favicon_url: z.string().nullable().optional(),
  updated_at: z.string().optional(),
});

const SyncSchema = z.object({
  entries: z.array(EntrySchema),
  last_sync: z.string().optional(),
});

// GET /vault - list all entries
vault.get('/', async (c) => {
  const user = await getUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const since = c.req.query('since');
  let query = supabase
    .from('vault_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (since) {
    query = query.gte('updated_at', since);
  }

  const { data, error } = await query;
  if (error) return c.json({ error: 'Failed to fetch entries' }, 500);

  return c.json({ entries: data, server_time: new Date().toISOString() });
});

// POST /vault - create entry
vault.post('/', zValidator('json', EntrySchema), async (c) => {
  const user = await getUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = c.req.valid('json');
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('vault_entries')
    .insert({
      user_id: user.id,
      category_id: body.category_id ?? null,
      encrypted_data: body.encrypted_data,
      iv: body.iv,
      entry_type: body.entry_type,
      title_hint: body.title_hint ?? null,
      favicon_url: body.favicon_url ?? null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) return c.json({ error: 'Failed to create entry' }, 500);
  return c.json({ entry: data }, 201);
});

// PUT /vault/:id - update entry
vault.put('/:id', zValidator('json', EntrySchema), async (c) => {
  const user = await getUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const body = c.req.valid('json');

  const { data, error } = await supabase
    .from('vault_entries')
    .update({
      category_id: body.category_id ?? null,
      encrypted_data: body.encrypted_data,
      iv: body.iv,
      entry_type: body.entry_type,
      title_hint: body.title_hint ?? null,
      favicon_url: body.favicon_url ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return c.json({ error: 'Failed to update entry' }, 500);
  return c.json({ entry: data });
});

// DELETE /vault/:id - soft delete
vault.delete('/:id', async (c) => {
  const user = await getUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');

  const { error } = await supabase
    .from('vault_entries')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return c.json({ error: 'Failed to delete entry' }, 500);
  return c.json({ success: true });
});

// POST /vault/sync - bidirectional sync (offline-first, last-modified wins)
vault.post('/sync', zValidator('json', SyncSchema), async (c) => {
  const user = await getUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { entries: clientEntries, last_sync } = c.req.valid('json');

  // Get server entries modified since last_sync
  let query = supabase
    .from('vault_entries')
    .select('*')
    .eq('user_id', user.id);

  if (last_sync) {
    query = query.gte('updated_at', last_sync);
  }

  const { data: serverEntries, error: fetchError } = await query;
  if (fetchError) return c.json({ error: 'Sync failed' }, 500);

  const serverMap = new Map((serverEntries ?? []).map((e: any) => [e.id, e]));
  const upserted: any[] = [];

  for (const clientEntry of clientEntries) {
    if (!clientEntry.id) {
      // New entry from client
      const { data, error } = await supabase
        .from('vault_entries')
        .insert({
          user_id: user.id,
          ...clientEntry,
          updated_at: clientEntry.updated_at ?? new Date().toISOString(),
        })
        .select()
        .single();
      if (!error && data) upserted.push(data);
    } else {
      const server = serverMap.get(clientEntry.id);
      const clientTime = new Date(clientEntry.updated_at ?? 0).getTime();
      const serverTime = server ? new Date(server.updated_at).getTime() : 0;

      if (!server || clientTime > serverTime) {
        // Client wins (last modified)
        const { data, error } = await supabase
          .from('vault_entries')
          .upsert({
            id: clientEntry.id,
            user_id: user.id,
            ...clientEntry,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (!error && data) upserted.push(data);
        serverMap.delete(clientEntry.id);
      } else {
        serverMap.delete(clientEntry.id);
      }
    }
  }

  // Remaining server entries are newer - send back to client
  const serverWins = Array.from(serverMap.values());

  return c.json({
    upserted,
    server_changes: serverWins,
    server_time: new Date().toISOString(),
  });
});

// GET /vault/categories - list categories
vault.get('/categories', async (c) => {
  const user = await getUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('name');

  if (error) return c.json({ error: 'Failed to fetch categories' }, 500);
  return c.json({ categories: data });
});

// POST /vault/categories - create category
vault.post('/categories', zValidator('json', z.object({
  name: z.string().min(1),
  icon: z.string().default('key'),
  color: z.string().default('#6366f1'),
})), async (c) => {
  const user = await getUser(c.req.header('Authorization'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = c.req.valid('json');

  const { data, error } = await supabase
    .from('categories')
    .insert({ user_id: user.id, ...body })
    .select()
    .single();

  if (error) return c.json({ error: 'Failed to create category' }, 500);
  return c.json({ category: data }, 201);
});

export default vault;
