'use client'

import { logError } from '../utils/logError'

export default function TestLogButton() {
  const handleTestLog = async () => {
    console.log('🟡 テストログ送信クリック')

    try {
      await logError(
        new Error('テストログ成功'),
        'test.manual',
        undefined,
        { example: 'button_test' }
      )
      alert('✅ logError 実行完了！（Supabaseの logs を確認）')
    } catch (e) {
      console.error('❌ テストログ送信中に失敗:', e)
      alert('❌ テストログ送信に失敗しました')
    }
  }

  return (
    <button
      onClick={handleTestLog}
      className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
    >
      テストログ送信
    </button>
  )
}
