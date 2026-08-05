import type { PositionStats } from '../types'
import type { PracticeProfile } from './practiceProfile'
import { isBilibiliToyEnvironment } from './toyEnvironment'

type PosterInput = {
  score: number
  accuracy: number
  correct: number
  attempts: number
  streakDays: number
  positionStats: PositionStats
  noteAt: (string: number, fret: number) => string
}

function weakPosition(input: PosterInput) {
  const item = Object.entries(input.positionStats).map(([key, value]) => {
    const [string, fret] = key.split('-').map(Number)
    const total = value.correct + value.wrong
    const accuracy = total ? Math.round(value.correct / total * 100) : 100
    return { string, fret, total, accuracy }
  }).filter((item) => item.total >= 2).sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)[0]
  if (!item) return '继续练习后生成'
  return `${item.string + 1}弦${item.fret === 0 ? '空弦' : `${item.fret}品`} · ${input.noteAt(item.string, item.fret)}`
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

const FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif'

function setFont(ctx: CanvasRenderingContext2D, weight: number, size: number) {
  ctx.font = `${weight} ${size}px ${FONT_FAMILY}`
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, startSize: number, minSize: number, weight = 700) {
  let size = startSize
  setFont(ctx, weight, size)
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 2
    setFont(ctx, weight, size)
  }
  return size
}

export async function createDailyPoster(input: PosterInput) {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1440
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')

  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'

  ctx.fillStyle = '#0d100e'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1440)
  gradient.addColorStop(0, '#172018')
  gradient.addColorStop(.58, '#111612')
  gradient.addColorStop(1, '#202718')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1080, 1440)

  ctx.strokeStyle = 'rgba(215,255,117,.14)'
  ctx.lineWidth = 2
  for (let y = 150; y < 1250; y += 105) {
    ctx.beginPath()
    ctx.moveTo(90, y)
    ctx.lineTo(990, y - 45)
    ctx.stroke()
  }

  ctx.fillStyle = '#d7ff75'
  setFont(ctx, 700, 34)
  ctx.fillText('FretSeek', 84, 112)
  ctx.fillStyle = '#8f9a90'
  setFont(ctx, 500, 28)
  ctx.fillText('今日 10 分钟指板训练完成', 84, 166)

  const scoreText = input.score.toLocaleString('zh-CN')
  ctx.fillStyle = '#eef4ec'
  fitText(ctx, scoreText, 760, 158, 104, 800)
  ctx.fillText(scoreText, 80, 360)
  ctx.fillStyle = '#d7ff75'
  setFont(ctx, 700, 42)
  ctx.textAlign = 'right'
  ctx.fillText('分', 996, 350)
  ctx.textAlign = 'left'

  const cards = [
    ['正确率', `${input.accuracy}%`],
    ['答对', `${input.correct}/${Math.max(input.attempts, 1)}`],
    ['连续打卡', `${input.streakDays}天`],
  ]
  cards.forEach(([label, value], index) => {
    const x = 84 + index * 304
    roundRect(ctx, x, 470, 274, 170, 18)
    ctx.fillStyle = 'rgba(21,26,22,.92)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(215,255,117,.18)'
    ctx.stroke()
    ctx.fillStyle = '#869187'
    setFont(ctx, 600, 24)
    ctx.fillText(label, x + 28, 522)
    ctx.fillStyle = '#e9f0e7'
    fitText(ctx, value, 218, 52, 36, 800)
    ctx.fillText(value, x + 28, 594)
  })

  roundRect(ctx, 84, 720, 912, 230, 22)
  ctx.fillStyle = 'rgba(18,23,19,.94)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(215,255,117,.2)'
  ctx.stroke()
  ctx.fillStyle = '#91ad68'
  setFont(ctx, 700, 24)
  ctx.fillText('当前最需要加强', 128, 790)
  ctx.fillStyle = '#edf4ea'
  const weakText = weakPosition(input)
  fitText(ctx, weakText, 824, 58, 36, 800)
  ctx.fillText(weakText, 128, 872)

  ctx.fillStyle = '#7f8b80'
  setFont(ctx, 500, 26)
  ctx.fillText('每天一点点，把整块指板变成自己的地图。', 128, 1048)
  ctx.fillStyle = '#d7ff75'
  setFont(ctx, 700, 30)
  ctx.fillText('标准调弦 · E A D G B E', 128, 1110)

  ctx.fillStyle = '#657166'
  setFont(ctx, 500, 22)
  ctx.fillText(new Date().toLocaleDateString('zh-CN'), 84, 1320)
  ctx.textAlign = 'right'
  ctx.fillText(isBilibiliToyEnvironment() ? 'bilibili Toy · FretSeek' : 'FretSeek', 996, 1320)
  ctx.textAlign = 'left'

  return canvas.toDataURL('image/png')
}

export type SummaryPosterKind = 'week' | 'month' | 'map' | 'streak'

const POSTER_SKILL_LABELS: Record<string, string> = {
  locate: '音名定位', identify: '反向识别', stringLocate: '指定弦定位', positionAssessment: '把位覆盖',
  allNotes: '同名音全找', octave: '八度关系', interval: '核心音程', intervalShape: '音程形状',
  earLocate: '听音定位', adaptive: '薄弱位置复习', scaleDegree: '音阶音级', chordTone: '和弦内音', arpeggio: '琶音路径',
}

type SummaryPosterInput = {
  kind: SummaryPosterKind
  profile: PracticeProfile
  positionStats: PositionStats
  streakDays: number
  nickname?: string
  avatar?: string | null
}

function loadPosterImage(src?: string | null) {
  if (!src) return Promise.resolve<HTMLImageElement | null>(null)
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })
}

function dailySessionsSince(profile: PracticeProfile, since: number) {
  return profile.history.filter((session) => session.kind === 'daily' && session.completedAt >= since)
}

export async function createSummaryPoster(input: SummaryPosterInput) {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1440
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.textBaseline = 'alphabetic'

  const now = new Date()
  const periodDays = input.kind === 'week' ? 7 : 31
  const sessions = dailySessionsSince(input.profile, Date.now() - periodDays * 86400000)
  const title = input.kind === 'week' ? '本周练习报告' : input.kind === 'month' ? '本月学习总结' : input.kind === 'map' ? '我的最弱把位地图' : `连续打卡 ${input.streakDays} 天`
  const subtitle = input.kind === 'map' ? '红色越深，越值得优先复习' : input.kind === 'streak' ? '每天十分钟，正在变成真正的长期能力' : `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 · 指板训练档案`

  const gradient = ctx.createLinearGradient(0, 0, 1080, 1440)
  gradient.addColorStop(0, '#172018')
  gradient.addColorStop(.62, '#101511')
  gradient.addColorStop(1, '#242a19')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1080, 1440)

  ctx.fillStyle = '#d7ff75'
  setFont(ctx, 800, 32)
  ctx.fillText('FretSeek', 84, 102)

  const avatar = await loadPosterImage(input.avatar)
  ctx.save()
  ctx.beginPath()
  ctx.arc(132, 202, 48, 0, Math.PI * 2)
  ctx.clip()
  if (avatar) ctx.drawImage(avatar, 84, 154, 96, 96)
  else {
    ctx.fillStyle = '#30402c'
    ctx.fillRect(84, 154, 96, 96)
    ctx.fillStyle = '#d7ff75'
    setFont(ctx, 800, 38)
    ctx.textAlign = 'center'
    ctx.fillText((input.nickname || '我').slice(0, 1), 132, 216)
  }
  ctx.restore()
  ctx.textAlign = 'left'
  ctx.fillStyle = '#eef4ec'
  fitText(ctx, input.nickname || '我的练习档案', 600, 38, 28, 800)
  ctx.fillText(input.nickname || '我的练习档案', 204, 195)
  ctx.fillStyle = '#849086'
  setFont(ctx, 500, 24)
  ctx.fillText('BILIBILI · 个人指板学习档案', 204, 235)

  ctx.fillStyle = '#eef4ec'
  fitText(ctx, title, 912, input.kind === 'streak' ? 78 : 68, 48, 800)
  ctx.fillText(title, 84, 365)
  ctx.fillStyle = '#94a096'
  setFont(ctx, 500, 27)
  ctx.fillText(subtitle, 84, 416)

  if (input.kind === 'map') {
    const x0 = 112, y0 = 520, cellW = 70, cellH = 91
    setFont(ctx, 600, 20)
    for (let fret = 1; fret <= 12; fret++) {
      ctx.fillStyle = '#778279'; ctx.textAlign = 'center'; ctx.fillText(String(fret), x0 + fret * cellW, y0 - 26)
    }
    for (let string = 0; string < 6; string++) {
      ctx.fillStyle = '#778279'; ctx.textAlign = 'right'; ctx.fillText(`${string + 1}弦`, x0 - 18, y0 + string * cellH + 10)
      for (let fret = 1; fret <= 12; fret++) {
        const stat = input.positionStats[`${string}-${fret}`]
        const total = stat ? stat.correct + stat.wrong : 0
        const rate = total ? stat.correct / total : 1
        ctx.fillStyle = total < 2 ? '#273029' : rate < .5 ? '#e95b52' : rate < .8 ? '#e4bd4d' : '#70ae64'
        ctx.beginPath(); ctx.arc(x0 + fret * cellW, y0 + string * cellH, 24, 0, Math.PI * 2); ctx.fill()
      }
    }
    ctx.textAlign = 'left'
  } else {
    const totalScore = sessions.reduce((sum, session) => sum + session.score, 0)
    const averageAccuracy = sessions.length ? Math.round(sessions.reduce((sum, session) => sum + session.accuracy, 0) / sessions.length) : 0
    const values = input.kind === 'streak'
      ? [['连续天数', `${input.streakDays} 天`], ['累计练习', `${input.profile.history.filter((s) => s.kind === 'daily').length} 次`], ['今日状态', input.streakDays ? '已坚持' : '待打卡']]
      : [['完成练习', `${sessions.length} 次`], ['累计得分', totalScore.toLocaleString('zh-CN')], ['平均正确率', `${averageAccuracy}%`]]
    values.forEach(([label, value], index) => {
      const x = 84 + index * 304
      roundRect(ctx, x, 520, 274, 190, 16)
      ctx.fillStyle = '#19201a'; ctx.fill()
      ctx.strokeStyle = 'rgba(215,255,117,.18)'; ctx.stroke()
      ctx.fillStyle = '#879288'; setFont(ctx, 600, 23); ctx.fillText(label, x + 25, 574)
      ctx.fillStyle = '#eef4ec'; fitText(ctx, value, 224, 48, 30, 800); ctx.fillText(value, x + 25, 654)
    })
    const weakest = Object.entries(input.profile.weakness).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]
    roundRect(ctx, 84, 790, 912, 190, 18)
    ctx.fillStyle = '#171d18'; ctx.fill()
    ctx.fillStyle = '#91ad68'; setFont(ctx, 700, 23); ctx.fillText('下一阶段建议', 124, 850)
    ctx.fillStyle = '#eef4ec'; setFont(ctx, 800, 42); ctx.fillText(weakest ? `优先巩固 ${POSTER_SKILL_LABELS[weakest[0]] || weakest[0]}` : '继续积累训练数据', 124, 922)
  }

  ctx.fillStyle = '#d7ff75'
  setFont(ctx, 700, 29)
  ctx.fillText('每天 10 分钟，把整块指板变成自己的地图。', 84, 1248)
  ctx.fillStyle = '#657166'
  setFont(ctx, 500, 22)
  ctx.fillText(now.toLocaleDateString('zh-CN'), 84, 1330)
  ctx.textAlign = 'right'
  ctx.fillText(isBilibiliToyEnvironment() ? 'bilibili Toy · FretSeek' : 'FretSeek', 996, 1330)
  return canvas.toDataURL('image/jpeg', .9)
}

export async function savePosterImage(base64Data: string) {
  const toy = isBilibiliToyEnvironment() ? window.toy : undefined
  if (toy?.isSupport && toy.saveImageToAlbum && await toy.isSupport('saveImageToAlbum')) {
    await toy.saveImageToAlbum({ base64Data, hintMsg: '保存今日练习成绩图到相册' })
    return 'album'
  }
  const link = document.createElement('a')
  link.href = base64Data
  link.download = `fretseek-${Date.now()}.png`
  link.click()
  return 'download'
}
