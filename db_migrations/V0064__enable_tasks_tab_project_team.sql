UPDATE t_p5901577_safety_platform_deve.dashboard_visibility_settings
SET settings = jsonb_set(settings::jsonb, '{tabs,tasks}', 'true'::jsonb, true)
WHERE scope_type = 'role' AND scope_key = 'project_team';