-- ============================================================
-- Flutter Interview Library — Supabase SQL Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Questions table
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text not null default 'General',
  difficulty text not null default 'Medium' check (difficulty in ('Easy', 'Medium', 'Hard')),
  tags text[] default '{}',
  is_favourite boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Auto-update updated_at on row change
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger questions_updated_at
before update on questions
for each row execute procedure update_updated_at();

-- 3. Enable Row Level Security (RLS)
alter table questions enable row level security;

-- 4. Policy: allow all operations for now (personal use — no auth needed)
--    If you want auth later, change this to: using (auth.uid() = user_id)
create policy "Allow all" on questions
  for all using (true) with check (true);

-- 5. Sample seed data to get started
insert into questions (question, answer, category, difficulty, tags) values
(
  'What is the difference between StatelessWidget and StatefulWidget?',
  'StatelessWidget is immutable and its UI does not change over time. It is used when the UI depends only on the configuration passed via constructor. StatefulWidget maintains a mutable State object, allowing the UI to update when state changes via setState().',
  'Widgets',
  'Easy',
  ARRAY['state', 'widgets', 'basics']
),
(
  'What is BuildContext in Flutter?',
  'BuildContext is a handle to the location of a widget in the widget tree. It allows widgets to find and interact with other widgets and inherited data higher up in the tree. Every widget has its own BuildContext which is used to navigate, show dialogs, access themes, and more.',
  'Widgets',
  'Easy',
  ARRAY['context', 'widget tree', 'basics']
),
(
  'Explain the difference between setState, Provider, Riverpod, and BLoC.',
  'setState is Flutter''s simplest state management — local to a widget. Provider is a DI + state solution using InheritedWidget under the hood, great for medium apps. Riverpod is a safer evolution of Provider with compile-time safety and no context dependency. BLoC (Business Logic Component) separates UI from logic using Streams/Cubit — ideal for large, scalable apps.',
  'State Management',
  'Hard',
  ARRAY['provider', 'bloc', 'riverpod', 'setState', 'state management']
),
(
  'What is the widget lifecycle in Flutter?',
  'For StatefulWidget: createState() → initState() → didChangeDependencies() → build() → setState() triggers rebuild → didUpdateWidget() if parent rebuilds → deactivate() → dispose(). initState is called once; dispose() is for cleanup (cancel timers, streams, controllers).',
  'Widgets',
  'Medium',
  ARRAY['lifecycle', 'initState', 'dispose']
),
(
  'What is the difference between Future and Stream?',
  'A Future represents a single asynchronous value that completes once (either with data or error). A Stream is a sequence of asynchronous events over time — it can emit multiple values. Use Future for HTTP calls; use Stream for real-time data like WebSockets or Firestore listeners.',
  'Async / Dart',
  'Medium',
  ARRAY['future', 'stream', 'async', 'dart']
);
