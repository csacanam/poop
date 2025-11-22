-- Supabase Database Schema
-- This file contains the database structure for reference

create table users (
  id uuid primary key default gen_random_uuid(),
  address text unique,
  username text unique not null,
  email text unique,
  self_uniqueness_id text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create type poop_state as enum ('CREATED', 'FUNDED', 'CLAIMED', 'VERIFIED');

create table poops (
  id uuid primary key default gen_random_uuid(),
  sender_user_id uuid not null references users(id),
  recipient_user_id uuid references users(id),

  recipient_email text,

  amount numeric(20, 6) not null,
  chain_id smallint not null,

  state poop_state not null default 'CREATED',

  recipient_self_uniqueness_id text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
