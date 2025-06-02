// src/app/parties/own/page.tsx
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
  activities?: string | null
  activities_url?: string | null 
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

type FormProfile = {
  name: string
  bio: string
  avatar_url?: string
  birthplace?: string
  x_url?: string
  website_url?: string
  birthday?: string
  is_public?: boolean
  interests?: string[]
}

type Like = { party: Party | null }

export default function MyPage() {
  const [ownParties, setOwnParties] = useState<Party[]>([])
  const [likedParties, setLikedParties] = useState<Party[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editingPartyId, setEditingPartyId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    slogan: '',
    ideology: '',
    leader_name: '',
    founded_at: '',
    activity_area: '',
    location: '',
    website: '',
    contact_email: '',
    logo_url: '',
    activities: '',
    activities_url: '',
  })
  const [policyPillars, setPolicyPillars] = useState<{ [partyId: string]: PolicyPillar[] }>({})
  const [newPillar, setNewPillar] = useState<{ [partyId: string]: string }>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState<string>('')

  const [availableTags, setAvailableTags] = useState<{ id: string; name: string; category?: string | null }[]>([])
  const [selectedTagMap, setSelectedTagMap] = useState<{ [partyId: string]: string[] }>({})
  const [showTags, setShowTags] = useState<boolean>(false)
  const [partyMembers, setPartyMembers] = useState<{ [partyId: string]: PartyMember[] }>({})

  const [applicants, setApplicants] = useState<UserProfile[]>([])
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchPolicyPillars = async (partyId: string) => {
    const { data } = await supabase.from('policy_pillar').select('id, content').eq('party_id', partyId)
    if (data) {
      setPolicyPillars((prev) => ({ ...prev, [partyId]: data }))
    }
  }

  const [formProfile, setFormProfile] = useState<FormProfile>({
    name: '',
    bio: '',
    avatar_url: '',
    birthplace: '',
    x_url: '',
    website_url: '',
    birthday: '',
    is_public: true,
    interests: [],
  })

  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject';
    userId: string;
  } | null>(null);

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
      setLoading(false)

      // ✅ その後に tagMap を作る
      const tagMap: { [partyId: string]: string[] } = {}
      ownWithTags.forEach(p => {
        tagMap[p.id] = p.tags?.map((t: Tag) => t.id) || []
      })
      setSelectedTagMap(tagMap)

      for (const p of ownWithTags) fetchPolicyPillars(p.id)

      const { data: likesRaw } = await supabase
        .from('likes')
        .select('party(*)')
        .eq('user_id', user.id)

      const likes = (likesRaw ?? []) as unknown as Like[]

      const liked = likes
        .map((item) => item.party)
        .filter((p): p is Party => p !== null)

      setLikedParties(liked)

      const { data: membersData, error: membersError } = await supabase
        .from('party_member')
        .select('party_id, status')
        .in('party_id', ownWithTags.map(p => p.id))

      if (membersError) {
        console.error('メンバー情報の取得エラー:', membersError.message)
      }

      if (membersData) {
        const membersMap: { [partyId: string]: PartyMember[] } = {}
        for (const m of membersData) {
          if (!m.party_id || !m.status) continue
          if (!membersMap[m.party_id]) membersMap[m.party_id] = []
          membersMap[m.party_id].push({
            party_id: m.party_id,
            status: m.status,
          })
        }
        setPartyMembers(membersMap)
      }
    }

    fetchData()
  }, [])

  const handleSaveProfile = async () => {
    if (!userProfile) return;

    const { error } = await supabase
      .from('user_profile')
      .update({
        name: formProfile.name,
        bio: formProfile.bio,
        avatar_url: formProfile.avatar_url,
        birthplace: formProfile.birthplace,
        x_url: formProfile.x_url,
        website_url: formProfile.website_url,
        birthday: formProfile.birthday === '' ? null : formProfile.birthday,
        is_public: formProfile.is_public,
        interests: formProfile.interests,
      })
      .eq('id', userProfile.id); 

    if (!error) {
      setUserProfile({ ...userProfile, ...formProfile });
      setEditingProfile(false);
    } else {
      console.error('プロフィールの更新に失敗しました:', error?.message || error);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = window.confirm('この政党を削除しますか？')
    if (!ok) return
    await supabase.from('party').delete().eq('id', id)
    setOwnParties((prev) => prev.filter((p) => p.id !== id))
  }

  const handleSave = async () => {
    if (editingId !== null) {
      alert('編集中の「政策の柱」があります。保存またはキャンセルしてください。')
      return
    }
    if (!editingPartyId) return
    await supabase.from('party').update(form).eq('id', editingPartyId)
    // タグの保存処理
    if (editingPartyId) {
      await supabase.from('party_tag').delete().eq('party_id', editingPartyId)
      const selected = selectedTagMap[editingPartyId] || []
      for (const tag_id of selected) {
        await supabase.from('party_tag').insert({ party_id: editingPartyId, tag_id })
      }
    }
    setOwnParties((prev) =>
      prev.map((p) =>
        p.id === editingPartyId
          ? {
              ...p,
              ...form,
              tags: availableTags.filter(tag =>
                selectedTagMap[editingPartyId]?.includes(tag.id)
              ),
            }
          : p
      )
    )
    setEditingPartyId(null)
  }

  const handleAddPillar = async (partyId: string) => {
    const content = newPillar[partyId]?.trim()
    if (!content) return
    const { error } = await supabase.from('policy_pillar').insert({ party_id: partyId, content })
    if (!error) {
      setNewPillar((prev) => ({ ...prev, [partyId]: '' }))
      fetchPolicyPillars(partyId)
    }
  }

  const handleClickApplicants = async (partyId: string) => {
    setSelectedPartyId(partyId)
    setShowModal(true)

    const { data, error } = await supabase
      .from('party_member')
      .select('status, user_profile: user_id (id, name, avatar_url, bio, email)')
      .eq('party_id', partyId)
      .in('status', ['pending'])

    console.log('party_member rows:', data)
    console.log('更新結果:', data, error);

    if (error) {
      console.error('申請者の取得に失敗:', error)
      setApplicants([])
      return
    }

    if (data) {
      const profiles = data.map((entry) =>
        Array.isArray(entry.user_profile) ? entry.user_profile[0] : entry.user_profile
      )
      setApplicants(profiles)
    }
  }

  const handleApprove = async (userId: string) => {
    if (!selectedPartyId) return;
    // ① 一般メンバーの役職IDを取得
    const { data: roleData, error: roleError } = await supabase
      .from('party_role')
      .select('id')
      .eq('party_id', selectedPartyId)
      .eq('role_id', 'member')
      .single();

    if (roleError || !roleData) {
      console.error('役職の取得に失敗:', roleError?.message);
      return;
    }

    const partyRoleId = roleData.id;

    const { data: updateResult, error: updateError } = await supabase
      .from('party_member')
      .update({
        status: 'approved',
        party_role_id: partyRoleId,
      })
      .match({ user_id: userId, party_id: selectedPartyId })
      .select(); 

    if (updateError) {
      console.error('更新エラー:', updateError.message)
    } else if (!updateResult || updateResult.length === 0) {
      console.warn('更新対象が見つかりませんでした')
    } else {
      console.log('更新成功:', updateResult)
      setApplicants((prev) => prev.filter((u) => u.id !== userId))
      setSuccessMessage('参加申請を承認しました。')
      setTimeout(() => setSuccessMessage(null), 3000)

      setPartyMembers(prev => {
        const updated = { ...prev }
        if (updated[selectedPartyId]) {
          updated[selectedPartyId] = updated[selectedPartyId].map(m =>
            m.status === 'pending' ? { ...m, status: 'approved' } : m
          )
        }
        return updated
      })
    }
  }

  const handleReject = async (userId: string) => {
    if (!selectedPartyId) return;

    const { error } = await supabase
      .from('party_member')
      .update({ status: 'rejected' })
      .match({ user_id: userId, party_id: selectedPartyId })

    if (error) {
      console.error('却下エラー:', error.message)
    } else {
      setApplicants((prev) => prev.filter((u) => u.id !== userId))
      setSuccessMessage('参加申請を却下しました。')
      setTimeout(() => setSuccessMessage(null), 3000)

      setPartyMembers((prev) => {
        const updated = { ...prev }
        if (updated[selectedPartyId]) {
          // 却下されたユーザーを削除 or 状態だけ更新
          updated[selectedPartyId] = updated[selectedPartyId].filter(m => m.status !== 'pending')
        }
        return updated
      })
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10">
      {successMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded shadow-lg z-[9999]">
          {successMessage}
        </div>
      )}

      {/* 作成した政党一覧 */}
      <div>
        <h2 className="text-2xl font-bold mb-6">作成した政党一覧</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading && (
            <p className="text-gray-500">読み込み中...</p>
          )}
          {!loading && ownParties.length === 0 && (
            <p className="text-gray-500">作成した政党はありません。</p>
          )}
          {ownParties.map((party) => {
            const members = partyMembers[party.id] || []
            const pending = members.filter((m) => m.status === 'pending')
            const approved = members.filter((m) => m.status === 'approved')

            return editingPartyId === party.id ? (
              <div key={party.id} className="border p-4 rounded bg-gray-50 shadow-sm space-y-6">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">ロゴ画像</label>
                    <div className="relative inline-block w-24 h-24 mb-2 group">
                      <label htmlFor="logoInput" className="cursor-pointer">
                        {form.logo_url ? (
                          <img src={form.logo_url} alt="ロゴプレビュー" className="w-24 h-24 rounded-full border object-cover" />
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center text-white text-3xl font-semibold border">
                            {form.name?.charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white text-xs">🖋️ 編集</span>
                        </div>
                      </label>
                      {form.logo_url && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, logo_url: '' })}
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center shadow hover:scale-110 transition-transform"
                          title="削除"
                        >✖</button>
                      )}
                    </div>
                    <input
                      id="logoInput"
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const fileExt = file.name.split('.').pop();
                        const fileName = `${crypto.randomUUID()}.${fileExt}`;
                        const { error } = await supabase.storage.from('party-logos').upload(fileName, file);
                        if (!error) {
                          const { data } = supabase.storage.from('party-logos').getPublicUrl(fileName);
                          if (data?.publicUrl) {
                            setForm((prev) => ({ ...prev, logo_url: data.publicUrl }));
                          }
                        } else {
                          alert('アップロードに失敗しました');
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">政党名</label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border p-2 w-full rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">スローガン</label>
                    <input value={form.slogan} onChange={(e) => setForm({ ...form, slogan: e.target.value })} className="border p-2 w-full rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">理念・方針</label>
                    <textarea value={form.ideology} onChange={(e) => setForm({ ...form, ideology: e.target.value })} className="border p-2 w-full rounded resize-none overflow-hidden" rows={3} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">代表名</label>
                    <input value={form.leader_name} onChange={(e) => setForm({ ...form, leader_name: e.target.value })} className="border p-2 w-full rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">設立日</label>
                    <input type="date" value={form.founded_at || ''} onChange={(e) => setForm({ ...form, founded_at: e.target.value })} className="border p-2 w-full rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">所在地</label>
                    <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="border p-2 w-full rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">活動エリア</label>
                    <input value={form.activity_area} onChange={(e) => setForm({ ...form, activity_area: e.target.value })} className="border p-2 w-full rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">ウェブサイト</label>
                    <input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="border p-2 w-full rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">連絡先メール</label>
                    <input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="border p-2 w-full rounded" />
                  </div>
                  {/* 活動内容（自由入力） */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">活動内容</label>
                    <textarea
                      value={form.activities}
                      onChange={(e) => setForm({ ...form, activities: e.target.value })}
                      className="border p-2 w-full rounded resize-none"
                      placeholder="例：地域猫の保護活動、オンライン政策勉強会など"
                      rows={4}
                    />
                  </div>

                  {/* 活動内容のURL */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">活動内容のURL</label>
                    <input
                      type="url"
                      value={form.activities_url}
                      onChange={(e) => setForm({ ...form, activities_url: e.target.value })}
                      className="border p-2 w-full rounded"
                      placeholder="https://example.com/your-activity"
                    />
                  </div>
                </div>

                {/* 政策の柱 */}
                <div>
                  <h3 className="font-semibold mb-1">政策の柱</h3>
                  <ul className="space-y-2">
                    {(policyPillars[party.id] || []).map((p) => (
                      editingId === p.id ? (
                        <li key={p.id} className="flex gap-2 items-center">
                          <input type="text" value={editContent} onChange={(e) => setEditContent(e.target.value)} className="border px-2 py-1 text-sm rounded w-full" />
                          <button onClick={async () => {
                            if (!editContent.trim() || !editingId) return
                            const { data } = await supabase
                              .from('policy_pillar')
                              .update({ content: editContent.trim() })
                              .eq('id', editingId)
                              .select()
                            if (data && data[0]) {
                              const updated = data[0]
                              setPolicyPillars((prev) => ({
                                ...prev,
                                [party.id]: (prev[party.id] || []).map((pillar) => pillar.id === editingId ? updated : pillar),
                              }))
                              setEditingId(null)
                              setEditContent('')
                            }
                          }} className="bg-blue-600 text-white px-4 py-1 text-sm rounded whitespace-nowrap">更新</button>
                          <button onClick={() => { setEditingId(null); setEditContent('') }} className="border text-gray-600 px-4 py-1 text-sm rounded whitespace-nowrap">キャンセル</button>
                        </li>
                      ) : (
                        <li key={p.id} className="flex items-center justify-between bg-gray-100 p-2 rounded">
                          <span>{p.content}</span>
                          <div className="flex gap-2 text-sm">
                            <button onClick={() => { setEditingId(p.id); setEditContent(p.content) }} className="text-blue-600 hover:underline">✏️ 編集</button>
                            <button onClick={async () => {
                              const confirmed = confirm('削除してよろしいですか？')
                              if (!confirmed) return
                              await supabase.from('policy_pillar').delete().eq('id', p.id)
                              await fetchPolicyPillars(party.id)
                            }} className="text-red-600 hover:underline">× 削除</button>
                          </div>
                        </li>
                      )
                    ))}
                  </ul>
                  <form onSubmit={(e) => { e.preventDefault(); handleAddPillar(party.id) }} className="mt-4 flex gap-2 items-center">
                    <input type="text" value={newPillar[party.id] || ''} onChange={(e) => setNewPillar((prev) => ({ ...prev, [party.id]: e.target.value }))} className="border px-3 py-1.5 text-sm rounded w-full" placeholder="新しい柱を入力" />
                    <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 text-sm rounded min-w-[64px] whitespace-nowrap">追加</button>
                  </form>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setShowTags(!showTags)}
                    className="text-sm font-semibold mb-2 text-left w-full text-gray-800"
                  >
                    {showTags ? '▼ タグ' : '▶ タグ'}
                  </button>

                  {showTags && (
                    <div className="space-y-2">
                      {Object.entries(
                        availableTags.reduce((acc, tag) => {
                          const category = tag.category || '未分類'
                          if (!acc[category]) acc[category] = []
                          acc[category].push(tag)
                          return acc
                        }, {} as { [category: string]: { id: string; name: string }[] })
                      ).map(([category, tags]) => (
                        <div key={category} className="mb-4 border border-gray-200 rounded p-2">
                          <h4 className="font-semibold mb-2">{category}</h4>
                          <div className="grid grid-cols-3 gap-2">
                            {tags.map(tag => (
                              <label key={tag.id} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={selectedTagMap[party.id]?.includes(tag.id) || false}
                                  onChange={(e) => {
                                    const checked = e.target.checked
                                    setSelectedTagMap(prev => {
                                      const prevTags = prev[party.id] || []
                                      const newTags = checked
                                        ? [...prevTags, tag.id]
                                        : prevTags.filter(id => id !== tag.id)
                                      return { ...prev, [party.id]: newTags }
                                    })
                                  }}
                                />
                                <span>{tag.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded">保存</button>
                  <button onClick={() => setEditingPartyId(null)} className="text-gray-600">キャンセル</button>
                </div>
              </div>
            ) : (
              <React.Fragment key={party.id}>
                <PartyCard
                  party={party}
                  tags={party.tags}
                  showSupportButton={false}
                  pendingCount={pending.length} 
                  onClickApplicants={handleClickApplicants}
                  onDelete={() => handleDelete(party.id)}
                  onEdit={() => {
                    setEditingPartyId(party.id)
                    setForm({
                      name: party.name,
                      slogan: party.slogan || '',
                      ideology: party.ideology,
                      leader_name: party.leader_name || '',
                      founded_at: party.founded_at || '',
                      activity_area: party.activity_area || '',
                      location: party.location || '',
                      website: party.website || '',
                      contact_email: party.contact_email || '',
                      logo_url: party.logo_url || '',
                      activities: party.activities || '',
                      activities_url: party.activities_url || '',
                    })
                  }}
                />
              </React.Fragment>
            )
          })}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl">
                <h2 className="text-xl font-bold mb-6 border-b pb-2 text-gray-800">申請者一覧</h2>

                {applicants.length === 0 ? (
                  <p className="text-gray-500 text-center">現在申請中のユーザーはいません。</p>
                ) : (
                  <ul className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {applicants.map((user) => (
                      <li
                        key={user.id}
                        className="flex items-start gap-4 bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm"
                      >
                        {/* ユーザーアイコン */}
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={`${user.name}のアイコン`}
                            className="w-14 h-14 rounded-full object-cover border"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-gray-300 rounded-full" />
                        )}

                        {/* ユーザー情報 */}
                        <div className="flex-1">
                          <div className="text-base font-semibold text-gray-900">{user.name}</div>
                          {user.bio && (
                            <div className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{user.bio}</div>
                          )}
                        </div>

                        {/* 承認/却下ボタン */}
                        <div className="flex flex-col justify-center items-center gap-2 self-center">
                          <button
                            onClick={() => setConfirmAction({ type: 'approve', userId: user.id })}
                            className="text-sm text-white bg-blue-600 hover:bg-blue-700 rounded px-3 py-1"
                          >
                            承認
                          </button>
                          <button
                            onClick={() => setConfirmAction({ type: 'reject', userId: user.id })}
                            className="text-sm text-white bg-red-500 hover:bg-red-600 rounded px-3 py-1"
                          >
                            却下
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {/* 閉じるボタン */}
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => {
                      setShowModal(false)
                      setSelectedPartyId(null)
                    }}
                    className="px-6 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                  >
                    閉じる
                  </button>
                </div>
                {confirmAction && (
                  <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
                    <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm animate-fade-in">
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="text-3xl"></div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          {confirmAction.type === 'approve'
                            ? 'このユーザーを承認しますか？'
                            : 'このユーザーを却下しますか？'}
                        </h3>
                        <div className="flex gap-4 mt-4">
                          <button
                            onClick={() => {
                              if (confirmAction.type === 'approve') {
                                handleApprove(confirmAction.userId)
                              } else {
                                handleReject(confirmAction.userId)
                              }
                              setConfirmAction(null)
                            }}
                            className={`px-5 py-2 rounded-md text-sm font-medium shadow transition 
                              ${confirmAction.type === 'approve'
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-red-500 text-white hover:bg-red-600'}`}
                          >
                            {confirmAction.type === 'approve' ? '承認する' : '却下する'}
                          </button>
                          <button
                            onClick={() => setConfirmAction(null)}
                            className="px-5 py-2 rounded-md text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}