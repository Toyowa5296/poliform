'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { User, MapPin, CalendarDays, Globe, Mail } from 'lucide-react'

// 型を拡張
type Tag = { id: string; name: string }

type Party = {
  user_id: string
  name: string
  slogan: string | null
  ideology: string
  logo_url?: string
  founded_at?: string | null
  leader_name?: string | null
  activity_area?: string | null
  location?: string | null
  website?: string | null
  contact_email?: string | null
  activities?: string | null
  activities_url?: string | null
  party_tag?: { tag: Tag }[]
}

type PolicyPillar = {
  id: string
  content: string
}

type Comment = {
  id: string
  content: string
  created_at: string
  user_id: string
  user_profile?: {
    id: string
    name: string
  }
}

export default function PartyDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [party, setParty] = useState<Party | null>(null)
  const [policyPillars, setPolicyPillars] = useState<PolicyPillar[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [supportCount, setSupportCount] = useState(0)
  const [isSupported, setIsSupported] = useState(false)
  const [memberStatus, setMemberStatus] = useState<'none' | 'pending' | 'approved'>('none')
  const [members, setMembers] = useState<{ id: string; name: string; avatar_url?: string }[]>([])

  useEffect(() => {
    const fetchParty = async () => {
      const { data } = await supabase
        .from('party')
        .select(`
          user_id,
          name,
          slogan,
          ideology,
          logo_url,
          founded_at,
          leader_name,
          activity_area,
          location,
          website,
          contact_email,
          activities,
          activities_url,
          party_tag(tag(id, name))
        `)
        .eq('id', id)
        .single()
      if (data) setParty(data)
    }
    if (id) fetchParty()
  }, [id])

  useEffect(() => {
    const fetchPolicyPillars = async () => {
      const { data } = await supabase
        .from('policy_pillar')
        .select('id, content')
        .eq('party_id', id)
      if (data) setPolicyPillars(data)
    }
    if (id) fetchPolicyPillars()
  }, [id])

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comment')
      .select('id, content, created_at, user_id, user_profile(id, name)')
      .eq('party_id', id)
      .order('created_at', { ascending: false })
    if (data) setComments(data)
  }

  useEffect(() => {
    fetchComments()
  }, [id])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUserId(user?.id ?? null)

      if (user?.id) {
        const { data: likeData } = await supabase
          .from('likes')
          .select('id')
          .eq('party_id', id)
          .eq('user_id', user.id)
          .single()
        setIsSupported(!!likeData)
      }

      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('party_id', id)
      setSupportCount(count || 0)
    })
  }, [id])

  useEffect(() => {
    const checkMembership = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('party_member')
        .select('status')
        .eq('user_id', user.id)
        .eq('party_id', id)
        .maybeSingle()

      console.log('user_id:', user.id)
      console.log('party_id:', id)
      console.log('取得結果:', data)
      console.log('エラー:', error)

      if (data?.status === 'approved') {
        setMemberStatus('approved')
      } else if (data?.status === 'pending') {
        setMemberStatus('pending')
      } else {
        setMemberStatus('none')
      }
    }

    checkMembership()
  }, [id])

  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from('party_member')
        .select('user_profile(id, name, avatar_url)')
        .eq('party_id', id)
        .eq('status', 'approved')

      if (error) {
        console.error('参加メンバー取得エラー:', error)
        return
      }

      type MemberProfile = { id: string; name: string; avatar_url?: string }

      const filtered = (data ?? [])
        .map((d) => d.user_profile)
        .filter((u): u is MemberProfile => !!u)

      setMembers(filtered)
    }

    if (id) fetchMembers()
  }, [id])

  const handleSupport = async () => {
    if (!userId) return
    if (isSupported) {
      await supabase.from('likes').delete().eq('party_id', id).eq('user_id', userId)
      setSupportCount((prev) => Math.max(prev - 1, 0))
      setIsSupported(false)
    } else {
      await supabase.from('likes').insert({ party_id: id, user_id: userId })
      setSupportCount((prev) => prev + 1)
      setIsSupported(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    const { error } = await supabase.from('comment').insert({ party_id: id, user_id: userId, content })
    if (!error) {
      setContent('')
      fetchComments()
    }
  }

  const handleApply = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: existing, error } = await supabase
      .from('party_member')
      .select('id')
      .eq('user_id', user.id)
      .eq('party_id', id)
      .maybeSingle()

    if (error) {
      alert('参加状況の確認に失敗しました: ' + error.message)
      return
    }

    if (existing) {
      alert('すでに申請済みです')
      setMemberStatus('pending')
      return
    }

    console.log('user_id:', user?.id)
    console.log('party_id:', id)

     // 新規申請を登録
    const { error: insertError } = await supabase.from('party_member').insert({
      user_id: user.id,
      party_id: id,
      status: 'pending',
    })

    if (!insertError) {
      setMemberStatus('pending')
    } else {
      alert('申請に失敗しました: ' + insertError.message)
      console.error('申請エラー:', insertError) 
    }
  }

  const handleUpdate = async (commentId: string) => {
    if (!editContent.trim()) return
    const { error } = await supabase
      .from('comment')
      .update({ content: editContent })
      .eq('id', commentId)
      .eq('user_id', userId)
    if (!error) {
      setEditingId(null)
      setEditContent('')
      fetchComments()
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('このコメントを削除しますか？')) return
    const { error } = await supabase
      .from('comment')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId)
    if (!error) fetchComments()
  }

  const handleCancelRequest = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('party_member')
      .delete()
      .eq('user_id', user.id)
      .eq('party_id', id)

    if (!error) {
      setMemberStatus('none')
    } else {
      alert('取消に失敗しました: ' + error.message)
      console.error('取消エラー:', error)
    }
  }

  if (!party) return <div className="p-6">読み込み中...</div>

  return (
    <div className="bg-white-50 min-h-screen">
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <div className="flex justify-center gap-3 mb-4">
          {/* 参加申請ボタン（支持ボタン風） */}
          {userId && userId !== party.user_id && (
            memberStatus === 'approved' ? (
              <span className="text-xs text-green-700 px-3 py-1 rounded-full bg-green-50 font-semibold">
                参加済み
              </span>
            ) : (
              <button
                onClick={memberStatus === 'pending' ? handleCancelRequest : handleApply}
                className={`text-xs px-4 py-1 rounded-full font-semibold transition ${
                  memberStatus === 'pending'
                    ? 'bg-gray-300 text-gray-800 hover:bg-gray-400'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {memberStatus === 'pending' ? '申請中（取消）' : '参加申請する'}
              </button>
            )
          )}
          {/* 支持ボタン */}
          {userId === party.user_id ? (
            <span className="text-xs bg-gray-400 text-white px-3 py-1 rounded-full font-semibold">
              支持数（{supportCount}）
            </span>
          ) : (
            <button
              onClick={handleSupport}
              className={`text-xs px-4 py-1 rounded-full font-semibold transition ${
                isSupported
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-300 text-gray-800 hover:bg-gray-400'
              }`}
            >
              {isSupported ? `支持済み（${supportCount}）` : `支持する（${supportCount}）`}
            </button>
          )}
        </div>
        {/* ヘッダー＋基本情報の2カラム構成 */}
        <div className="flex flex-col md:flex-row items-start gap-8 bg-white shadow rounded-lg p-6">
          {/* 左：ロゴ + 支持ボタン */}
          <div className="flex flex-col items-center">
            <div className="h-36 w-36 rounded-full border shadow bg-gray-100 flex items-center justify-center overflow-hidden text-4xl font-bold text-gray-500">
              {party.logo_url ? (
                <img
                  src={party.logo_url}
                  alt={`${party.name}のロゴ`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{party.name?.charAt(0).toUpperCase() || '?'}</span>
              )}
            </div>
          </div>

          {/* 右：政党名・スローガン → 基本情報 */}
          <div className="flex flex-col space-y-4 w-full max-w-md">
            {/* 政党名とスローガン */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{party.name}</h1>
              {party.slogan && (
                <p className="text-sm text-gray-600 mt-1">📣 {party.slogan}</p>
              )}
            </div>

            {/* 基本情報 */}
            <div className="text-sm text-gray-800 space-y-2">
              {party.leader_name && (
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 mt-1 text-gray-500" />
                  <div><span className="font-semibold">代表：</span>{party.leader_name}</div>
                </div>
              )}
              {party.founded_at && (
                <div className="flex items-start gap-2">
                  <CalendarDays className="w-4 h-4 mt-1 text-gray-500" />
                  <div><span className="font-semibold">設立：</span>{party.founded_at}</div>
                </div>
              )}
              {party.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-1 text-gray-500" />
                  <div><span className="font-semibold">所在地：</span>{party.location}</div>
                </div>
              )}
              {party.activity_area && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-1 text-gray-500" />
                  <div><span className="font-semibold">活動エリア：</span>{party.activity_area}</div>
                </div>
              )}
              {party.website && (
                <div className="flex items-start gap-2">
                  <Globe className="w-4 h-4 mt-1 text-gray-500" />
                  <div>
                    <span className="font-semibold">Web：</span>
                    <a href={party.website} target="_blank" className="text-indigo-600 underline">
                      {party.website}
                    </a>
                  </div>
                </div>
              )}
              {party.contact_email && (
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 mt-1 text-gray-500" />
                  <div>
                    <span className="font-semibold">メール：</span>
                    <a href={`mailto:${party.contact_email}`} className="text-indigo-600 underline">
                      {party.contact_email}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 理念 */}
        {party.ideology && (
          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2 border-b">理念・方針</h2>
            <p className="text-gray-800 whitespace-pre-line">{party.ideology}</p>
          </div>
        )}

        {/* 活動内容 */}
        {(party.activities || party.activities_url) && (
          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2 border-b">活動内容</h2>
            {party.activities && <p className="text-gray-800 whitespace-pre-line">{party.activities}</p>}
            {party.activities_url && (
              <p className="mt-2 text-sm">詳細はこちら：<a href={party.activities_url} className="text-indigo-600 underline" target="_blank">{party.activities_url}</a></p>
            )}
          </div>
        )}

        {/* 政策の柱 */}
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2 border-b">政策の柱</h2>
          {policyPillars.length > 0 ? (
            <ul className="list-disc pl-6 text-gray-800 space-y-1">
              {policyPillars.map((p) => (<li key={p.id}>{p.content}</li>))}
            </ul>
          ) : <p className="text-sm text-gray-500">まだ登録されていません</p>}
        </div>

        {/* 参加メンバー */}
        <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-semibold border-b pb-1">参加メンバー</h2>
        <div className="flex flex-wrap gap-2 mt-2">
          {members.map((member) => (
            <span
              key={member.id}
              className="flex items-center gap-2 bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-full border"
            >
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={member.name ?? 'ユーザー'}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-[10px] font-semibold text-gray-700">
                  {(member.name?.charAt(0) ?? '?').toUpperCase()}
                </div>
              )}
              <span className="truncate max-w-[100px]">{member.name ?? 'ユーザー'}</span>
            </span>
          ))}
        </div>
      </div>

        {/* タグ */}
        {party.party_tag?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {party.party_tag.map(({ tag }) => (
              <span key={tag.id} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">#{tag.name}</span>
            ))}
          </div>
        )}

        {/* コメント */}
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2 border-b">コメント</h2>
          {userId ? (
            <form onSubmit={handleSubmit} className="mb-4 space-y-2">
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} className="w-full border p-2 rounded" placeholder="コメントを入力..." />
              <button type="submit" className="bg-indigo-600 text-white px-4 py-1 rounded">投稿する</button>
            </form>
          ) : <p className="text-gray-500">ログインするとコメントできます</p>}

          {comments.length > 0 ? (
            <ul className="space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="border p-2 rounded bg-gray-50">
                  {editingId === c.id ? (
                    <>
                      <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full border rounded p-1 mb-2" />
                      <div className="flex gap-2">
                        <button className="text-sm text-white bg-indigo-600 px-2 py-1 rounded" onClick={() => handleUpdate(c.id)}>保存</button>
                        <button className="text-sm text-gray-600" onClick={() => { setEditingId(null); setEditContent('') }}>キャンセル</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-800">{c.content}</p>
                      <p className="text-xs text-gray-500">👤 {c.user_profile?.name ?? 'unknown'} ／ 📅 {new Date(c.created_at).toLocaleString()}</p>
                      {userId === c.user_id && (
                        <div className="flex gap-2 mt-1">
                          <button className="text-xs text-indigo-600" onClick={() => { setEditingId(c.id); setEditContent(c.content) }}>編集</button>
                          <button className="text-xs text-red-600" onClick={() => handleDelete(c.id)}>削除</button>
                        </div>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-gray-500">コメントはまだありません</p>}
        </div>
      </div>
    </div>
  )
}
