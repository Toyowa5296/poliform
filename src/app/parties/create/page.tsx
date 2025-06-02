'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function PartyCreatePage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [slogan, setSlogan] = useState('')
  const [ideology, setIdeology] = useState('')
  const [foundedDate, setFoundedDate] = useState('')
  const [leaderName, setLeaderName] = useState('')
  const [location, setLocation] = useState('')
  const [activityArea, setActivityArea] = useState('')
  const [policyPillars, setPolicyPillars] = useState<string[]>([''])
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [website, setWebsite] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<{ id: string; name: string }[]>([])
  const [activities, setActivities] = useState('')
  const [activitiesUrl, setActivitiesUrl] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])

  // 取得後にカテゴリごとにグループ化
  useEffect(() => {
    const fetchTags = async () => {
      const { data, error } = await supabase.from('tag').select('id, name, category')
      if (!error && data) {
        setAvailableTags(data)
        const allCategories = Array.from(new Set(data.map((tag) => tag.category ?? '未分類')))
        setExpandedCategories(allCategories)  // 初期状態ですべて展開
      }
    }
    fetchTags()
  }, [])

  const handlePolicyPillarChange = (index: number, value: string) => {
    const updated = [...policyPillars]
    updated[index] = value
    setPolicyPillars(updated)
  }

  const addPolicyPillar = () => {
    setPolicyPillars([...policyPillars, ''])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    let logoUrl: string | null = null
    if (logoFile) {
      const fileExt = logoFile.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('party-logos').upload(fileName, logoFile)
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('party-logos').getPublicUrl(fileName)
        logoUrl = publicUrlData?.publicUrl || null
      }
    }

    // 政党作成
    const { data: insertedParty, error: partyError } = await supabase.from('party').insert({
      name,
      slogan,
      ideology,
      founded_at: foundedDate || null,
      leader_name: leaderName || null,
      location: location || null,
      activity_area: activityArea || null,
      logo_url: logoUrl || null,
      website: website || null,
      contact_email: contactEmail || null,
      activities: activities || null,
      activities_url: activitiesUrl || null,
      user_id: user?.id,
    }).select().single()

    if (partyError || !insertedParty) {
      setError(partyError?.message || '政党の作成に失敗しました')
      setLoading(false)
      return
    }

    const newPartyId = insertedParty.id

    // party_role にロール3件追加
    const { error: roleInsertError } = await supabase.from('party_role').insert([
      {
        party_id: newPartyId,
        role_id: 'owner',
        name: '代表',
        description: '政党の代表者',
      },
      {
        party_id: newPartyId,
        role_id: 'manager',
        name: '編集者',
        description: '政策の編集が可能',
      },
      {
        party_id: newPartyId,
        role_id: 'member',
        name: '一般メンバー',
        description: '閲覧・コメントのみ可能',
      },
    ]);

    // 代表ロールのIDを取得
    // 👇 ここで insertedRole を取得して定義する（.maybeSingle() 推奨）
    const { data: insertedRole, error: fetchRoleError } = await supabase
      .from('party_role')
      .select('id')
      .eq('party_id', newPartyId)
      .eq('role_id', 'owner')
      .maybeSingle()

    // チェック
    if (fetchRoleError || !insertedRole) {
      setError(fetchRoleError?.message || '代表ロールの取得に失敗しました')
      setLoading(false)
      return
    }

    // party_member に自分を代表として追加
    const { error: memberError } = await supabase.from('party_member').insert({
      user_id: user.id,
      party_id: newPartyId,
      party_role_id: insertedRole.id,
      status: 'approved'
    })

    if (memberError) {
      setError(memberError.message || 'メンバー登録に失敗しました')
      setLoading(false)
      return
    }

    // タグの関連付け
    for (const tag_id of selectedTagIds) {
      await supabase.from('party_tag').insert({ party_id: newPartyId, tag_id })
    }

    // 政策の柱の登録
    for (const title of policyPillars.filter((p) => p.trim() !== '')) {
      await supabase.from('policy_pillar').insert({ party_id: newPartyId, content: title.trim() })
    }

    setLoading(false)
    router.push('/')
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">政党の新規作成</h1>
      <form onSubmit={handleSubmit} className="space-y-8">

        {/* 政党の概要 */}
        <div className="bg-gray-50 p-4 rounded-md space-y-4">
          <h2 className="text-lg font-semibold mb-2">政党の概要</h2>
          <label className="block font-semibold">政党名<span className="text-red-500"> *</span></label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full border p-2 rounded" />

          <label className="block font-semibold mt-4">スローガン</label>
          <input type="text" value={slogan} onChange={(e) => setSlogan(e.target.value)} className="w-full border p-2 rounded" />

          <label className="block font-semibold mt-4">理念・方針<span className="text-red-500"> *</span></label>
          <textarea value={ideology} onChange={(e) => setIdeology(e.target.value)} required rows={4} className="w-full border p-2 rounded" />
        </div>

        {/* 運営体制・組織 */}
        <div className="bg-gray-50 p-4 rounded-md space-y-4">
          <h2 className="text-lg font-semibold mb-2">運営体制・組織</h2>
          <label className="block font-semibold">政党ロゴ</label>
          {/* ロゴ表示 & 削除 */}
          <div className="relative inline-block w-24 h-24 mb-2 group">
            <label htmlFor="logoInput" className="cursor-pointer">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="ロゴプレビュー"
                  className="w-24 h-24 rounded-full border object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center text-white text-3xl font-semibold border">
                  {name?.charAt(0).toUpperCase() || "?"}
                </div>
              )}
              {/* 🖋️ 編集バッジ（ホバー時） */}
              <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs">🖋️ 編集</span>
              </div>
            </label>

            {logoPreview && (
              <button
                type="button"
                onClick={() => {
                  setLogoFile(null)
                  setLogoPreview(null)
                }}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center shadow hover:scale-110 transition-transform"
                title="削除"
              >
                ✖
              </button>
            )}
          </div>

          <input
            id="logoInput"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              setLogoFile(file || null)
              if (file) {
                const reader = new FileReader()
                reader.onloadend = () => setLogoPreview(reader.result as string)
                reader.readAsDataURL(file)
              } else {
                setLogoPreview(null)
              }
            }}
            className="hidden"
          />

          <label className="block font-semibold">設立年月日（1970〜2050）</label>
          <input type="date" value={foundedDate} onChange={(e) => setFoundedDate(e.target.value)} min="1970-01-01" max="2050-12-31" className="w-full border p-2 rounded" />

          <label className="block font-semibold mt-4">代表者名</label>
          <input type="text" value={leaderName} onChange={(e) => setLeaderName(e.target.value)} className="w-full border p-2 rounded" />

          <label className="block font-semibold mt-4">所在地</label>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full border p-2 rounded" />

          <label className="block font-semibold mt-4">活動エリア</label>
          <input type="text" value={activityArea} onChange={(e) => setActivityArea(e.target.value)} placeholder="例：全国、関東、オンライン、バーチャル空間など" className="w-full border p-2 rounded" />
        </div>

        {/* 政策・ビジョン */}
        <div className="bg-gray-50 p-4 rounded-md space-y-4">
          <h2 className="text-lg font-semibold mb-2">政策・ビジョン</h2>
          <label className="block font-semibold mt-4">政策の柱（複数可）</label>
          {policyPillars.map((pillar, idx) => (
            <input key={idx} type="text" value={pillar} onChange={(e) => handlePolicyPillarChange(idx, e.target.value)} className="w-full border p-2 rounded mb-2" />
          ))}
          <button type="button" onClick={addPolicyPillar} className="text-sm text-blue-600 underline">＋項目を追加</button>
        </div>
        
        {/* 公開情報 */}
        <div className="bg-gray-50 p-4 rounded-md space-y-4">
          <h2 className="text-lg font-semibold mb-2">公開情報</h2>
          <label className="block font-semibold mt-4">Webサイト</label>
          <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" className="w-full border p-2 rounded" />

          <label className="block font-semibold mt-4">連絡先メールアドレス</label>
          <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="info@example.com" className="w-full border p-2 rounded" />

                    <label className="block font-semibold">活動内容</label>
          <textarea
            value={activities}
            onChange={(e) => setActivities(e.target.value)}
            placeholder="例：街頭演説、地域清掃、ボランティアイベントなど"
            className="w-full border p-2 rounded"
            rows={4}
          />

          <label className="block font-semibold">活動内容のURL</label>
          <input
            type="url"
            value={activitiesUrl}
            onChange={(e) => setActivitiesUrl(e.target.value)}
            placeholder="https://example.com/activities"
            className="w-full border p-2 rounded"
          />
        </div>

        {/* その他（タグ） */}
        <div className="bg-gray-50 p-4 rounded-md space-y-4">
          <h2 className="text-lg font-semibold mb-2">タグ（複数選択可）</h2>
          {Object.entries(
            availableTags.reduce((acc, tag) => {
              const category = tag.category || '未分類'
              if (!acc[category]) acc[category] = []
              acc[category].push(tag)
              return acc
            }, {} as { [category: string]: { id: string; name: string }[] })
          ).map(([category, tags]) => (
            <div key={category} className="mb-4 border border-gray-200 rounded p-2">
              <h3 className="font-semibold text-sm text-gray-700 mb-2">{category}</h3>
              <div className="grid grid-cols-3 gap-2">
                {tags.map((tag) => (
                  <label key={tag.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      value={tag.id}
                      checked={selectedTagIds.includes(tag.id)}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setSelectedTagIds((prev) =>
                          checked ? [...prev, tag.id] : prev.filter((id) => id !== tag.id)
                        )
                      }}
                      className="accent-blue-600"
                    />
                    <span>{tag.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
          {loading ? '作成中...' : '作成する'}
        </button>

        {error && <p className="text-red-600 mt-2">❌ {error}</p>}
      </form>
    </div>
  )
}
