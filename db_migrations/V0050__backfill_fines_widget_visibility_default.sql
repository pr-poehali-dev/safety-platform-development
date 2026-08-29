UPDATE t_p5901577_safety_platform_deve.dashboard_visibility_settings
SET settings = jsonb_set(settings, '{blocks,finesWidget}', 'true'::jsonb)
WHERE NOT (settings->'blocks' ? 'finesWidget');