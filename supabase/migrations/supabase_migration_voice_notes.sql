-- Voice notes for both 1:1 DMs and group chat.
-- Mirrors the existing is_sticker/sticker_url columns exactly: a voice note
-- is a message row with empty content and these three fields set instead.
-- voice_duration is stored in whole seconds (client rounds when recording).

alter table public.messages
  add column if not exists is_voice boolean not null default false,
  add column if not exists voice_url text,
  add column if not exists voice_duration integer;

alter table public.group_messages
  add column if not exists is_voice boolean not null default false,
  add column if not exists voice_url text,
  add column if not exists voice_duration integer;
