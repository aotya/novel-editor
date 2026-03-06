import { createClient } from '@/lib/supabase/server'

/**
 * ログイン済みセッションを取得し、未ログインの場合はエラーを返します。
 * Server Actions内での使用を想定しています。
 */
export async function getRequiredSession() {
  const supabase = await createClient()
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) {
    throw new Error('Unauthorized: ログインが必要です')
  }

  return session
}

