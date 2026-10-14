ALTER TABLE public.tasks ADD COLUMN deleted_at timestamptz;
ALTER TABLE public.generations ADD COLUMN deleted_at timestamptz;