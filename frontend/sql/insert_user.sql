-- パスワードハッシュ化用の拡張機能を有効化
create extension if not exists "pgcrypto";

DO $$
DECLARE
  -- ▼▼▼ ここを自分の情報に書き換えてください ▼▼▼
  my_email text := 'yuuki1327@gmail.com';
  my_password text := 'aotyaff6khsora';
  my_name text := 'aotya';
  -- ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

  -- IDをここで先に生成して変数に入れる（重要）
  new_user_id uuid := uuid_generate_v4();
BEGIN
  -- 【強制削除】管理画面でエラーが出ても、SQLなら強制的に消せます
  -- 紐付いているプロフィールや小説データも（CASCADE設定があれば）一緒に消えます
  DELETE FROM auth.users WHERE email = my_email;

  -- 1. auth.users にユーザーを追加
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id, -- 変数に入れたIDを使う
    'authenticated',
    'authenticated',
    my_email,
    -- 【重要】コストを '10' に指定してハッシュ化（Supabaseの標準設定に合わせる）
    crypt(my_password, gen_salt('bf', 10)),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', my_name), -- プロフィール用データ
    now(),
    now(),
    '',
    '',
    false
  );

  -- 2. auth.identities にも情報を追加（ログインの整合性のため必須）
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    new_user_id, -- identityとしてのID
    new_user_id, -- 紐付けるユーザーID
    jsonb_build_object('sub', new_user_id, 'email', my_email),
    'email',
    new_user_id::text,
    now(),
    now(),
    now()
  );
  
  -- ※ public.profiles への追加は、作成済みのトリガーが自動で行うので不要です
  
END $$;