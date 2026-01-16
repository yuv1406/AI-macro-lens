-- ============================================================================
-- Setup Test User Profile (Empty Database)
-- ============================================================================
-- This script creates ONLY the user settings profile for a test user
-- No sample meals or water logs will be created - the user starts fresh
-- 
-- Test User: test.alpha@gmail.com
-- User ID: b8484ba5-db62-415a-8000-096a5644f5d7
-- Created: 15 Jan, 2026 23:13
-- ============================================================================

-- CREATE USER SETTINGS (Profile Only)
-- ============================================================================

INSERT INTO user_settings (
    user_id,
    maintenance_calories,
    protein_target,
    carbs_target,
    fat_target,
    water_target_ml,
    goal_mode,
    height_cm,
    weight_kg,
    age,
    sex,
    activity_level
) VALUES (
    'b8484ba5-db62-415a-8000-096a5644f5d7',
    2000,           -- maintenance_calories
    150,            -- protein_target (g)
    200,            -- carbs_target (g)
    60,             -- fat_target (g)
    2500,           -- water_target_ml
    'maintain',     -- goal_mode: 'cut', 'maintain', or 'gain'
    170,            -- height_cm
    70,             -- weight_kg
    25,             -- age
    'male',         -- sex: 'male' or 'female'
    'moderate'      -- activity_level: 'sedentary', 'light', 'moderate', 'active', 'super_active'
)
ON CONFLICT (user_id) DO UPDATE SET
    maintenance_calories = EXCLUDED.maintenance_calories,
    protein_target = EXCLUDED.protein_target,
    carbs_target = EXCLUDED.carbs_target,
    fat_target = EXCLUDED.fat_target,
    water_target_ml = EXCLUDED.water_target_ml,
    goal_mode = EXCLUDED.goal_mode,
    height_cm = EXCLUDED.height_cm,
    weight_kg = EXCLUDED.weight_kg,
    age = EXCLUDED.age,
    sex = EXCLUDED.sex,
    activity_level = EXCLUDED.activity_level;

-- ============================================================================
-- VERIFY SETUP
-- ============================================================================

SELECT 'User Settings Created:' as status, * FROM user_settings WHERE user_id = 'b8484ba5-db62-415a-8000-096a5644f5d7';

SELECT '✅ Test user profile created! User will start with empty meals and water logs.' as message;

