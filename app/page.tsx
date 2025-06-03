'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PartyCard from '../components/PartyCard'

// 型定義
type Tag = { id: string; name: string }

// Supabaseから取得する party_tag テーブルの結合型
// party_tag は tag テーブルと結合されており、tag オブジェクトを持つ
type PartyTagJoin = {
  tag: Tag // tag テーブルのデータがここに格納される
}

// Supabaseから取得する Party の生データ型
// select クエリで取得されるカラムとネストされた構造を正確に反映
type PartyFromSupabase = {
  id: string
  name: string
  slogan: string | null
  ideology: string
  user_id: string
  logo_url?: string | null // logo_url は null の可能性もあるため、null を追加
  leader_name: string | null // leader_name も null の可能性を考慮
  activity_area: string | null // activity_area も null の可能性を考慮
  founded_at: string | null // founded_at も null の可能性を考慮
  party_tag: PartyTagJoin[] // party_tag は PartyTagJoin の配列
}

// 最終的に表示する Party の型
// Supabaseから取得したデータに supportCount や isLikedByUser などの追加情報が付与される
type Party = {
  id: string
  name: string
  slogan: string | null
  ideology: string
  user_id: string
  logo_url?: string | null
  tags?: Tag[]
  user_name?: string
  supportCount?: number
  isLikedByUser?: boolean
  leader_name?: string | null
  activity_area?: string | null
  founded_at?: string | null
}

// user_profile の型定義を追加
type UserProfile = {
  id: string;
  name: string;
}

export default function Page() {
  const [parties, setParties] = useState<Party[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [keyword, setKeyword] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // ログインユーザー情報取得
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
    }
    fetchUser()
  }, [])

  // 政党・タグ・支持数・支持済み取得
  const fetchData = async () => {
    setLoading(true)
    setError(null)

    // party テーブルからデータを取得し、型を明示的に指定
    // select メソッドの型推論がうまくいかない場合があるため、unknown を経由してキャスト
    const { data: partyRawData, error: partyErr } = await supabase
      .from('party')
      .select(`
        id, name, slogan, ideology, logo_url, user_id,
        leader_name, activity_area, founded_at,
        party_tag(tag(id, name))
      `)
      .order('created_at', { ascending: false })

    // rawData を PartyFromSupabase[] 型にキャスト
    // Supabaseのselectが返すデータが厳密に型定義と一致しない場合に、
    // TypeScriptに「この型である」と強制するために unknown を経由してキャストします。
    const partyData: PartyFromSupabase[] | null = partyRawData as unknown as PartyFromSupabase[] | null;


    // user_profile テーブルからデータを取得し、型を明示的に指定
    const { data: profilesRaw, error: profileErr } = await supabase
      .from('user_profile')
      .select('id, name'); // <UserProfile> を削除

    // profilesRaw を UserProfile[] 型にキャスト
    const profiles: UserProfile[] | null = profilesRaw as unknown as UserProfile[] | null;

    if (partyErr || profileErr) {
      setError(partyErr?.message || profileErr?.message || 'エラーが発生しました')
      setParties([])
      setLoading(false)
      return
    }

    // 各政党に支持数・支持済みフラグを追加
    // partyData は PartyFromSupabase[] 型として扱われるため、as は不要
    const enrichedParties: Party[] = await Promise.all(
      (partyData || []).map(async (p) => { // p は PartyFromSupabase 型として推論される
        // party_tag の中から tag オブジェクトを抽出し、Tag[] 型に変換
        const tagList = p.party_tag?.map((pt) => pt.tag) || [] // pt は PartyTagJoin 型として推論される
        
        // user_profile からユーザー名を取得、見つからない場合は '匿名'
        const user_name = profiles?.find((u) => u.id === p.user_id)?.name || '匿名' // u は UserProfile 型として推論される

        // 支持数取得
        const { count } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('party_id', p.id)

        // 支持済みチェック
        let isLikedByUser = false
        if (userId) {
          const { data: like } = await supabase
            .from('likes')
            .select('id')
            .eq('party_id', p.id)
            .eq('user_id', userId)
            .single()
          isLikedByUser = !!like
        }

        return {
          ...p, // PartyFromSupabase のプロパティをスプレッド
          tags: tagList,
          user_name,
          supportCount: count || 0,
          isLikedByUser,
        }
      })
    )

    setParties(enrichedParties)

    // タグ一覧セット
    const uniqueTags = new Map<string, Tag>()
    enrichedParties.forEach((p) =>
      p.tags?.forEach((tag) => uniqueTags.set(tag.id, tag))
    )
    setAllTags(Array.from(uniqueTags.values()))
    setLoading(false)
  }

  useEffect(() => {
    // selectedTags と userId が変更されたときにデータを再取得
    fetchData()
  }, [selectedTags, userId])

  // タグの選択/解除を切り替える
  const toggleTag = (tagName: string) => {
    setKeyword('') // タグを選択したらキーワード検索をリセット
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    )
  }

  // フィルターをクリアする
  const handleClearFilter = () => {
    setKeyword('')
    setSelectedTags([])
  }

  // フィルターされた政党リストを取得
  const getFilteredParties = () => {
    let filtered = parties
    // タグによるフィルター
    if (selectedTags.length > 0) {
      filtered = filtered.filter((party) => {
        const tagNames = party.tags?.map((t) => t.name) || []
        return selectedTags.every((tag) => tagNames.includes(tag))
      })
    }
    // キーワードによるフィルター
    if (keyword.trim() !== '') {
      filtered = filtered.filter((party) => {
        return (
          party.name.includes(keyword) ||
          party.slogan?.includes(keyword) ||
          party.ideology?.includes(keyword)
        )
      })
    }
    return filtered
  }

  const filteredParties = getFilteredParties()

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">政党一覧</h1>

      {/* 検索フォーム */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-full max-w-xl">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            キーワード検索
          </label>
          <input
            type="text"
            id="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="政党名・理念・スローガンなど"
            className="w-full border border-gray-300 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* タグフィルター */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {allTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.name)}
              className={`text-xs px-3 py-1 rounded-full border transition ${
                selectedTags.includes(tag.name)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              #{tag.name}
            </button>
          ))}
          {(selectedTags.length > 0 || keyword) && (
            <button
              onClick={handleClearFilter}
              className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-700 hover:bg-red-200 ml-2"
            >
              ❌ フィルターを解除
            </button>
          )}
        </div>
      )}

      {/* 政党カード or メッセージ表示 */}
      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : error ? (
        <p className="text-red-600">❌ {error}</p>
      ) : filteredParties.length === 0 ? (
        <p className="text-gray-500">該当する政党は見つかりませんでした。</p>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-600">
            {selectedTags.length > 0
              ? `#${selectedTags.join(', #')} のタグで絞り込み中：${filteredParties.length} 件`
              : keyword.trim() === ''
              ? `現在公開中の政党：${filteredParties.length} 件`
              : `🔎 ${filteredParties.length} 件の政党が見つかりました`}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredParties.map((party) => (
              <PartyCard
                key={party.id}
                party={party}
                tags={party.tags}
                onTagClick={toggleTag}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
