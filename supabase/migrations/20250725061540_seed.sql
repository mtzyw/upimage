INSERT INTO public.pricing_plans (
    id, created_at, updated_at, environment, card_title, card_description,
    stripe_price_id, stripe_product_id, stripe_coupon_id, enable_manual_input_coupon,
    payment_type, recurring_interval, trial_period_days, price, currency,
    display_price, original_price, price_suffix, features, is_highlighted,
    highlight_text, button_text, button_link, display_order, is_active,
    lang_jsonb, benefits_jsonb
) VALUES 
(
        'b45736f3-226a-452b-9d0c-d01e45c0eda6', '2025-07-29T00:00:00+00', '2025-07-29T00:00:00+00', 'test', 'Starter', 'Perfect for beginners with 100 credits/month and core AI tools.',
        NULL, NULL, NULL, false, 'recurring', 'month', NULL, 3.9, 'usd',
        '$3.90', '$6.90', 'per month', '[{"bold": true, "included": true, "description": "100 credits/month"}, {"bold": false, "included": true, "description": "Credits roll up"}, {"bold": false, "included": true, "description": "Email Support"}, {"bold": false, "included": true, "description": "Reimagine AI"}, {"bold": false, "included": true, "description": "Batch Processing"}, {"bold": false, "included": true, "description": "No Ads"}, {"bold": false, "included": true, "description": "Pay with PayPro"}]',
        true, 'Best for Starters', 'Subscribe Starter', NULL,
        1, true, '{}', '{"monthly_credits": 100, "rollover_credits": true, "email_support": true, "reimagine_ai": true, "batch_processing": true, "no_ads": true, "paypro_enabled": true}'
    ),
(
        '41f780fe-8619-457a-8004-1c5915c42515', '2025-07-29T00:00:00+00', '2025-07-29T00:00:00+00', 'test', 'Premium', 'Best value plan with 500 credits/month and full AI features.',
        NULL, NULL, NULL, false, 'recurring', 'month', NULL, 6.9, 'usd',
        '$6.90', '$11.50', 'per month', '[{"bold": true, "included": true, "description": "500 credits/month"}, {"bold": false, "included": true, "description": "Credits roll up"}, {"bold": false, "included": true, "description": "Email Support"}, {"bold": false, "included": true, "description": "Reimagine AI"}, {"bold": false, "included": true, "description": "Batch Processing"}, {"bold": false, "included": true, "description": "No Ads"}]',
        true, 'Most Popular', 'Subscribe Premium', NULL,
        2, true, '{}', '{"monthly_credits": 500, "rollover_credits": true, "email_support": true, "reimagine_ai": true, "batch_processing": true, "no_ads": true}'
    ),
(
        'd64d029a-7001-4d98-a229-e455e8e5facc', '2025-07-29T00:00:00+00', '2025-07-29T00:00:00+00', 'test', 'Business', 'Unlimited credits, full AI features, and 8-image batch support.',
        NULL, NULL, NULL, false, 'recurring', 'month', NULL, 19.0, 'usd',
        '$19.00', '$29.00', 'per month', '[{"bold": true, "included": true, "description": "Unlimited credits"}, {"bold": false, "included": true, "description": "Email Support"}, {"bold": false, "included": true, "description": "Single Processing"}, {"bold": false, "included": true, "description": "Reimagine AI"}, {"bold": false, "included": true, "description": "Batch Processing"}, {"bold": false, "included": true, "description": "Up to 8 images per batch"}, {"bold": false, "included": true, "description": "No Ads"}]',
        false, '', 'Subscribe Business', NULL,
        3, true, '{}', '{"unlimited_credits": true, "email_support": true, "reimagine_ai": true, "batch_processing": true, "single_processing": true, "max_images_per_batch": 8, "no_ads": true}'
    ),
(
        '4f53d276-68f1-4350-b610-62ebe9e8e614', '2025-07-29T00:00:00+00', '2025-07-29T00:00:00+00', 'test', 'Starter (Year)', 'Perfect for beginners with 100 credits/month and core AI tools.',
        NULL, NULL, NULL, false, 'recurring', 'year', NULL, 46.8, 'usd',
        '$46.80', '$93.60', 'per year', '[{"bold": true, "included": true, "description": "100 credits/month"}, {"bold": false, "included": true, "description": "Credits roll up"}, {"bold": false, "included": true, "description": "Email Support"}, {"bold": false, "included": true, "description": "Reimagine AI"}, {"bold": false, "included": true, "description": "Batch Processing"}, {"bold": false, "included": true, "description": "No Ads"}, {"bold": false, "included": true, "description": "Pay with PayPro"}]',
        true, 'Best for Starters', 'Subscribe Starter', NULL,
        1, true, '{}', '{"monthly_credits": 100, "rollover_credits": true, "email_support": true, "reimagine_ai": true, "batch_processing": true, "no_ads": true, "paypro_enabled": true}'
    ),
(
        '68b3d8ea-fcdc-42c2-abed-c92d555216b5', '2025-07-29T00:00:00+00', '2025-07-29T00:00:00+00', 'test', 'Premium (Year)', 'Best value plan with 500 credits/month and full AI features.',
        NULL, NULL, NULL, false, 'recurring', 'year', NULL, 82.80000000000001, 'usd',
        '$82.80', '$165.60', 'per year', '[{"bold": true, "included": true, "description": "500 credits/month"}, {"bold": false, "included": true, "description": "Credits roll up"}, {"bold": false, "included": true, "description": "Email Support"}, {"bold": false, "included": true, "description": "Reimagine AI"}, {"bold": false, "included": true, "description": "Batch Processing"}, {"bold": false, "included": true, "description": "No Ads"}]',
        true, 'Most Popular', 'Subscribe Premium', NULL,
        2, true, '{}', '{"monthly_credits": 500, "rollover_credits": true, "email_support": true, "reimagine_ai": true, "batch_processing": true, "no_ads": true}'
    ),
(
        'a248b17a-e9b1-4222-8086-dc10d2a7e4e9', '2025-07-29T00:00:00+00', '2025-07-29T00:00:00+00', 'test', 'Business (Year)', 'Unlimited credits, full AI features, and 8-image batch support.',
        NULL, NULL, NULL, false, 'recurring', 'year', NULL, 228.0, 'usd',
        '$228.00', '$456.00', 'per year', '[{"bold": true, "included": true, "description": "Unlimited credits"}, {"bold": false, "included": true, "description": "Email Support"}, {"bold": false, "included": true, "description": "Single Processing"}, {"bold": false, "included": true, "description": "Reimagine AI"}, {"bold": false, "included": true, "description": "Batch Processing"}, {"bold": false, "included": true, "description": "Up to 8 images per batch"}, {"bold": false, "included": true, "description": "No Ads"}]',
        false, '', 'Subscribe Business', NULL,
        3, true, '{}', '{"unlimited_credits": true, "email_support": true, "reimagine_ai": true, "batch_processing": true, "single_processing": true, "max_images_per_batch": 8, "no_ads": true}'
    );