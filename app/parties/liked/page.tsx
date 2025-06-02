// src/app/mypage/page.tsx
'use client'

import React from 'react'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import PartyCard from '../../../components/PartyCard'

// 型定義
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
type UserProfile = {
  id: string
  email: string
  name: string
  bio: string | null
  avatar_url?: string | null
  birthplace?: string | null
  x_url?: string | null
  website_url?: string | null
  birthday?: string | null
  is_public?: boolean
  interests?: string[]
}
type PolicyPillar = {
  id: string
  content: string
}

type PartyMember = {
  party_id: string;
  status: string;
};

export default function MyPage() {
  const [ownParties, setOwnParties] = useState<Party[]>([])
  const [likedParties, setLikedParties] = useState<Party[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [formProfile, setFormProfile] = useState({ name: '', bio: '', avatar_url: userProfile?.avatar_url || '', })
  const [error, setError] = useState<string | null>(null)

  const [policyPillars, setPolicyPillars] = useState<{ [partyId: string]: PolicyPillar[] }>({})

  const [availableTags, setAvailableTags] = useState<{ id: string; name: string; category?: string | null }[]>([])
  const [selectedTagMap, setSelectedTagMap] = useState<{ [partyId: string]: string[] }>({})
  const [showTags, setShowTags] = useState<boolean>(false)
  const [partyMembers, setPartyMembers] = useState<{ [partyId: string]: PartyMember[] }>({})

  const [loading, setLoading] = useState(true)

  const fetchPolicyPillars = async (partyId: string) => {
    const { data } = await supabase.from('policy_pillar').select('id, content').eq('party_id', partyId)
    if (data) {
      setPolicyPillars((prev) => ({ ...prev, [partyId]: data }))
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('ログインが必要です')
        return
      }

      const { data: profile } = await supabase
        .from('user_profile')
        .select('id, email, name, bio, avatar_url, birthplace, x_url, website_url, birthday, is_public, interests')
        .eq('id', user.id)
        .single()
      setUserProfile(profile)
      setFormProfile({
        name: profile?.name || '',
        bio: profile?.bio || '',
        avatar_url: profile?.avatar_url || '',
        birthplace: profile?.birthplace || '',
        x_url: profile?.x_url || '',
        website_url: profile?.website_url || '',
        birthday: profile?.birthday || '',
        is_public: profile?.is_public ?? true,
        interests: profile?.interests || [],
      })

      const { data: own } = await supabase
        .from('party')
        .select(`
          id,
          name,
          slogan,
          ideology,
          leader_name,
          founded_at,
          activity_area,
          location,
          website,
          contact_email,
          logo_url,
          user_id,
          activities,
          activities_url,
          party_tag ( tag: tag_id (id, name) )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const { data: tagsData } = await supabase.from('tag').select('id, name, category')
      if (tagsData) setAvailableTags(tagsData)

      // ✅ 先に ownWithTags を定義
      const ownWithTags = (own || []).map((p: any) => ({
        ...p,
        tags: p.party_tag?.map((pt: any) => pt.tag) || [],
      }))
      setOwnParties(ownWithTags)

      // ✅ その後に tagMap を作る
      const tagMap: { [partyId: string]: string[] } = {}
      ownWithTags.forEach(p => {
        tagMap[p.id] = p.tags?.map(t => t.id) || []
      })
      setSelectedTagMap(tagMap)

      for (const p of ownWithTags) fetchPolicyPillars(p.id)

      const { data: likes } = await supabase
      .from('likes')
      .select(`
        party (
          id,
          name,
          slogan,
          ideology,
          leader_name,
          founded_at,
          activity_area,
          location,
          website,
          contact_email,
          logo_url,
          user_id,
          party_tag ( tag: tag_id (id, name) )
        )
      `)
      .eq('user_id', user.id)

      const likedWithTags = (likes || [])
        .map((item) => {
          const party = item.party
          if (!party) return null
          return {
            ...party,
            tags: party.party_tag?.map((pt: any) => pt.tag) || [],
          }
        })
        .filter((p): p is Party => p !== null)

      setLikedParties(likedWithTags)
      setLoading(false)

      const { data: membersData, error: membersError } = await supabase
        .from('party_member')
        .select('party_id, status')
        .in('party_id', ownWithTags.map(p => p.id))

      if (membersError) {
        console.error('メンバー情報の取得エラー:', membersError.message)
      }

      if (membersData) {
        const membersMap: { [partyId: string]: { status: string }[] } = {}
        for (const m of membersData) {
          console.log('member row:', m)
          if (!m.party_id || !m.status) continue
          if (!membersMap[m.party_id]) membersMap[m.party_id] = []
          membersMap[m.party_id].push({ status: m.status })
        }
        setPartyMembers(membersMap)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10">
      {/* 支持中の政党一覧 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">支持中の政党一覧</h2>

        {loading && <p className="text-gray-500">読み込み中...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && likedParties.length === 0 && (
          <p className="text-gray-500">支持中の政党はありません。</p>
        )}

        {!loading && likedParties.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {likedParties.map((party) => (
              <PartyCard
                key={party.id}
                party={party}
                tags={party.tags || []}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}