import { supabase } from '@/lib/supabase'

export async function logError(
  error: unknown,
  context: string,
  userId?: string,
  metadata?: Record<string, any>
) {
  const message = error instanceof Error ? error.message : String(error)

  // ✅ セッション情報の確認
  const sessionResult = await supabase.auth.getSession()
  const session = sessionResult.data.session

  if (!session) {
    console.warn('[logError] ログインしていないためスキップ')
    return
  }

  const { error: insertError } = await supabase.from('logs').insert([
    {
      user_id: userId ?? session.user.id ?? null,
      level: 'error',
      message,
      context,
      metadata: metadata ?? null,
    },
  ])

  if (insertError) {
    console.error('[logError] ログ保存失敗:', insertError.message)
  } else {
    console.log('[logError] ログ保存成功')
  }
}
