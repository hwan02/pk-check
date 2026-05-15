-- ===========================================================
-- 014_profiles_rls: profiles 본인 행 접근 정책
--   RLS는 010에서 켜졌으나 SELECT/UPDATE 정책이 없어
--   사용자가 본인 프로필을 읽지/쓰지 못하던 문제 해결
-- ===========================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 본인 프로필 조회 (TopNav 의 role 체크, /mypage, /mypage/profile 등)
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- 본인 프로필 수정 (회원정보 수정 페이지)
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
