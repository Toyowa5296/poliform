'use client'

import { useEffect, useState } from 'react'
import { useSessionContext } from '@supabase/auth-helpers-react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { logError } from '@/utils/logError'
import { usePathname } from 'next/navigation'

export default function Header() {
  const { session } = useSessionContext()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [showPartyMenu, setShowPartyMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  useEffect(() => {
    const loadUser = async () => {
      console.log('[Header] useEffect triggered')

      if (!session?.user) {
        console.log('[Header] No session or user')
        setIsMounted(true)
        return
      }

      const user = session.user
      console.log('[Header] user retrieved:', user.id, user.email)
      setUserEmail(user.email)

      const { data: profile, error: profileError } = await supabase
        .from('user_profile')
        .select('name, avatar_url')
        .eq('id', user.id)
        .single()

      if (profileError?.code === 'PGRST116') {
        console.log('[Header] profile not found, creating...')

        const { error: insertError } = await supabase.from('user_profile').insert({
          id: user.id,
          name: user.email,
          email: user.email,
          avatar_url: null,
        })

        if (insertError) {
          console.error('[Header] insert failed:', insertError.message)
        } else {
          const { data: newProfile, error: newProfileError } = await supabase
            .from('user_profile')
            .select('name, avatar_url')
            .eq('id', user.id)
            .single()

          if (newProfileError) {
            console.error('[Header] newProfile fetch error:', newProfileError.message)
          }

          setUserName(newProfile?.name ?? null)
          setAvatarUrl(newProfile?.avatar_url ?? null)
        }
      } else if (profile) {
        console.log('[Header] profile found')
        setUserName(profile?.name ?? null)
        setAvatarUrl(profile?.avatar_url ?? null)
      }

      setIsMounted(true)
      console.log('[Header] finished')
    }

    loadUser()
  }, [session])

  if (!isMounted) return null

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      location.href = '/login'
    } catch (error) {
      await logError(error, 'auth.logout', undefined, { email: userEmail })
      alert('ログアウトに失敗しました')
    }
  }

  return (
    <header className="w-full border-b bg-white shadow-sm py-4 px-6 relative z-50">
      <div className="w-full flex justify-between items-center">
        {/* 左ロゴ */}
        <Link href="/" className="text-2xl font-bold text-indigo-600 hover:opacity-80 transition">
          PoliForm
        </Link>

        {/* 右メニュー */}
        <nav className="flex items-center gap-6 text-sm font-medium text-gray-800 relative">
          {userEmail && (
            <>
              {/* ＋ 政党を作成ボタン */}
              <Link
                href="/parties/create"
                className="bg-indigo-600 text-white text-sm px-4 py-1.5 rounded hover:bg-indigo-700 transition"
              >
                政党を作成
              </Link>
              {/* 政党メニュー */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowPartyMenu((prev) => !prev)
                    setShowUserMenu(false)
                  }}
                  className="hover:text-indigo-500 transition"
                >
                  政党管理 ▼
                </button>
                {showPartyMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow z-10">
                    <Link
                      href="/"
                      className="block px-4 py-2 hover:bg-gray-100"
                      onClick={() => setShowPartyMenu(false)}
                    >
                      政党一覧
                    </Link>
                    <Link
                      href="/parties/own"
                      className="block px-4 py-2 hover:bg-gray-100"
                      onClick={() => setShowPartyMenu(false)}
                    >
                      作成した政党
                    </Link>
                    <Link
                      href="/parties/liked"
                      className="block px-4 py-2 hover:bg-gray-100"
                      onClick={() => setShowPartyMenu(false)}
                    >
                      支持中の政党
                    </Link>
                    <Link
                      href="/parties/joined"
                      className="block px-4 py-2 hover:bg-gray-100"
                      onClick={() => setShowPartyMenu(false)}
                    >
                      参加中の政党
                    </Link>
                  </div>
                )}
              </div>

              {/* ユーザーメニュー */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowUserMenu((prev) => !prev)
                    setShowPartyMenu(false)
                  }}
                  className="flex items-center space-x-2 hover:opacity-80 transition"
                >
                  {avatarUrl && (
                    <img
                      src={avatarUrl}
                      alt="ユーザーアイコン"
                      className="w-8 h-8 rounded-full object-cover border"
                    />
                  )}
                  <span className="text-sm font-semibold">{userName ?? 'ユーザー'}</span>
                  <span className="text-sm">▼</span>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow z-10">
                    <Link
                      href="/mypage"
                      className="block px-4 py-2 hover:bg-gray-100"
                      onClick={() => setShowUserMenu(false)}
                    >
                      マイページ
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left text-red-600 px-4 py-2 hover:bg-red-50"
                    >
                      ログアウト
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {!userEmail && !isLoginPage && (
            <Link href="/login" className="text-indigo-600 hover:underline transition">
              ログイン
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
