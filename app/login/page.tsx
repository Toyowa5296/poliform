'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import { logError } from '../../utils/logError'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const checkLogin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/')
      }
    }

    checkLogin()
  }, [router])

  const redirectTo =
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : 'https://poliform-ten.vercel.app'

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo
      },
    })

    if (error) {
      await logError(error, 'auth.google_login')
      alert('Googleログインに失敗しました: ' + error.message)
    }
  }

  const handleEmailLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMsg(error.message)
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-50 px-4 pt-40">
      <h1 className="text-4xl font-bold text-indigo-600 mb-2">PoliForm</h1>
      <p className="text-gray-600 mb-6">バーチャル政党の世界へようこそ</p>

      {/* Googleログイン */}
      <button
        onClick={handleGoogleLogin}
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded shadow-md transition mb-6"
      >
        Googleでログイン
      </button>

      {/* 区切り線 */}
      <div className="flex items-center w-full max-w-xs mb-4">
        <hr className="flex-grow border-gray-300" />
        <span className="mx-2 text-gray-400 text-sm">または</span>
        <hr className="flex-grow border-gray-300" />
      </div>

      {/* Email＋パスワードログイン */}
      <div className="w-full max-w-xs space-y-4">
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />
        <button
          onClick={handleEmailLogin}
          className="bg-gray-700 hover:bg-gray-800 text-white font-medium py-2 px-4 rounded w-full"
        >
          メールアドレスでログイン
        </button>
        <p className="text-sm mt-4">
          アカウントをお持ちでない方は{' '}
          <a href="/signup" className="text-blue-600 underline">
            新規登録はこちら
          </a>
        </p>
        {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}
      </div>
    </div>
  )
}
