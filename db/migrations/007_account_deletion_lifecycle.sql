-- Account deletion runs through one database-owned entry point. The runtime
-- role receives EXECUTE only, never broad DELETE privileges or admin fallback.
ALTER TABLE deletion_requests DROP CONSTRAINT deletion_requests_status_check;
ALTER TABLE deletion_requests ADD CONSTRAINT deletion_requests_status_check
  CHECK(status IN ('pending_verification','cooling_off','processing','completed','failed','cancelled','legal_hold'));
ALTER TABLE deletion_requests ADD COLUMN failure_reason text;

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
BEGIN
  SELECT user_id, status, legal_hold
    INTO target_user_id, request_state, held
    FROM public.deletion_requests WHERE id=request_id FOR UPDATE;
  IF target_user_id IS NULL THEN RAISE EXCEPTION 'Deletion request not found'; END IF;
  IF request_state='completed' THEN RETURN true; END IF;
  IF held OR request_state IN ('cancelled','legal_hold') THEN
    RAISE EXCEPTION 'Deletion request is not executable';
  END IF;

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
  DELETE FROM public.conversation_members WHERE user_id=target_user_id;
  DELETE FROM public.conversations c
    WHERE NOT EXISTS (SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id=c.id);
  DELETE FROM public.consent_records WHERE user_id=target_user_id;
  DELETE FROM public.organization_memberships WHERE user_id=target_user_id;
  DELETE FROM public.blocks WHERE blocker_id=target_user_id OR blocked_id=target_user_id;
  DELETE FROM public.reports WHERE reporter_id=target_user_id;
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
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  UPDATE public.deletion_requests SET status='failed',failure_reason=left(SQLSTATE,100)
   WHERE id=request_id AND status<>'completed';
  INSERT INTO public.audit_events(event_type,actor_id,subject_id,action_result,metadata)
    SELECT 'deletion_failed',user_id,user_id,'failure',jsonb_build_object('errorCode',SQLSTATE)
      FROM public.deletion_requests WHERE id=request_id;
  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION complete_account_deletion(uuid) FROM PUBLIC;
