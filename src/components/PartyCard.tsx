// PartyCard.tsx
'use client'

import Link from 'next/link'
import { User, MapPin, CalendarDays } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Tag = {
  id: string
  name: string
}

type Party = {
  id: string
  name: string
  slogan: string | null
  ideology: string
  user_id: string
  logo_url?: string
  user_name?: string
  leader_name?: string
  activity_area?: string
  founded_at?: string
}

type Props = {
  party: Party
  tags?: Tag[]
  onTagClick?: (tagName: string) => void
  onEdit?: (party: Party) => void
  onDelete?: (id: string) => void
  pendingCount?: number
  onClickApplicants?: (partyId: string) => void
}

export default function PartyCard({
  party,
  tags = [],
  onTagClick,
  onEdit,
  onDelete,
  pendingCount,
  onClickApplicants, // ← 追加
}: Props) {
  const [supportCount, setSupportCount] = useState(0)
  const [isSupported, setIsSupported] = useState(false)
  const [memberCount, setMemberCount] = useState<number>(0)


  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('party_id', party.id)
      setSupportCount(count || 0)

      const { data: like } = await supabase
        .from('likes')
        .select('id')
        .eq('party_id', party.id)
        .eq('user_id', user.id)
        .single()
      setIsSupported(!!like) 

      // 🔽 承認済みの参加者数を取得
      const { count: approvedCount } = await supabase
        .from('party_member')
        .select('*', { count: 'exact', head: true })
        .eq('party_id', party.id)
        .eq('status', 'approved')
      setMemberCount(approvedCount || 0)
    }

    fetchData()
  }, [party.id])

  return (
    <div className="bg-white border rounded-lg shadow hover:shadow-lg transition p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full border bg-gray-100 flex items-center justify-center overflow-hidden text-sm font-bold text-gray-500">
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
          <div>
            <Link href={`/parties/${party.id}`}>
              <h2 className="text-base font-bold text-blue-800 hover:underline">
                {party.name}
              </h2>
            </Link>
            {party.slogan && <p className="text-sm text-gray-600 truncate">{party.slogan}</p>}
          </div>
        </div>

        <p className="text-sm text-gray-700 line-clamp-3 mb-2">
          {party.ideology.replace(/\n/g, ' ')}
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          {tags.slice(0, 3).map((tag) => (
            <button
              key={tag.id}
              onClick={() => onTagClick?.(tag.name)}
              className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full hover:bg-blue-200"
            >
              #{tag.name}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          {party.leader_name && (
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>{party.leader_name}</span>
            </div>
          )}
          {party.activity_area && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{party.activity_area}</span>
            </div>
          )}
          {party.founded_at && (
            <div className="flex items-center gap-1">
              <CalendarDays className="w-4 h-4" />
              <span>{party.founded_at.slice(0, 10)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex justify-between items-center text-xs font-semibold">
        <span className={`${isSupported ? 'bg-blue-600' : 'bg-gray-300'} text-white px-2 py-0.5 rounded-full`}>
          {isSupported ? `支持済み（${supportCount}）` : `支持数（${supportCount}）`}
        </span>
        <span className="text-gray-700">参加者（{memberCount}名）</span>
      </div>

      {/* 申請数ボタン（条件付き） */}
      {pendingCount !== undefined && pendingCount > 0 && onClickApplicants && (
        <div className="mt-2 text-xs text-blue-600 hover:underline text-right">
          <button onClick={() => onClickApplicants(party.id)}>
            申請数（{pendingCount}）
          </button>
        </div>
      )}

      {/* 編集・削除ボタン */}
      {(onEdit || onDelete) && (
        <div className="flex mt-3 gap-4 text-sm justify-end">
          {onEdit && (
            <button
              onClick={() => onEdit(party)}
              className="text-blue-600 hover:underline"
            >
              編集
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(party.id)}
              className="text-red-600 hover:underline"
            >
              削除
            </button>
          )}
        </div>
      )}
    </div>
  )
}