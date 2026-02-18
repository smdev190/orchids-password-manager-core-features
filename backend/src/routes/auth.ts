import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { supabase } from '../lib/supabase';

const auth = new Hono();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  master_salt: z.string().min(16),
  recovery_key_hash: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RefreshSchema = z.object({
  refresh_token: z.string(),
});

// Register
auth.post('/register', zValidator('json', RegisterSchema), async (c) => {
  const { email, password, master_salt, recovery_key_hash } = c.req.valid('json');

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return c.json({ error: authError?.message ?? 'Registration failed' }, 400);
  }

  const { error: profileError } = await supabase.from('user_profiles').insert({
    id: authData.user.id,
    email,
    master_salt,
    recovery_key_hash: recovery_key_hash ?? null,
    biometric_enabled: false,
    auto_lock_minutes: 5,
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    return c.json({ error: 'Failed to create user profile' }, 500);
  }

  // Sign in to get tokens
  const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (sessionError || !sessionData.session) {
    return c.json({ error: 'Registration succeeded but login failed' }, 500);
  }

  return c.json({
    user: {
      id: authData.user.id,
      email,
      master_salt,
    },
    session: {
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      expires_at: sessionData.session.expires_at,
    },
  });
});

// Login
auth.post('/login', zValidator('json', LoginSchema), async (c) => {
  const { email, password } = c.req.valid('json');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session || !data.user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('master_salt, biometric_enabled, auto_lock_minutes')
    .eq('id', data.user.id)
    .single();

  return c.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      master_salt: profile?.master_salt ?? '',
      biometric_enabled: profile?.biometric_enabled ?? false,
      auto_lock_minutes: profile?.auto_lock_minutes ?? 5,
    },
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
  });
});

// Refresh token
auth.post('/refresh', zValidator('json', RefreshSchema), async (c) => {
  const { refresh_token } = c.req.valid('json');

  const { data, error } = await supabase.auth.refreshSession({ refresh_token });

  if (error || !data.session) {
    return c.json({ error: 'Invalid or expired refresh token' }, 401);
  }

  return c.json({
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
  });
});

// Logout
auth.post('/logout', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    await supabase.auth.admin.signOut(token);
  }
  return c.json({ success: true });
});

// Get profile
auth.get('/profile', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return c.json({ user: { id: user.id, email: user.email, ...profile } });
});

// Update profile
auth.patch('/profile', zValidator('json', z.object({
  biometric_enabled: z.boolean().optional(),
  auto_lock_minutes: z.number().int().min(1).max(60).optional(),
  recovery_key_hash: z.string().optional(),
})), async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const updates = c.req.valid('json');

  const { data, error: updateError } = await supabase
    .from('user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select()
    .single();

  if (updateError) {
    return c.json({ error: 'Failed to update profile' }, 500);
  }

  return c.json({ profile: data });
});

export default auth;
