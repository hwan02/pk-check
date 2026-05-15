-- ===========================================================
-- 015_support_chat: 주문 문의 / 1:1 채팅
--   - 회원 ↔ 운영자 간 스레드 + 메시지
--   - 특정 주문에 묶인 문의 + 일반 문의 모두 지원
-- ===========================================================

CREATE TABLE IF NOT EXISTS support_threads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id          uuid REFERENCES orders(id) ON DELETE SET NULL,
  subject           text NOT NULL,
  status            text NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'answered', 'closed')),
  customer_unread   integer NOT NULL DEFAULT 0,   -- 회원이 못 본 운영자 답변 수
  admin_unread      integer NOT NULL DEFAULT 1,   -- 운영자가 못 본 회원 메시지 수 (생성 시 1)
  last_message_at   timestamptz DEFAULT now(),
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_threads_user      ON support_threads (user_id);
CREATE INDEX IF NOT EXISTS idx_support_threads_order     ON support_threads (order_id);
CREATE INDEX IF NOT EXISTS idx_support_threads_lastmsg   ON support_threads (last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_threads_admin_un  ON support_threads (admin_unread) WHERE admin_unread > 0;

CREATE TABLE IF NOT EXISTS support_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id    uuid NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
  sender_role  text NOT NULL CHECK (sender_role IN ('customer', 'admin')),
  sender_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body         text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_thread ON support_messages (thread_id, created_at);

-- 메시지 INSERT 시 thread.last_message_at / 카운터 갱신
CREATE OR REPLACE FUNCTION public.bump_support_thread()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.sender_role = 'customer' THEN
    UPDATE support_threads
       SET last_message_at = NEW.created_at,
           admin_unread = admin_unread + 1,
           status = CASE WHEN status = 'closed' THEN 'open' ELSE status END
     WHERE id = NEW.thread_id;
  ELSE
    UPDATE support_threads
       SET last_message_at = NEW.created_at,
           customer_unread = customer_unread + 1,
           status = 'answered'
     WHERE id = NEW.thread_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_bump_support_thread ON support_messages;
CREATE TRIGGER trg_bump_support_thread
  AFTER INSERT ON support_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_support_thread();

-- RLS
ALTER TABLE support_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- 본인 스레드 조회/수정
DROP POLICY IF EXISTS "threads_select_own" ON support_threads;
CREATE POLICY "threads_select_own" ON support_threads
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "threads_insert_own" ON support_threads;
CREATE POLICY "threads_insert_own" ON support_threads
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "threads_update_admin" ON support_threads;
CREATE POLICY "threads_update_admin" ON support_threads
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- 메시지: 본인 스레드의 메시지만 조회 / 본인 스레드에만 customer 메시지 작성 (admin은 어느 스레드든 가능)
DROP POLICY IF EXISTS "messages_select_own_thread" ON support_messages;
CREATE POLICY "messages_select_own_thread" ON support_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_threads t
      WHERE t.id = thread_id
        AND (
          t.user_id = auth.uid()
          OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        )
    )
  );

DROP POLICY IF EXISTS "messages_insert" ON support_messages;
CREATE POLICY "messages_insert" ON support_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_threads t
      WHERE t.id = thread_id
        AND (
          (sender_role = 'customer' AND t.user_id = auth.uid())
          OR (sender_role = 'admin'
              AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
        )
    )
  );
