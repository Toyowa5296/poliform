'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSignup = async () => {
    setIsSubmitting(true)
    setErrorMsg('')
    setMessage('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setErrorMsg('登録に失敗しました: ' + error.message)
      setIsSubmitting(false)
    } else {
      setIsSuccess(true)
      setMessage('登録が完了しました！ログイン画面に移動します...')
      setTimeout(() => {
        router.push('/login')
      }, 1000)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-50 px-4 pt-40">
      <h1 className="text-3xl font-bold text-indigo-600 mb-4">新規登録</h1>

      <div className="w-full max-w-xs space-y-4">
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting || isSuccess}
          className="w-full border px-3 py-2 rounded"
        />
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting || isSuccess}
          className="w-full border px-3 py-2 rounded"
        />
        <button
          onClick={handleSignup}
          disabled={isSubmitting || isSuccess}
          className={`w-full py-2 px-4 rounded text-white font-medium transition ${
            isSubmitting || isSuccess
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          登録
        </button>

        {message && <p className="text-sm text-center text-green-600">{message}</p>}
        {errorMsg && <p className="text-sm text-center text-red-600">{errorMsg}</p>}
      </div>
    </div>
  )
}
