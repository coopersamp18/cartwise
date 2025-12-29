-- Migration: Add image_url field to recipes table
-- Run this in Supabase SQL Editor

ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS image_url TEXT;
