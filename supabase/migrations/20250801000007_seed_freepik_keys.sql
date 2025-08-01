-- =============================================
-- Seed sample Freepik API Keys for testing (test environment only)
-- =============================================

-- Only insert sample data in test environment
INSERT INTO public.freepik_api_keys (name, key, daily_limit, is_active)
SELECT 'Sample Key 1', 'test_key_1234567890abcdef', 100, true
WHERE NOT EXISTS (
    SELECT 1 FROM public.freepik_api_keys WHERE key = 'test_key_1234567890abcdef'
);