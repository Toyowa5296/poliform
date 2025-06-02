'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import PartyCard from '../../components/PartyCard'

type Tag = { id: string; name: string }
type Party = {
  id: string
  name: string
  slogan: string | null
  ideology: string
  user_id: string
  tags?: Tag[]
  user_name?: string
}

export default function Page() {
  const [parties, setParties] = useState<Party[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [keyword, setKeyword] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = async (searchTerm = '') => {
    setLoading(true)
    setError(null)

    // 🚨 1. partyとuser_profileを別々に取得
    const { data: partyData, error: partyErr } = await supabase
      .from('party')
      .select('id, name, slogan, ideology, user_id, party_tag(tag(id, name))')
      .order('created_at', { ascending: false })

    const { data: profiles, error: profileErr } = await supabase
      .from('user_profile')
      .select('id, name')

    if (partyErr || profileErr) {
      setError(partyErr?.message || profileErr?.message || 'エラーが発生しました')
      setParties([])
      setLoading(false)
      return
    }

    // 🚨 2. user_nameをJavaScriptでマージ
    const formatted = (partyData || []).map((p: any) => ({
      ...p,
      user_name: profiles?.find((u) => u.id === p.user_id)?.name || '匿名',
      tags: p.party_tag?.map((pt: any) => pt.tag) || [],
    }))

    // タグ一覧生成
    const uniqueTags = new Map<string, Tag>()
    formatted.forEach((p) =>
      p.tags?.forEach((tag) => uniqueTags.set(tag.id, tag))
    )
    setAllTags(Array.from(uniqueTags.values()))
    setParties(formatted)
    setLoading(false)
  }

  useEffect(() => {
    fetchData(keyword)
  }, [selectedTags])

  const handleSearch = () => {
    setSelectedTags([])
    fetchData(keyword)
  }

  const toggleTag = (tagName: string) => {
    setKeyword('')
    setSelectedTags(prev =>
      prev.includes(tagName) ? prev.filter(tag => tag !== tagName) : [...prev, tagName]
    )
  }

  const handleClearFilter = () => {
    setKeyword('')
    setSelectedTags([])
    fetchData()
  }

  const getFilteredParties = () => {
    if (selectedTags.length === 0) return parties
    return parties.filter((party: Party) => {
      const tagNames = party.tags?.map(t => t.name) || []
      return selectedTags.every(tag => tagNames.includes(tag))
    })
  }

  const filteredParties = getFilteredParties()

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">政党一覧</h1>

      <div className="flex flex-col items-center mb-6">
        <div className="w-full max-w-md">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            キーワード検索
          </label>
          <div className="flex rounded-md shadow-sm">
            <input
              type="text"
              id="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch()
              }}
              placeholder="政党名・理念・スローガンなど"
              className="flex-1 border border-gray-300 px-4 py-2 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 transition"
            >
              検索
            </button>
          </div>
        </div>
      </div>

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

      {loading && <p className="text-gray-500">読み込み中...</p>}
      {error && <p className="text-red-600">❌ {error}</p>}

      {!loading && filteredParties.length > 0 && (
        <div className="mb-4 text-sm text-gray-600">
          {selectedTags.length > 0
            ? `#${selectedTags.join(', #')} のタグで絞り込み中：${filteredParties.length} 件`
            : keyword.trim() === ''
            ? `現在公開中の政党：${filteredParties.length} 件`
            : `🔎 ${filteredParties.length} 件の政党が見つかりました`}
        </div>
      )}

      <ul className="space-y-4">
        {filteredParties.map((party) => (
          <li key={party.id}>
            <PartyCard
              party={party}
              tags={party.tags}
              onTagClick={toggleTag}
            />
          </li>
        ))}
        {!loading && filteredParties.length === 0 && (
          <p className="text-gray-500">該当する政党は見つかりませんでした。</p>
        )}
      </ul>
    </div>
  )
}
