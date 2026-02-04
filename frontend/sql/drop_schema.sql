-- ============================================================
-- スキーマ削除用SQL
-- 全てのテーブル、ポリシー、トリガー、関数を削除します
-- ============================================================

-- 1. トリガーを削除
drop trigger if exists on_auth_user_created on auth.users;

-- 2. 関数を削除
drop function if exists public.handle_new_user();

-- 3. テーブルを削除（依存関係の順序で削除）
-- CASCADE を使用して関連するポリシーも自動削除
drop table if exists plot_cards cascade;
drop table if exists plot_lists cascade;
drop table if exists relationships cascade;
drop table if exists characters cascade;
drop table if exists chapters cascade;
drop table if exists acts cascade;
drop table if exists novels cascade;
drop table if exists profiles cascade;

-- ※ 拡張機能（uuid-ossp, pgcrypto）は他で使われている可能性があるため削除しません
-- 必要であれば以下のコメントを外して実行してください
-- drop extension if exists "uuid-ossp";
-- drop extension if exists "pgcrypto";
