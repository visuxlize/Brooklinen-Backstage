-- =============================================================================
-- Link seed users to Supabase Auth users
-- =============================================================================
-- 1. In Supabase: Authentication → Users
-- 2. For each email below, create a user (or find existing) and copy their UID
-- 3. Replace each placeholder UUID on the right with the real Auth UID
-- 4. Run this entire script in Supabase → SQL Editor
-- =============================================================================

UPDATE public.users SET id = 'PASTE-UID-FOR-andres@brooklinen.com'     WHERE email = 'andres@brooklinen.com';
UPDATE public.users SET id = 'PASTE-UID-FOR-victoria@brooklinen.com'   WHERE email = 'victoria@brooklinen.com';
UPDATE public.users SET id = 'PASTE-UID-FOR-andy@brooklinen.com'       WHERE email = 'andy@brooklinen.com';
UPDATE public.users SET id = 'PASTE-UID-FOR-demi@brooklinen.com'       WHERE email = 'demi@brooklinen.com';
UPDATE public.users SET id = 'PASTE-UID-FOR-laShawn@brooklinen.com'    WHERE email = 'laShawn@brooklinen.com';
UPDATE public.users SET id = 'PASTE-UID-FOR-braiden@brooklinen.com'     WHERE email = 'braiden@brooklinen.com';
UPDATE public.users SET id = 'PASTE-UID-FOR-rachel@brooklinen.com'     WHERE email = 'rachel@brooklinen.com';
UPDATE public.users SET id = 'PASTE-UID-FOR-willow@brooklinen.com'      WHERE email = 'willow@brooklinen.com';
UPDATE public.users SET id = 'PASTE-UID-FOR-selene@brooklinen.com'     WHERE email = 'selene@brooklinen.com';
UPDATE public.users SET id = 'PASTE-UID-FOR-patrick@brooklinen.com'    WHERE email = 'patrick@brooklinen.com';
UPDATE public.users SET id = 'PASTE-UID-FOR-shir@brooklinen.com'       WHERE email = 'shir@brooklinen.com';
UPDATE public.users SET id = 'PASTE-UID-FOR-brandon@brooklinen.com'     WHERE email = 'brandon@brooklinen.com';
