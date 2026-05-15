-- ===========================================================
-- 013_profile_customs: 회원 통관번호 / 기본 배송지
--   - 개인통관고유부호 (P + 12자리)
--   - 한국 기본 배송지 (수령인, 우편번호, 주소, 전화)
-- ===========================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS customs_id_no       text,
  ADD COLUMN IF NOT EXISTS phone               text,
  ADD COLUMN IF NOT EXISTS recipient_name      text,
  ADD COLUMN IF NOT EXISTS postal_code         text,
  ADD COLUMN IF NOT EXISTS address1            text,
  ADD COLUMN IF NOT EXISTS address2            text,
  ADD COLUMN IF NOT EXISTS country             text DEFAULT 'KR';

-- 개인통관고유부호 형식: 대문자 P + 숫자 12자리
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_customs_id_no_format;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_customs_id_no_format
  CHECK (customs_id_no IS NULL OR customs_id_no ~ '^P[0-9]{12}$');

-- 회원가입 시 raw_user_meta_data 의 추가 필드도 profiles 에 함께 저장
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, name, customs_id_no, phone,
    recipient_name, postal_code, address1, address2, country
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'customs_id_no',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'recipient_name',
    NEW.raw_user_meta_data->>'postal_code',
    NEW.raw_user_meta_data->>'address1',
    NEW.raw_user_meta_data->>'address2',
    coalesce(NEW.raw_user_meta_data->>'country', 'KR')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
