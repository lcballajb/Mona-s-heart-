-- Separate opt-in discovery data; private onboarding is never a discovery source.
CREATE FUNCTION synthetic_peer_eligible(target uuid, required_role text DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.users u WHERE u.id=target
    AND u.status='active' AND u.email_verified_at IS NOT NULL AND u.deleted_at IS NULL
    AND u.email LIKE '%.test' AND EXISTS (SELECT 1 FROM public.user_roles r
      WHERE r.user_id=u.id AND r.role_code IN ('patient','survivor','caregiver')
        AND (required_role IS NULL OR r.role_code=required_role)))
$$;
CREATE TABLE survivor_cards (
  user_id uuid PRIMARY KEY REFERENCES profiles(user_id) ON DELETE CASCADE,
  alias text NOT NULL CHECK (char_length(alias)<=80),
  introduction text NOT NULL CHECK (char_length(introduction)<=600),
  availability text NOT NULL CHECK (char_length(availability)<=160),
  published boolean NOT NULL DEFAULT false,
  consent_version text NOT NULL CHECK(consent_version='synthetic-discovery-v1'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE peer_match_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  survivor_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  requester_alias text NOT NULL CHECK(char_length(requester_alias) BETWEEN 1 AND 80),
  consent_version text NOT NULL CHECK(consent_version='synthetic-match-request-v1'),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','withdrawn','blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(requester_id<>survivor_id)
);
CREATE UNIQUE INDEX peer_match_one_active_pair ON peer_match_requests(requester_id,survivor_id)
  WHERE status IN ('pending','accepted');
CREATE INDEX peer_match_recipient ON peer_match_requests(survivor_id,created_at DESC);
CREATE INDEX peer_match_requester ON peer_match_requests(requester_id,created_at DESC);
ALTER TABLE survivor_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE survivor_cards FORCE ROW LEVEL SECURITY;
ALTER TABLE peer_match_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_match_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks FORCE ROW LEVEL SECURITY;
CREATE POLICY peer_block_read ON blocks FOR SELECT USING (
  nullif(current_setting('app.user_id',true),'')::uuid IN (blocker_id,blocked_id));
CREATE POLICY peer_block_insert ON blocks FOR INSERT WITH CHECK (
  blocker_id=nullif(current_setting('app.user_id',true),'')::uuid);
CREATE POLICY survivor_card_read ON survivor_cards FOR SELECT USING (
  user_id=nullif(current_setting('app.user_id',true),'')::uuid OR
  (published AND synthetic_peer_eligible(user_id,'survivor')
   AND synthetic_peer_eligible(nullif(current_setting('app.user_id',true),'')::uuid)
   AND NOT EXISTS (SELECT 1 FROM blocks b WHERE
     (b.blocker_id=user_id AND b.blocked_id=nullif(current_setting('app.user_id',true),'')::uuid)
     OR (b.blocked_id=user_id AND b.blocker_id=nullif(current_setting('app.user_id',true),'')::uuid))));
CREATE POLICY survivor_card_insert ON survivor_cards FOR INSERT WITH CHECK (
  user_id=nullif(current_setting('app.user_id',true),'')::uuid AND synthetic_peer_eligible(user_id,'survivor'));
CREATE POLICY survivor_card_update ON survivor_cards FOR UPDATE USING (
  user_id=nullif(current_setting('app.user_id',true),'')::uuid)
  WITH CHECK(user_id=nullif(current_setting('app.user_id',true),'')::uuid AND synthetic_peer_eligible(user_id,'survivor'));
CREATE POLICY peer_request_read ON peer_match_requests FOR SELECT USING (
  nullif(current_setting('app.user_id',true),'')::uuid IN (requester_id,survivor_id));
CREATE POLICY peer_request_insert ON peer_match_requests FOR INSERT WITH CHECK (
  requester_id=nullif(current_setting('app.user_id',true),'')::uuid AND status='pending'
  AND (synthetic_peer_eligible(requester_id,'patient') OR synthetic_peer_eligible(requester_id,'caregiver'))
  AND EXISTS (SELECT 1 FROM survivor_cards c WHERE c.user_id=survivor_id AND c.published));
CREATE POLICY peer_request_update ON peer_match_requests FOR UPDATE USING (
  nullif(current_setting('app.user_id',true),'')::uuid IN (requester_id,survivor_id))
  WITH CHECK(nullif(current_setting('app.user_id',true),'')::uuid IN (requester_id,survivor_id));
-- Defense in depth: a participant cannot accept their own outgoing request or
-- rewrite participants/consent. Store transactions additionally lock both users.
CREATE FUNCTION enforce_peer_transition() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor uuid := nullif(current_setting('app.user_id',true),'')::uuid;
BEGIN
  IF ROW(NEW.id,NEW.requester_id,NEW.survivor_id,NEW.requester_alias,NEW.consent_version,NEW.created_at)
    IS DISTINCT FROM ROW(OLD.id,OLD.requester_id,OLD.survivor_id,OLD.requester_alias,OLD.consent_version,OLD.created_at)
    OR OLD.status NOT IN ('pending','accepted')
    OR NEW.status NOT IN ('accepted','declined','withdrawn','blocked')
    OR (NEW.status IN ('accepted','declined') AND (actor<>OLD.survivor_id OR OLD.status<>'pending'))
  THEN RAISE EXCEPTION 'Invalid peer transition' USING ERRCODE='42501'; END IF;
  IF NEW.status='accepted' AND (
    NOT synthetic_peer_eligible(NEW.requester_id)
    OR NOT EXISTS(SELECT 1 FROM survivor_cards c WHERE c.user_id=NEW.survivor_id AND c.published)
    OR EXISTS(SELECT 1 FROM blocks WHERE (blocker_id=NEW.requester_id AND blocked_id=NEW.survivor_id)
      OR (blocked_id=NEW.requester_id AND blocker_id=NEW.survivor_id)))
  THEN RAISE EXCEPTION 'Unavailable peer' USING ERRCODE='42501'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER peer_transition BEFORE UPDATE ON peer_match_requests FOR EACH ROW EXECUTE FUNCTION enforce_peer_transition();
-- Preserve the existing narrowly scoped account deletion function's block cleanup.
DO $$ BEGIN
  EXECUTE format('CREATE POLICY deletion_owner_execution ON blocks TO %I USING (current_setting(''app.deletion_mode'',true)=''on'') WITH CHECK (current_setting(''app.deletion_mode'',true)=''on'')',current_user);
END $$;
