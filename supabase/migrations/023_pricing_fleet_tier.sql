-- Migration: 023_pricing_fleet_tier
-- Purpose: Add 'fleet' to the plan CHECK constraint on operators and subscriptions tables.
-- The 'free' tier is retired; no existing operator data is modified.
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New Query → Paste → Run).

-- ─── operators table ─────────────────────────────────────────────────────────

ALTER TABLE operators
  DROP CONSTRAINT IF EXISTS operators_plan_check;

ALTER TABLE operators
  ADD CONSTRAINT operators_plan_check
    CHECK (plan IN ('growth', 'pro', 'scale', 'fleet'));

-- ─── subscriptions table ──────────────────────────────────────────────────────

ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_plan_check
    CHECK (plan IN ('growth', 'pro', 'scale', 'fleet'));
