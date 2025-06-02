'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const syncUserProfile = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error) {
          console.warn('ユーザー取得エラー:', error.message)
          return
        }

        if (user) {
          const { error: upsertError } = await supabase.from('user_profile').upsert({
            id: user.id,
            email: user.email,
          })

          if (upsertError) {
            console.error('user_profile upsert エラー:', upsertError)
          }
        }
      } catch (e) {
        console.warn('ログイン状態でないため、user_profile同期をスキップ')
      }
    }

    syncUserProfile()
  }, [])

  return <>{children}</>
}
