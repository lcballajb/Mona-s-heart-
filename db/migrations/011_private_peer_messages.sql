-- A connection request is the sole conversation identity. Legacy demo messaging
-- tables remain untouched; no fabricated membership or conversation is created.
CREATE FUNCTION peer_conversation_available(connection uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.peer_match_requests r
    JOIN public.survivor_cards c ON c.user_id=r.survivor_id
    WHERE r.id=connection AND r.status='accepted' AND c.published
      AND nullif(current_setting('app.user_id',true),'')::uuid IN (r.requester_id,r.survivor_id)
      AND (public.synthetic_peer_eligible(r.requester_id,'patient') OR public.synthetic_peer_eligible(r.requester_id,'caregiver'))
      AND public.synthetic_peer_eligible(r.survivor_id,'survivor')
      AND NOT EXISTS(SELECT 1 FROM public.blocks b
        WHERE (b.blocker_id=r.requester_id AND b.blocked_id=r.survivor_id)
           OR (b.blocker_id=r.survivor_id AND b.blocked_id=r.requester_id)))
$$;
CREATE TABLE peer_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  connection_id uuid NOT NULL REFERENCES peer_match_requests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  body_ciphertext bytea NOT NULL CHECK(octet_length(body_ciphertext) BETWEEN 30 AND 8029),
  sent_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(sender_id,client_id)
);
CREATE INDEX peer_messages_history ON peer_messages(connection_id,id DESC);
CREATE INDEX peer_messages_rate ON peer_messages(sender_id,sent_at DESC);
ALTER TABLE peer_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_messages FORCE ROW LEVEL SECURITY;
CREATE POLICY peer_message_read ON peer_messages FOR SELECT USING (peer_conversation_available(connection_id));
CREATE POLICY peer_message_send ON peer_messages FOR INSERT WITH CHECK (
  sender_id=nullif(current_setting('app.user_id',true),'')::uuid AND peer_conversation_available(connection_id));
-- Runtime has no UPDATE or DELETE permission. Profile/request FK cascades remove
-- both participants' messages when either account is erased.

-- Durable per-account quota survives withdrawal and process restarts.
CREATE TABLE peer_message_limits (
  user_id uuid PRIMARY KEY REFERENCES profiles(user_id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  sends integer NOT NULL CHECK(sends BETWEEN 1 AND 30)
);
ALTER TABLE peer_message_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_message_limits FORCE ROW LEVEL SECURITY;
CREATE POLICY own_message_limit ON peer_message_limits USING (
  user_id=nullif(current_setting('app.user_id',true),'')::uuid)
  WITH CHECK(user_id=nullif(current_setting('app.user_id',true),'')::uuid);

-- All API reads/writes acquire ordered account locks before taking a fresh
-- authorization snapshot. Also serialize direct runtime mutations at DB seams.
CREATE FUNCTION lock_peer_accounts() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ids uuid[]; quota integer;
BEGIN
  IF TG_TABLE_NAME='blocks' THEN ids:=ARRAY[NEW.blocker_id,NEW.blocked_id];
  ELSIF TG_TABLE_NAME='survivor_cards' THEN ids:=ARRAY[NEW.user_id];
  ELSIF TG_TABLE_NAME='peer_match_requests' THEN ids:=ARRAY[NEW.survivor_id];
  ELSIF TG_TABLE_NAME='user_roles' THEN
    IF TG_OP='DELETE' THEN ids:=ARRAY[OLD.user_id];
    ELSIF TG_OP='UPDATE' THEN ids:=ARRAY[OLD.user_id,NEW.user_id];
    ELSE ids:=ARRAY[NEW.user_id]; END IF;
  ELSE
    SELECT ARRAY[requester_id,survivor_id] INTO ids FROM public.peer_match_requests WHERE id=NEW.connection_id;
  END IF;
  PERFORM id FROM public.users WHERE id=ANY(ids) ORDER BY id FOR UPDATE;
  IF TG_TABLE_NAME='peer_messages' THEN
    IF NEW.sender_id IS DISTINCT FROM nullif(current_setting('app.user_id',true),'')::uuid
      OR NOT public.peer_conversation_available(NEW.connection_id)
    THEN RAISE EXCEPTION 'Connection unavailable' USING ERRCODE='42501'; END IF;
    INSERT INTO public.peer_message_limits(user_id,window_start,sends)
      VALUES(NEW.sender_id,clock_timestamp(),1)
      ON CONFLICT(user_id) DO UPDATE SET
        sends=CASE WHEN peer_message_limits.window_start<=clock_timestamp()-interval '1 minute'
          THEN 1 ELSE peer_message_limits.sends+1 END,
        window_start=CASE WHEN peer_message_limits.window_start<=clock_timestamp()-interval '1 minute'
          THEN clock_timestamp() ELSE peer_message_limits.window_start END
      WHERE peer_message_limits.sends<30 OR peer_message_limits.window_start<=clock_timestamp()-interval '1 minute'
      RETURNING sends INTO quota;
    IF quota IS NULL THEN RAISE EXCEPTION 'Message rate exceeded' USING ERRCODE='P0001'; END IF;
    NEW.sent_at:=clock_timestamp();
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER peer_message_lock BEFORE INSERT ON peer_messages FOR EACH ROW EXECUTE FUNCTION lock_peer_accounts();
CREATE TRIGGER peer_block_lock BEFORE INSERT ON blocks FOR EACH ROW EXECUTE FUNCTION lock_peer_accounts();
CREATE TRIGGER peer_card_lock BEFORE INSERT OR UPDATE ON survivor_cards FOR EACH ROW EXECUTE FUNCTION lock_peer_accounts();
CREATE TRIGGER peer_request_lock BEFORE INSERT OR UPDATE ON peer_match_requests FOR EACH ROW EXECUTE FUNCTION lock_peer_accounts();
CREATE TRIGGER peer_role_lock BEFORE INSERT OR UPDATE OR DELETE ON user_roles FOR EACH ROW EXECUTE FUNCTION lock_peer_accounts();
