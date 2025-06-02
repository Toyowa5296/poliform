'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import PartyCard from '@/components/PartyCard'

type Tag = { id: string; name: string }

type Party = {
  id: string
  name: string
  slogan: string | null
  ideology: string
  leader_name?: string | null
  founded_at?: string | null
  activity_area?: string | null
  location?: string | null
  website?: string | null
  contact_email?: string | null
  logo_url?: string | null
  user_id: string
  tags?: Tag[]
}

export default function JoinedPartiesPage() {
  const [joinedParties, setJoinedParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchJoinedParties = async () => {
      setLoading(true)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('ログイン情報の取得に失敗しました')
        setLoading(false)
        return
      }

      // ✅ 自分が作成した政党を取得
      const { data: ownParties } = await supabase
        .from('party')
        .select('id')
        .eq('user_id', user.id)

      const ownPartyIds = ownParties?.map(p => p.id) || []

      // ✅ party_member から approved 状態の政党IDも取得
      const { data: memberParties } = await supabase
        .from('party_member')
        .select('party_id')
        .eq('user_id', user.id)
        .eq('status', 'approved')

      const memberPartyIds = memberParties?.map(m => m.party_id) || []

      // ✅ 両方を合体して重複排除
      const allPartyIds = [...new Set([...ownPartyIds, ...memberPartyIds])]

      if (allPartyIds.length === 0) {
        setJoinedParties([])
        setLoading(false)
        return
      }

      // ✅ 対象の party データを取得
      const { data: parties } = await supabase
        .from('party')
        .select(`
          id, name, slogan, ideology, leader_name, founded_at,
          activity_area, location, website, contact_email, logo_url, user_id,
          party_tag ( tag: tag_id (id, name) )
        `)
        .in('id', allPartyIds)

      const partiesWithTags = (parties || []).map((p: any) => ({
        ...p,
        tags: p.party_tag?.map((pt: any) => pt.tag) || [],
      }))

      setJoinedParties(partiesWithTags)
      setLoading(false)
    }

    fetchJoinedParties()
  }, [])

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h2 className="text-xl font-semibold">参加中の政党一覧</h2>

      {loading && <p className="text-gray-500">読み込み中...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && joinedParties.length === 0 && (
        <p className="text-gray-500">参加中の政党はありません。</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
        {joinedParties.map((party) => (
          <PartyCard
            key={party.id}
            party={party}
            tags={party.tags}
            className="h-full"
          />
        ))}
      </div>
    </div>
  )
}
