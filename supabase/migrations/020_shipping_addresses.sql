-- ===========================================================
-- 020_shipping_addresses: 다중 배송지 + 주 배송지 설정
--   - 회원당 여러 배송지 등록 가능
--   - 한 회원당 정확히 하나의 default 배송지
--   - 기존 profiles 의 주소 1건을 자동 백필
-- ===========================================================

CREATE TABLE IF NOT EXISTS shipping_addresses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label           text,                                 -- "집", "회사" 등 별칭
  recipient_name  text NOT NULL,
  phone           text,
  country         text NOT NULL DEFAULT 'KR',
  postal_code     text NOT NULL,
  address1        text NOT NULL,
  address2        text,
  is_default      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipping_addresses_user
  ON shipping_addresses (user_id, created_at DESC);

-- 한 회원당 default 는 최대 1개
CREATE UNIQUE INDEX IF NOT EXISTS idx_shipping_addresses_one_default
  ON shipping_addresses (user_id) WHERE is_default;

-- 다른 default 가 들어오면 기존 default 를 자동으로 해제
CREATE OR REPLACE FUNCTION public.shipping_addresses_enforce_single_default()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE shipping_addresses
       SET is_default = false
     WHERE user_id = NEW.user_id
       AND id <> NEW.id
       AND is_default = true;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS shipping_addresses_single_default ON shipping_addresses;
CREATE TRIGGER shipping_addresses_single_default
  BEFORE INSERT OR UPDATE OF is_default ON shipping_addresses
  FOR EACH ROW
  WHEN (NEW.is_default IS TRUE)
  EXECUTE FUNCTION public.shipping_addresses_enforce_single_default();

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION public.shipping_addresses_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS shipping_addresses_touch ON shipping_addresses;
CREATE TRIGGER shipping_addresses_touch
  BEFORE UPDATE ON shipping_addresses
  FOR EACH ROW EXECUTE FUNCTION public.shipping_addresses_touch_updated_at();

-- ----- RLS -----
ALTER TABLE shipping_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shipping_addresses_select_own" ON shipping_addresses;
CREATE POLICY "shipping_addresses_select_own" ON shipping_addresses
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "shipping_addresses_insert_own" ON shipping_addresses;
CREATE POLICY "shipping_addresses_insert_own" ON shipping_addresses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "shipping_addresses_update_own" ON shipping_addresses;
CREATE POLICY "shipping_addresses_update_own" ON shipping_addresses
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "shipping_addresses_delete_own" ON shipping_addresses;
CREATE POLICY "shipping_addresses_delete_own" ON shipping_addresses
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ----- 회원가입 트리거 갱신: 가입 시 메타데이터의 배송지 정보가 있으면 shipping_addresses 에도 삽입 -----
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_postal text := NEW.raw_user_meta_data->>'postal_code';
  v_address1 text := NEW.raw_user_meta_data->>'address1';
  v_country text := coalesce(NEW.raw_user_meta_data->>'country', 'KR');
  v_recipient text := coalesce(
    NULLIF(NEW.raw_user_meta_data->>'recipient_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    '수령인'
  );
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
    v_postal,
    v_address1,
    NEW.raw_user_meta_data->>'address2',
    v_country
  )
  ON CONFLICT (id) DO NOTHING;

  IF v_postal IS NOT NULL AND v_postal <> ''
     AND v_address1 IS NOT NULL AND v_address1 <> '' THEN
    INSERT INTO public.shipping_addresses (
      user_id, label, recipient_name, phone, country,
      postal_code, address1, address2, is_default
    )
    VALUES (
      NEW.id,
      '기본 배송지',
      v_recipient,
      NULLIF(NEW.raw_user_meta_data->>'phone', ''),
      v_country,
      v_postal,
      v_address1,
      NULLIF(NEW.raw_user_meta_data->>'address2', ''),
      true
    );
  END IF;

  RETURN NEW;
END; $$;

-- ----- 기존 profiles 의 배송지 1건을 자동 백필 -----
INSERT INTO shipping_addresses (
  user_id, label, recipient_name, phone, country, postal_code, address1, address2, is_default
)
SELECT
  p.id,
  '기본 배송지',
  coalesce(nullif(p.recipient_name, ''), nullif(p.name, ''), '수령인'),
  nullif(p.phone, ''),
  coalesce(nullif(p.country, ''), 'KR'),
  p.postal_code,
  p.address1,
  nullif(p.address2, ''),
  true
FROM profiles p
WHERE p.postal_code IS NOT NULL
  AND p.postal_code <> ''
  AND p.address1 IS NOT NULL
  AND p.address1 <> ''
  AND NOT EXISTS (
    SELECT 1 FROM shipping_addresses sa WHERE sa.user_id = p.id
  );
