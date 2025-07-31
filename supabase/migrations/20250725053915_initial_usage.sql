-- =============================================
-- Create Usage Table!
-- =============================================
-- Create the 'usage' table to store user credits balances.
CREATE TABLE public.usage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    subscription_credits_balance integer NOT NULL DEFAULT 0 CHECK (subscription_credits_balance >= 0),
    one_time_credits_balance integer NOT NULL DEFAULT 0 CHECK (one_time_credits_balance >= 0),
    balance_jsonb jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.usage IS 'Stores usage data like credits balances for each user.';
COMMENT ON COLUMN public.usage.user_id IS 'Foreign key referencing the user associated with this usage record.';
COMMENT ON COLUMN public.usage.subscription_credits_balance IS 'Balance of credits granted via subscription, typically reset periodically upon successful payment.';
COMMENT ON COLUMN public.usage.one_time_credits_balance IS 'Balance of credits acquired through one-time purchases, accumulates over time.';
COMMENT ON COLUMN public.usage.balance_jsonb IS 'JSONB object to store additional balance information.';
COMMENT ON COLUMN public.usage.created_at IS 'Timestamp of when the user''s usage record was first created.';
COMMENT ON COLUMN public.usage.updated_at IS 'Timestamp of the last modification to the user''s usage record.';


CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_usage_updated
BEFORE UPDATE ON public.usage
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();


ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow user read own usage"
ON public.usage
FOR SELECT USING (auth.uid() = user_id);

-- Disallow users from inserting, updating, or deleting usage directly
  -- Optional, but recommended to keep
CREATE POLICY "Disallow user insert usage"
ON public.usage
FOR INSERT
WITH CHECK (false);

CREATE POLICY "Disallow user update usage"
ON public.usage
FOR UPDATE
USING (false);

CREATE POLICY "Disallow user delete usage"
ON public.usage
FOR DELETE
USING (false);

