'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import PartyCard from '../../../components/PartyCard'

type Tag = { id: string; name: string }

// Supabaseから直接取得するpartyデータの型を定義
// party_tagがネストされたオブジェクトの配列として返されることを考慮
type PartySupabaseData = {
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
  // Supabaseのselectで指定したエイリアスに合わせてtag: tag_idの形式に
  party_tag: { tag: Tag }[] | null
}

// コンポーネントで使用するParty型 (tagsをフラット化した後)
type Party = Omit<PartySupabaseData, 'party_tag'> & {
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
      const { data: ownParties, error: ownPartiesError } = await supabase
        .from('party')
        .select('id')
        .eq('user_id', user.id)

      if (ownPartiesError) {
        setError('作成した政党の取得に失敗しました: ' + ownPartiesError.message)
        setLoading(false)
        return
      }

      const ownPartyIds = ownParties?.map(p => p.id) || []

      // ✅ party_member から approved 状態の政党IDも取得
      const { data: memberParties, error: memberPartiesError } = await supabase
        .from('party_member')
        .select('party_id')
        .eq('user_id', user.id)
        .eq('status', 'approved')

      if (memberPartiesError) {
        setError('参加政党の取得に失敗しました: ' + memberPartiesError.message)
        setLoading(false)
        return
      }

      const memberPartyIds = memberParties?.map(m => m.party_id) || []

      // ✅ 両方を合体して重複排除
      const allPartyIds = [...new Set([...ownPartyIds, ...memberPartyIds])]

      if (allPartyIds.length === 0) {
        setJoinedParties([])
        setLoading(false)
        return
      }

      // ✅ 対象の party データを取得
      // ここでPartySupabaseData型を適用
      const { data: parties, error: partiesError } = await supabase
        .from('party')
        .select<string, PartySupabaseData>(`
          id, name, slogan, ideology, leader_name, founded_at,
          activity_area, location, website, contact_email, logo_url, user_id,
          party_tag ( tag: tag_id (id, name) ) // tag: tag_id は Supabaseのエイリアス
        `)
        .in('id', allPartyIds)

      if (partiesError) {
        setError('政党詳細情報の取得に失敗しました: ' + partiesError.message)
        setLoading(false)
        return
      }

      // anyを排除し、正確な型推論を利用
      const partiesWithTags: Party[] = (parties || []).map((p) => ({
        ...p,
        tags: p.party_tag?.map((pt) => pt.tag) || [],
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