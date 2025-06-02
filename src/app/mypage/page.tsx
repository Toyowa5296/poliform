// src/app/mypage/page.tsx
'use client'

import React from 'react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import PartyCard from '@/components/PartyCard'

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

  const fetchPolicyPillars = async (partyId: string) => {
    const { data } = await supabase.from('policy_pillar').select('id, content').eq('party_id', partyId)
    if (data) {
      setPolicyPillars((prev) => ({ ...prev, [partyId]: data }))
    }
  }

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

      // ✅ その後に tagMap を作る
      const tagMap: { [partyId: string]: string[] } = {}
      ownWithTags.forEach(p => {
        tagMap[p.id] = p.tags?.map(t => t.id) || []
      })
      setSelectedTagMap(tagMap)

      for (const p of ownWithTags) fetchPolicyPillars(p.id)

      const { data: likes } = await supabase
        .from('likes')
        .select('party (id, name, slogan, ideology, user_id)')
        .eq('user_id', user.id)

      const liked = (likes || []).map((item) => item.party).filter((p): p is Party => p !== null)
      setLikedParties(liked)

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
      .select('status, user_profile: user_id (id, name, avatar_url, bio)')
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
      const profiles = data.map((entry) => entry.user_profile)
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
    <div className="max-w-3xl mx-auto p-6 space-y-10">
      {successMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded shadow-lg z-[9999]">
          {successMessage}
        </div>
      )}
      {/* ユーザー情報 */}
      {userProfile && (
        <div>
          <h2 className="text-xl font-semibold mb-2">ユーザー情報</h2>
          <div className={`border p-4 rounded-lg shadow-md ${editingProfile ? 'bg-gray-50' : 'bg-white'}`}>
            {editingProfile ? (
              <>
                {/* アイコン画像アップロード + プレビュー + 削除 */}
                <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-800 mb-1">アイコン画像</label>

                <div className="relative inline-block w-24 h-24 mb-2 group">
                  <label htmlFor="avatarInput" className="cursor-pointer">
                    {formProfile.avatar_url ? (
                      <img
                        src={formProfile.avatar_url}
                        alt="アイコンプレビュー"
                        className="w-24 h-24 rounded-full border object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center text-white text-3xl font-semibold border">
                        {formProfile.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}

                    {/* 🖋️ 編集バッジ（hover時表示） */}
                    <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs">🖋️ 編集</span>
                    </div>
                  </label>

                  {formProfile.avatar_url && (
                    <button
                      type="button"
                      onClick={() => setFormProfile({ ...formProfile, avatar_url: '' })}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center shadow hover:scale-110 transition-transform"
                      title="削除"
                    >
                      ✖
                    </button>
                  )}
                </div>

                <input
                  id="avatarInput"
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const previewUrl = reader.result as string;
                      setFormProfile((prev) => ({ ...prev, avatar_url: previewUrl }));
                    };
                    reader.readAsDataURL(file);

                    const fileExt = file.name.split('.').pop();
                    const fileName = `${crypto.randomUUID()}.${fileExt}`;
                    const { error } = await supabase.storage
                      .from('avatars')
                      .upload(fileName, file);

                    if (!error) {
                      const { data: urlData } = supabase.storage
                        .from('avatars')
                        .getPublicUrl(fileName);
                      const publicUrl = urlData?.publicUrl;
                      if (publicUrl) {
                        setFormProfile((prev) => ({ ...prev, avatar_url: publicUrl }));
                      }
                    } else {
                      alert('アップロードに失敗しました');
                    }
                  }}
                  className="hidden"
                />
              </div>

                {/* その他プロフィール編集項目 */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-800 mb-1">表示名</label>
                  <input
                    type="text"
                    value={formProfile.name}
                    onChange={(e) => setFormProfile({ ...formProfile, name: e.target.value })}
                    className="border p-2 w-full rounded"
                    placeholder="表示名"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-800 mb-1">自己紹介</label>
                  <textarea
                    value={formProfile.bio || ''}
                    onChange={(e) => setFormProfile({ ...formProfile, bio: e.target.value })}
                    className="border p-2 w-full rounded resize-none"
                    placeholder="自己紹介"
                    rows={4}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-800 mb-1">出身地</label>
                  <input
                    type="text"
                    value={formProfile.birthplace || ''}
                    onChange={(e) => setFormProfile({ ...formProfile, birthplace: e.target.value })}
                    className="border p-2 w-full rounded"
                    placeholder="例：大阪府堺市"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-800 mb-1">X（旧Twitter）URL</label>
                  <input
                    type="url"
                    value={formProfile.x_url || ''}
                    onChange={(e) => setFormProfile({ ...formProfile, x_url: e.target.value })}
                    className="border p-2 w-full rounded"
                    placeholder="https://x.com/ユーザー名"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-800 mb-1">個人サイト / ブログ</label>
                  <input
                    type="url"
                    value={formProfile.website_url || ''}
                    onChange={(e) => setFormProfile({ ...formProfile, website_url: e.target.value })}
                    className="border p-2 w-full rounded"
                    placeholder="https://example.com"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-800 mb-1">生年月日</label>
                  <input
                    type="date"
                    value={formProfile.birthday ? formProfile.birthday.slice(0, 10) : ''}
                    onChange={(e) => setFormProfile({ ...formProfile, birthday: e.target.value })}
                    min="1900-01-01"
                    max="2050-12-31"
                    className="border p-2 w-full rounded"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-800 mb-1">政治分野の関心（カンマ区切り）</label>
                  <input
                    type="text"
                    value={(formProfile.interests || []).join(', ')}
                    onChange={(e) =>
                      setFormProfile({
                        ...formProfile,
                        interests: e.target.value.split(',').map((s) => s.trim()),
                      })
                    }
                    className="border p-2 w-full rounded"
                    placeholder="例：環境, 教育, 福祉"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-800 mb-1">プロフィール公開</label>
                  <select
                    value={formProfile.is_public ? 'true' : 'false'}
                    onChange={(e) => setFormProfile({ ...formProfile, is_public: e.target.value === 'true' })}
                    className="border p-2 w-full rounded"
                  >
                    <option value="true">公開する</option>
                    <option value="false">非公開にする</option>
                  </select>
                </div>
                <div className="flex gap-4">
                  <button onClick={handleSaveProfile} className="bg-blue-600 text-white px-4 py-1 rounded">
                    保存
                  </button>
                  <button onClick={() => setEditingProfile(false)} className="text-gray-600">
                    キャンセル
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-base text-gray-800 space-y-2">
                  <div className="mb-4">
                    {userProfile.avatar_url ? (
                      <img
                        src={userProfile.avatar_url}
                        alt="ユーザーアイコン"
                        className="w-24 h-24 rounded-full mb-2 border object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center text-white text-3xl font-semibold border">
                        {userProfile.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <p><strong>表示名：</strong>{userProfile.name}</p>
                  <p><strong>メール：</strong>{userProfile.email}</p>
                  <p><strong>自己紹介：</strong><br />{userProfile.bio || ''}</p>
                  <p><strong>出身地：</strong>{userProfile.birthplace || ''}</p>
                  <p><strong>X：</strong>{userProfile.x_url ? (
                    <a href={userProfile.x_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                      {userProfile.x_url}
                    </a>) : ''}
                  </p>
                  <p><strong>Webサイト：</strong>{userProfile.website_url ? (
                    <a href={userProfile.website_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                      {userProfile.website_url}
                    </a>) : ''}
                  </p>
                  <p><strong>生年月日：</strong>{userProfile.birthday || ''}</p>
                  <p><strong>政治分野の関心：</strong>{userProfile.interests?.length ? userProfile.interests.join(', ') : ''}</p>
                  <p><strong>公開設定：</strong>{userProfile.is_public ? '公開中' : '非公開'}</p>
                </div>
                <div className="mt-2">
                  <button onClick={() => setEditingProfile(true)} className="text-sm text-blue-600 hover:underline">
                    編集する
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}



    </div>
  )
}