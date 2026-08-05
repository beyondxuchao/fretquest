import { useEffect, useState } from 'react'
import { Award, CalendarCheck2, RotateCcw } from 'lucide-react'
import type { PracticeProfile } from '../../lib/practiceProfile'
import { CHECKIN_BOARD, SCORE_BOARD, currentDailyStreak, getToyMyRank, getToyRankList, normalizeToyAvatar, type ToyMyRank, type ToyRankItem } from '../../lib/toyLeaderboard'

type Props = {
  profile: PracticeProfile
  isBilibiliToy: boolean
  onStartDaily: () => void
}

const PLAYER_NAME_KEY = 'fretquest.leaderboard.playerName.v1'
const PERIODS = [
  { value: 'day', label: '日榜', scoreText: '今日得分榜', checkinText: '今日打卡榜' },
  { value: 'week', label: '周榜', scoreText: '本周得分榜', checkinText: '本周打卡榜' },
  { value: 'month', label: '月榜', scoreText: '本月得分榜', checkinText: '本月打卡榜' },
] as const

type LeaderboardPeriod = typeof PERIODS[number]['value']

function getPlayerName() {
  try {
    const saved = localStorage.getItem(PLAYER_NAME_KEY)
    if (saved) return saved
    const generated = `本机练习者${Math.floor(1000 + Math.random() * 9000)}`
    localStorage.setItem(PLAYER_NAME_KEY, generated)
    return generated
  } catch {
    return '本机练习者'
  }
}

function dayKey(time: number) {
  const date = new Date(time)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function formatDate(time: number) {
  const date = new Date(time)
  return `${date.getMonth() + 1}.${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function bestDailySession(profile: PracticeProfile) {
  return profile.history.filter((session) => session.kind === 'daily').sort((a, b) => b.score - a.score || b.completedAt - a.completedAt)[0] || null
}

export function LeaderboardPage({ profile, isBilibiliToy, onStartDaily }: Props) {
  const [scoreRanks, setScoreRanks] = useState<ToyRankItem[] | null>(null)
  const [checkinRanks, setCheckinRanks] = useState<ToyRankItem[] | null>(null)
  const [myScoreRank, setMyScoreRank] = useState<ToyMyRank | null>(null)
  const [myCheckinRank, setMyCheckinRank] = useState<ToyMyRank | null>(null)
  const [rankStatus, setRankStatus] = useState<'loading' | 'online' | 'local'>(isBilibiliToy?'loading':'local')
  const [period, setPeriod] = useState<LeaderboardPeriod>('day')
  const periodMeta = PERIODS.find((item) => item.value === period) || PERIODS[0]
  const playerName = getPlayerName()
  const dailySessions = profile.history.filter((session) => session.kind === 'daily')
  const best = bestDailySession(profile)
  const streak = currentDailyStreak(profile.history)
  const totalDays = new Set(dailySessions.map((session) => dayKey(session.completedAt))).size
  const localScoreRows = best ? [{ id: 'local-best', name: playerName, score: best.score, accuracy: best.accuracy, completedAt: best.completedAt }] : []
  const localCheckinRows = dailySessions.length ? [{ id: 'local-checkin', name: playerName, days: totalDays, streak, lastAt: Math.max(...dailySessions.map((session) => session.completedAt)) }] : []

  useEffect(() => {
    if(!isBilibiliToy){setRankStatus('local');return}
    let alive = true
    async function loadRanks() {
      try {
        const [scores, checkins, mineScore, mineCheckin] = await Promise.all([
          getToyRankList(SCORE_BOARD, period, 50),
          getToyRankList(CHECKIN_BOARD, period, 50),
          getToyMyRank(SCORE_BOARD, period),
          getToyMyRank(CHECKIN_BOARD, period),
        ])
        if (!alive) return
        if (scores && checkins) {
          setScoreRanks(scores)
          setCheckinRanks(checkins)
          setMyScoreRank(mineScore)
          setMyCheckinRank(mineCheckin)
          setRankStatus('online')
        } else {
          setRankStatus('local')
        }
      } catch {
        if (alive) setRankStatus('local')
      }
    }
    void loadRanks()
    return () => { alive = false }
  }, [isBilibiliToy,period])

  return <section className="leaderboard-page">
    <div className="leaderboard-toolbar">
      <div className="leaderboard-period-tabs">
        {PERIODS.map((item) => (
          <button
            key={item.value}
            type="button"
            className={period === item.value ? 'active' : ''}
            onClick={() => {
              setPeriod(item.value)
              setRankStatus(isBilibiliToy?'loading':'local')
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <span>{rankStatus === 'online' ? `${periodMeta.label}按平台周期自动刷新，月榜下月清零` : rankStatus === 'loading' ? '正在读取 B 站榜单' : '当前显示本机记录'}</span>
    </div>

    <div className="leaderboard-grid">
      <article className="leaderboard-card">
        <header><div><span>SCORE RANKING</span><h2>得分排行</h2><p>按每日 10 分钟练习的最高得分排序。</p></div><Award size={20}/></header>
        {rankStatus === 'online' && scoreRanks?.length ? <div className="leaderboard-list">{scoreRanks.map((row) => <div key={`${row.rank}-${row.nickname}`}><b>#{row.rank}</b><i>{normalizeToyAvatar(row.avatar) ? <img src={normalizeToyAvatar(row.avatar)} alt="" /> : row.nickname.slice(0, 1)}</i><strong>{row.nickname}</strong><span>{row.score.toLocaleString()} 分</span><small>{periodMeta.scoreText}</small></div>)}</div> : localScoreRows.length ? <div className="leaderboard-list">{localScoreRows.map((row, index) => <div key={row.id} className="current"><b>#{index + 1}</b><i>{row.name.slice(0, 1)}</i><strong>{row.name}</strong><span>{row.score.toLocaleString()} 分</span><small>{row.accuracy}% · {formatDate(row.completedAt)}</small></div>)}</div> : <p className="leaderboard-empty">{rankStatus === 'loading' ? '正在读取榜单。' : '还没有每日练习成绩。'}</p>}
        {rankStatus === 'online' && myScoreRank?.ranked && <p className="leaderboard-mine">我的{periodMeta.label}得分排名 #{myScoreRank.rank} · {myScoreRank.score.toLocaleString()} 分</p>}
      </article>

      <article className="leaderboard-card">
        <header><div><span>CHECK-IN RANKING</span><h2>打卡排行</h2><p>按完成每日练习的打卡成绩排序。</p></div><CalendarCheck2 size={20}/></header>
        {rankStatus === 'online' && checkinRanks?.length ? <div className="leaderboard-list">{checkinRanks.map((row) => <div key={`${row.rank}-${row.nickname}`}><b>#{row.rank}</b><i>{normalizeToyAvatar(row.avatar) ? <img src={normalizeToyAvatar(row.avatar)} alt="" /> : row.nickname.slice(0, 1)}</i><strong>{row.nickname}</strong><span>{row.score} 天</span><small>{periodMeta.checkinText}</small></div>)}</div> : localCheckinRows.length ? <div className="leaderboard-list">{localCheckinRows.map((row, index) => <div key={row.id} className="current"><b>#{index + 1}</b><i>{row.name.slice(0, 1)}</i><strong>{row.name}</strong><span>{row.streak} 天连续</span><small>累计 {row.days} 天 · 最近 {formatDate(row.lastAt)}</small></div>)}</div> : <p className="leaderboard-empty">{rankStatus === 'loading' ? '正在读取榜单。' : '完成今日 10 分钟后记录打卡。'}</p>}
        {rankStatus === 'online' && myCheckinRank?.ranked && <p className="leaderboard-mine">我的{periodMeta.label}打卡排名 #{myCheckinRank.rank} · {myCheckinRank.score} 天</p>}
      </article>
    </div>

    <div className="leaderboard-action"><button onClick={onStartDaily}><RotateCcw size={17}/> 开始今日 10 分钟</button><span>{isBilibiliToy?'完成每日练习后会自动上报：榜位 1 为得分榜，榜位 2 为连续打卡榜。':'成绩仅保存在当前浏览器中。'}</span></div>
  </section>
}
