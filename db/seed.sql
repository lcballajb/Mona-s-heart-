-- Fictional development-only organization. No health records or real people.
INSERT INTO organizations (id, name, kind) VALUES ('00000000-0000-4000-8000-000000000001', 'Northstar Fictional Demonstration Clinic', 'clinic') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO feature_flags (key, environment, enabled) VALUES ('health_features', 'development', false), ('health_features', 'production', false), ('mfa_enrollment', 'development', false) ON CONFLICT (key,environment) DO UPDATE SET enabled=EXCLUDED.enabled;
