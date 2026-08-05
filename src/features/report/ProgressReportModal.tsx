import { useEffect, useState } from 'react'
import { BarChart3, CheckCircle2, CircleAlert, Download, Flame, Medal, UserRound, X } from 'lucide-react'
import type { PracticeProfile } from '../../lib/practiceProfile'
import type { FretboardStyle, PositionStats, TrainingType } from '../../types'
import { formatActiveNote } from '../../lib/noteNotation'
import { CHECKIN_BOARD, SCORE_BOARD, currentDailyStreak, getToyMyRank, getToyUserProfile, normalizeToyAvatar, type ToyMyRank, type ToyUserProfile } from '../../lib/toyLeaderboard'
import { createSummaryPoster, savePosterImage, type SummaryPosterKind } from '../../lib/sharePoster'
import './ProgressReportModal.css'

type Props = { profile: PracticeProfile; positionStats: PositionStats; fretboardStyle: FretboardStyle; isBilibiliToy: boolean; onClose: () => void }

const LABELS: Record<TrainingType, string> = {
  locate: '音名定位',
  identify: '反向识别',
  stringLocate: '指定弦定位',
  positionAssessment: '把位覆盖',
  allNotes: '同名音全找',
  octave: '八度关系',
  interval: '核心音程',
  intervalShape: '音程形状',
  earLocate: '听音定位',
  adaptive: '薄弱位置复习',
  scaleDegree: '音阶音级',
  chordTone: '和弦内音',
  arpeggio: '琶音路径',
}
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const OPEN_NOTES = [4, 11, 7, 2, 9, 4]
const MARKERS = new Set([3, 5, 7, 9, 12])
const GRID_TEMPLATE = '54px repeat(12, minmax(44px, 1fr))'

function positionScore(stat: PositionStats[string]) {
  if (!stat) return null
  const total = stat.correct + stat.wrong
  return stat.mastery ?? (total ? Math.round(stat.correct / total * 100) : null)
}

function dayKey(time: number) {
  const date = new Date(time)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function bestDailyScore(profile: PracticeProfile) {
  return profile.history.filter((session) => session.kind === 'daily').sort((a, b) => b.score - a.score || b.completedAt - a.completedAt)[0]?.score ?? null
}

function rankText(rank: ToyMyRank | null, unit: string) {
  if (!rank) return '读取中'
  if (!rank.ranked) return '未上榜'
  return `#${rank.rank} · ${rank.score.toLocaleString()}${unit}`
}

function ReviewFretboard({ positionStats, style }: { positionStats: PositionStats; style: FretboardStyle }) {
  return <div className="fretboard-scroll report-review-board">
    <div className="fret-numbers" style={{ gridTemplateColumns: GRID_TEMPLATE }}><span />{Array.from({ length: 12 }, (_, index) => <span key={index}>{index + 1}</span>)}</div>
    <div className={`fretboard ${style} review`}>
      {Array.from({ length: 6 }, (_, string) => <div className="string-row" key={string} style={{ gridTemplateColumns: GRID_TEMPLATE }}>
        <button className="string-label" type="button" tabIndex={-1}><span className="string-number-label">{string + 1}弦</span><span className="open-note-label">{formatActiveNote(NOTES[OPEN_NOTES[string]])}</span></button>
        {Array.from({ length: 12 }, (_, index) => {
          const fret = index + 1
          const stat = positionStats[`${string}-${fret}`]
          const total = stat ? stat.correct + stat.wrong : 0
          const rate = total ? stat.correct / total : 1
          const heatClass = total >= 2 ? (rate < .5 ? 'heat-weak' : rate < .8 ? 'heat-warn' : 'heat-strong') : ''
          return <button type="button" tabIndex={-1} key={fret} className={heatClass} title={total ? `${string + 1}弦 ${fret}品 · ${Math.round(rate * 100)}%` : `${string + 1}弦 ${fret}品 · 尚未评估`}><span className="string-wire" /><b>{formatActiveNote(NOTES[(OPEN_NOTES[string] + fret) % 12])}</b></button>
        })}
      </div>)}
      <div className="markers" style={{ gridTemplateColumns: GRID_TEMPLATE }}><span />{Array.from({ length: 12 }, (_, index) => { const fret = index + 1; return <span key={fret}>{MARKERS.has(fret) && <i className={fret === 12 ? 'double' : ''} />}</span> })}</div>
    </div>
  </div>
}

export function ProgressReportModal({ profile, positionStats, fretboardStyle, isBilibiliToy, onClose }: Props) {
  const [toyProfile, setToyProfile] = useState<ToyUserProfile | null>(null)
  const [rankStatus, setRankStatus] = useState<'loading' | 'online' | 'local'>(isBilibiliToy?'loading':'local')
  const [dayScoreRank, setDayScoreRank] = useState<ToyMyRank | null>(null)
  const [weekScoreRank, setWeekScoreRank] = useState<ToyMyRank | null>(null)
  const [monthScoreRank, setMonthScoreRank] = useState<ToyMyRank | null>(null)
  const [dayCheckinRank, setDayCheckinRank] = useState<ToyMyRank | null>(null)
  const [savingPoster, setSavingPoster] = useState<SummaryPosterKind | null>(null)
  const dailySessions = profile.history.filter((session) => session.kind === 'daily')
  const totalDays = new Set(dailySessions.map((session) => dayKey(session.completedAt))).size
  const streak = currentDailyStreak(profile.history)
  const skills = Object.entries(profile.weakness).map(([type, weakness]) => ({ type: type as TrainingType, weakness: weakness ?? .5 })).sort((a, b) => a.weakness - b.weakness)
  const strengths = skills.filter((item) => item.weakness <= .35).slice(0, 3)
  const weaknesses = skills.filter((item) => item.weakness >= .45).sort((a, b) => b.weakness - a.weakness).slice(0, 3)
  const assessed = Object.values(positionStats).filter((stat) => stat.correct + stat.wrong > 0)
  const average = assessed.length ? Math.round(assessed.reduce((sum, stat) => sum + (positionScore(stat) ?? 0), 0) / assessed.length) : null
  const avatar = normalizeToyAvatar(toyProfile?.avatar)
  const nickname = toyProfile?.nickname || '我的练习档案'

  useEffect(() => {
    if(!isBilibiliToy){setRankStatus('local');return}
    let alive = true
    async function loadMine() {
      try {
        const [profileResult, dayScore, weekScore, monthScore, dayCheckin] = await Promise.all([
          getToyUserProfile(),
          getToyMyRank(SCORE_BOARD, 'day'),
          getToyMyRank(SCORE_BOARD, 'week'),
          getToyMyRank(SCORE_BOARD, 'month'),
          getToyMyRank(CHECKIN_BOARD, 'day'),
        ])
        if (!alive) return
        setToyProfile(profileResult)
        setDayScoreRank(dayScore)
        setWeekScoreRank(weekScore)
        setMonthScoreRank(monthScore)
        setDayCheckinRank(dayCheckin)
        setRankStatus(dayScore || weekScore || monthScore || dayCheckin ? 'online' : 'local')
      } catch {
        if (alive) setRankStatus('local')
      }
    }
    void loadMine()
    return () => { alive = false }
  }, [isBilibiliToy])

  const saveSummary = async (kind: SummaryPosterKind) => {
    if (savingPoster) return
    setSavingPoster(kind)
    try {
      const image = await createSummaryPoster({ kind, profile, positionStats, streakDays: streak, nickname, avatar })
      await savePosterImage(image)
    } catch (error) {
      console.warn('[poster] summary save failed', error)
    } finally {
      setSavingPoster(null)
    }
  }

  return <div className="report-backdrop" role="dialog" aria-modal="true" aria-label="学习报告" onMouseDown={onClose}>
    <section className="progress-report" onMouseDown={(event) => event.stopPropagation()}>
      <header><div className="report-title-icon"><BarChart3 size={20} /></div><div><span>MY REPORT</span><h2>我的报告</h2><p>{profile.history.length ? `已记录 ${profile.history.length} 次诊断或练习` : '完成首次诊断后，这里会持续记录你的变化。'}</p></div><button className="report-close" onClick={onClose} aria-label="关闭报告"><X size={18} /></button></header>

      {isBilibiliToy&&<section className="report-me">
        <div className="report-user">
          <i>{avatar ? <img src={avatar} alt="" /> : <UserRound size={24} />}</i>
          <div><span>BILIBILI PROFILE</span><strong>{nickname}</strong><small>{rankStatus === 'online' ? '已连接 B 站排行榜' : rankStatus === 'loading' ? '正在读取 B 站信息' : 'SDK 不可用时显示本机数据'}</small></div>
        </div>
        <div className="report-rank-strip">
          <article><Medal size={15} /><small>日榜得分</small><strong>{rankText(dayScoreRank, '分')}</strong></article>
          <article><Medal size={15} /><small>周榜得分</small><strong>{rankText(weekScoreRank, '分')}</strong></article>
          <article><Medal size={15} /><small>月榜得分</small><strong>{rankText(monthScoreRank, '分')}</strong></article>
          <article><Flame size={15} /><small>今日打卡</small><strong>{rankStatus === 'online' ? rankText(dayCheckinRank, '天') : `${streak} 天连续`}</strong></article>
        </div>
      </section>}

      <div className="report-summary"><article><small>已评估位置</small><strong>{assessed.length}</strong><span>/ 72</span></article><article><small>位置平均掌握度</small><strong>{average === null ? '--' : `${average}%`}</strong><span>{average === null ? '等待数据' : '依据正确率、速度与误触'}</span></article><article><small>练习打卡</small><strong>{streak}</strong><span>{dailySessions.length ? `累计 ${totalDays} 天 · 最高 ${bestDailyScore(profile)?.toLocaleString() ?? '--'} 分` : '今天开始第一天'}</span></article></div>
      <div className="report-insights"><article className="report-strengths"><div><CheckCircle2 size={17} /><strong>目前强项</strong></div>{strengths.length ? strengths.map((item) => <span key={item.type}>{LABELS[item.type]}<b>{Math.round((1 - item.weakness) * 100)}%</b></span>) : <p>完成诊断或几次练习后，会识别你最稳定的能力。</p>}</article><article className="report-weaknesses"><div><CircleAlert size={17} /><strong>建议加强</strong></div>{weaknesses.length ? weaknesses.map((item) => <span key={item.type}>{LABELS[item.type]}<b>{Math.round(item.weakness * 100)}%</b></span>) : <p>还没有足够数据。先完成一次能力诊断吧。</p>}</article></div>
      <section className="report-posters"><div><span>SHARE CARDS</span><h3>生成我的成绩海报</h3><p>保存到相册后，可以直接分享周进步、月总结或指板弱项。</p></div><div>{([['week','周报海报'],['month','月度总结'],['map','最弱把位地图'],['streak',`连续 ${streak} 天`]] as [SummaryPosterKind,string][]).map(([kind,label])=><button key={kind} disabled={savingPoster!==null} onClick={()=>void saveSummary(kind)}><Download size={15}/>{savingPoster===kind?'正在生成':label}</button>)}</div></section>
      <section className="report-fretboard"><div className="report-board-head"><div><span>FRETBOARD MAP</span><h3>位置掌握地图</h3><p>与训练结束复盘一致：绿色熟练，黄色待加强，红色薄弱。</p></div><div className="heat-legend"><span><i className="good" />熟练</span><span><i className="medium" />待加强</span><span><i className="weak" />薄弱</span></div></div><ReviewFretboard positionStats={positionStats} style={fretboardStyle} /></section>
    </section>
  </div>
}
