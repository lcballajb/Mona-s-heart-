-- Fictional development-only organization. No health records or real people.
INSERT INTO organizations (name, kind) VALUES ('Northstar Demonstration Clinic', 'clinic');
INSERT INTO feature_flags (key, environment, enabled) VALUES ('health_features', 'development', false), ('health_features', 'production', false), ('mfa_enrollment', 'development', false);
