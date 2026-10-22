-- Account deletion runs through one database-owned entry point. The runtime
-- role receives EXECUTE only, never broad DELETE privileges or admin fallback.
ALTER TABLE deletion_requests DROP CONSTRAINT deletion_requests_status_check;
ALTER TABLE deletion_requests ADD CONSTRAINT deletion_requests_status_check
  CHECK(status IN ('pending_verification','cooling_off','processing','completed','failed','cancelled','legal_hold'));
ALTER TABLE deletion_requests ADD COLUMN failure_reason text;

-- The migrator/schema owner is trusted to define policies; runtime roles are
-- never members of that role. Only this SECURITY DEFINER function uses this
-- owner-only policy. Setting the flag as the runtime role grants no access.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['deletion_requests','notifications','export_requests',
    'imported_records','documents','health_entries','profiles','messages',
    'conversation_members','conversations','consent_records','organization_memberships']
  LOOP
    EXECUTE format('CREATE POLICY deletion_owner_execution ON public.%I TO %I USING (current_setting(''app.deletion_mode'', true) = ''on'') WITH CHECK (current_setting(''app.deletion_mode'', true) = ''on'')', table_name, current_user);
  END LOOP;
END;
$$;

-- Reconcile legacy duplicate requests without losing the strongest hold or
-- shortening the cooling-off interval. Cancelled duplicates remain auditable.
SELECT set_config('app.deletion_mode','on',true);
WITH grouped AS (
  SELECT user_id, (array_agg(id ORDER BY requested_at,id))[1] AS keeper,
         bool_or(legal_hold OR status='legal_hold') AS held,
         max(cooling_off_until) AS until_at
    FROM deletion_requests
   WHERE status IN ('pending_verification','cooling_off','processing','failed','legal_hold')
   GROUP BY user_id HAVING count(*)>1
), updated AS (
  UPDATE deletion_requests d SET legal_hold=g.held,
         cooling_off_until=g.until_at
    FROM grouped g WHERE d.id=g.keeper RETURNING d.id
)
UPDATE deletion_requests d SET status='cancelled'
  FROM grouped g WHERE d.user_id=g.user_id AND d.id<>g.keeper
   AND d.status IN ('pending_verification','cooling_off','processing','failed','legal_hold');
SELECT set_config('app.deletion_mode','off',true);

CREATE UNIQUE INDEX deletion_requests_one_open_per_user
  ON deletion_requests(user_id)
  WHERE status IN ('pending_verification','cooling_off','processing','failed','legal_hold');

CREATE OR REPLACE FUNCTION complete_account_deletion(request_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
DECLARE
  target_user_id uuid;
  request_state text;
  held boolean;
  verified timestamptz;
  due_at timestamptz;
  target_conversations uuid[];
  previous_mode text := current_setting('app.deletion_mode',true);
BEGIN
  PERFORM set_config('app.deletion_mode','on',true);
  SELECT user_id, status, legal_hold, verified_at, cooling_off_until
    INTO target_user_id, request_state, held, verified, due_at
    FROM public.deletion_requests WHERE id=request_id FOR UPDATE;
  IF target_user_id IS NULL OR held OR request_state IN ('cancelled','legal_hold')
     OR (request_state<>'completed' AND (verified IS NULL OR due_at>now())) THEN
    PERFORM set_config('app.deletion_mode',coalesce(previous_mode,''),true);
    RETURN false;
  END IF;
  IF request_state='completed' THEN
    PERFORM set_config('app.deletion_mode',coalesce(previous_mode,''),true);
    RETURN true;
  END IF;

  -- Roll back only destructive work on failure; protected states above never
  -- enter this handler and therefore cannot become retryable failed requests.
  BEGIN

  UPDATE public.deletion_requests SET status='processing',failure_reason=NULL WHERE id=request_id;
  INSERT INTO public.audit_events(event_type,actor_id,subject_id,action_result,metadata)
    VALUES('deletion_started',target_user_id,target_user_id,'success','{}');
  DELETE FROM public.account_tokens WHERE user_id=target_user_id;
  UPDATE public.sessions SET revoked_at=coalesce(revoked_at,now()) WHERE user_id=target_user_id;
  DELETE FROM public.notifications WHERE user_id=target_user_id;
  DELETE FROM public.export_requests WHERE user_id=target_user_id;
  DELETE FROM public.imported_records WHERE user_id=target_user_id;
  UPDATE public.imported_records SET document_id=NULL
   WHERE document_id IN (SELECT id FROM public.documents WHERE owner_id=target_user_id);
  DELETE FROM public.storage_objects WHERE owner_id=target_user_id;
  DELETE FROM public.documents WHERE owner_id=target_user_id;
  DELETE FROM public.health_entries WHERE user_id=target_user_id;
  DELETE FROM public.profiles WHERE user_id=target_user_id;
  DELETE FROM public.match_preferences WHERE user_id=target_user_id;
  DELETE FROM public.matches WHERE patient_id=target_user_id OR mentor_id=target_user_id;
  UPDATE public.reports SET message_id=NULL
   WHERE message_id IN (SELECT id FROM public.messages WHERE sender_id=target_user_id);
  DELETE FROM public.messages WHERE sender_id=target_user_id;
  DELETE FROM public.calls WHERE initiated_by=target_user_id;
  SELECT array_agg(conversation_id) INTO target_conversations
    FROM public.conversation_members WHERE user_id=target_user_id;
  DELETE FROM public.conversation_members WHERE user_id=target_user_id;
  DELETE FROM public.conversations c
    WHERE c.id=ANY(target_conversations)
      AND NOT EXISTS (SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id=c.id)
      AND NOT EXISTS (SELECT 1 FROM public.calls call WHERE call.conversation_id=c.id);
  DELETE FROM public.consent_records WHERE user_id=target_user_id;
  DELETE FROM public.organization_memberships WHERE user_id=target_user_id;
  DELETE FROM public.blocks WHERE blocker_id=target_user_id OR blocked_id=target_user_id;
  UPDATE public.moderation_actions SET report_id=NULL
    WHERE report_id IN (SELECT id FROM public.reports WHERE reporter_id=target_user_id);
  DELETE FROM public.reports WHERE reporter_id=target_user_id;
  DELETE FROM public.mfa_enrollments WHERE user_id=target_user_id;
  UPDATE public.reports SET subject_user_id=NULL WHERE subject_user_id=target_user_id;
  DELETE FROM public.user_roles WHERE user_id=target_user_id;
  UPDATE public.users
     SET email='deleted+'||id::text||'@deleted.invalid',password_hash='deleted-account',
         mfa_secret_ciphertext=NULL,status='deleted',deleted_at=now()
   WHERE id=target_user_id;
  UPDATE public.deletion_requests
     SET status='completed',completed_at=now(),failure_reason=NULL WHERE id=request_id;
  INSERT INTO public.audit_events(event_type,actor_id,subject_id,action_result,metadata)
    VALUES('deletion_completed',target_user_id,target_user_id,'success','{}');
EXCEPTION WHEN OTHERS THEN
  UPDATE public.deletion_requests SET status='failed',failure_reason=left(SQLSTATE,100)
   WHERE id=request_id AND status<>'completed';
  INSERT INTO public.audit_events(event_type,actor_id,subject_id,action_result,metadata)
    SELECT 'deletion_failed',user_id,user_id,'failure',jsonb_build_object('errorCode',SQLSTATE)
      FROM public.deletion_requests WHERE id=request_id;
    PERFORM set_config('app.deletion_mode',coalesce(previous_mode,''),true);
    RETURN false;
  END;
  PERFORM set_config('app.deletion_mode',coalesce(previous_mode,''),true);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION complete_account_deletion(uuid) FROM PUBLIC;
