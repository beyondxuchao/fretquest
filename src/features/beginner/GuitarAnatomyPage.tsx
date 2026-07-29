import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type GuitarPart = {
  id: string
  name: string
  english: string
  summary: string
  detail: string
  x: number
  y: number
  width: number
  height: number
}

const PARTS: GuitarPart[] = [
  { id: 'headstock', name: '琴头', english: 'Headstock', summary: '承载调音系统，连接琴颈。', detail: '琴头位于吉他最前端，固定六枚弦钮。琴弦在这里缠绕并沿着琴颈一直延伸到琴桥。', x: 40, y: 15, width: 10, height: 8 },
  { id: 'tuners', name: '弦钮', english: 'Tuners', summary: '调节每根琴弦的松紧。', detail: '转动弦钮会改变琴弦张力：拧紧时音高通常升高，放松时音高降低。每根弦都有独立的弦钮。', x: 35, y: 14, width: 20, height: 12 },
  { id: 'nut', name: '上弦枕', english: 'Nut', summary: '固定弦距，也是空弦起点。', detail: '上弦枕上的六道细槽让琴弦保持正确间距。弹空弦时，琴弦从上弦枕到下弦枕之间振动。', x: 41, y: 20, width: 8, height: 3 },
  { id: 'neck', name: '琴颈', english: 'Neck', summary: '支撑指板，连接琴头和琴身。', detail: '琴颈承担琴弦的拉力，也是左手移动和支撑的位置。它需要足够笔直，才能让每个品位清晰发声。', x: 39, y: 21, width: 11, height: 31 },
  { id: 'fretboard', name: '指板', english: 'Fretboard', summary: '左手按弦和寻找音高的地图。', detail: '深色的指板贴合在琴颈正面。左手把琴弦压向指板上的品丝，从而缩短有效弦长、改变音高。', x: 40.5, y: 21, width: 8, height: 34 },
  { id: 'frets', name: '品丝', english: 'Frets', summary: '划分半音位置的金属条。', detail: '每向琴身方向移动一品，音高升高一个半音。品丝间距会逐渐变窄，这是由弦长比例决定的。', x: 40, y: 24, width: 9, height: 29 },
  { id: 'strings', name: '琴弦', english: 'Strings', summary: '六根振动发声的琴弦。', detail: '标准吉他有六根弦。面对吉他时，最粗的是第 6 弦，声音最低；最细的是第 1 弦，声音最高。', x: 42, y: 20, width: 5, height: 67 },
  { id: 'body', name: '琴身', english: 'Body', summary: '让琴弦的声音变得响亮饱满。', detail: '琴身由面板、背板和侧板组成。琴弦的振动经琴桥传到面板，再由中空箱体共鸣放大。', x: 13, y: 51, width: 46, height: 48 },
  { id: 'soundhole', name: '音孔', english: 'Sound Hole', summary: '共鸣箱与外界交换空气的开口。', detail: '音孔不是声音唯一的出口，但它会影响箱体内空气的共鸣。弹奏时，音孔周围能感到明显的空气振动。', x: 28, y: 60, width: 15, height: 12 },
  { id: 'bridge', name: '琴桥', english: 'Bridge', summary: '固定琴弦并把振动传给面板。', detail: '琴桥固定琴弦的另一端。白色下弦枕托住琴弦，并把振动高效传递到吉他面板。', x: 25, y: 79, width: 19, height: 8 },
]

const GUITAR_LAYER_IDS = ['q1shadowright', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10topright', 'q11topleft']

type Props = { onNext?: () => void }

export function GuitarAnatomyPage({ onNext }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const activePart = PARTS[activeIndex]
  const progress = useMemo(() => ((activeIndex + 1) / PARTS.length) * 100, [activeIndex])
  const calloutX = (activePart.x + activePart.width) * 6
  const calloutY = (activePart.y + activePart.height / 2) * 8.26
  const highlightX = activePart.x * 6
  const highlightY = activePart.y * 8.26
  const highlightWidth = activePart.width * 6
  const highlightHeight = activePart.height * 8.26
  const highlightCenterX = highlightX + highlightWidth / 2
  const highlightCenterY = highlightY + highlightHeight / 2

  useEffect(() => {
    if (!playing) return
    const timer = window.setTimeout(() => {
      setActiveIndex((index) => {
        if (index === PARTS.length - 1) {
          setPlaying(false)
          return index
        }
        return index + 1
      })
    }, 2800)
    return () => window.clearTimeout(timer)
  }, [activeIndex, playing])

  const go = (index: number) => setActiveIndex(Math.max(0, Math.min(PARTS.length - 1, index)))

  return <section className="anatomy-page">
    <div className="anatomy-shell">
      <div className="anatomy-stage">
        <div className="anatomy-svg-wrap anatomy-reference-wrap">
          <div className="guitar-reference-canvas">
          <svg className="guitar-reference-svg" viewBox="0 0 600 826" role="img" aria-label="竖直放置的古典吉他真实结构图">
            <defs>
              <clipPath id="active-guitar-part">
                <ellipse cx={highlightCenterX} cy={highlightCenterY} rx={highlightWidth * .62} ry={highlightHeight * .62}/>
              </clipPath>
              <filter id="active-part-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#d7ff75" floodOpacity=".82"/>
              </filter>
            </defs>
            <g className="guitar-reference-base">
              {GUITAR_LAYER_IDS.map((id) => <use key={id} href={`/assets/acoustic-guitar-reference.svg#${id}`}/>) }
            </g>
            <g clipPath="url(#active-guitar-part)" className="guitar-reference-focus" filter="url(#active-part-glow)"
              transform={`translate(${highlightCenterX} ${highlightCenterY}) scale(1.1) translate(${-highlightCenterX} ${-highlightCenterY})`}>
              {GUITAR_LAYER_IDS.map((id) => <use key={`focus-${id}`} href={`/assets/acoustic-guitar-reference.svg#${id}`}/>) }
            </g>
          </svg>
          <div className="guitar-hotspots" aria-label="吉他部件选择">
            {PARTS.map((part, index) => <button
              key={part.id}
              className={index === activeIndex ? 'active' : ''}
              style={{ left: `${part.x}%`, top: `${part.y}%`, width: `${part.width}%`, height: `${part.height}%` }}
              onClick={() => go(index)}
              aria-label={part.name}
            />)}
          </div>
          <svg className="guitar-callout-overlay" viewBox="0 0 600 826" aria-hidden="true">
            <line x1={calloutX} y1={calloutY} x2="430" y2={calloutY}/>
            <circle cx={calloutX} cy={calloutY} r="6"/>
            <rect x="430" y={calloutY - 29} width="158" height="58" rx="7"/>
            <text className="callout-name" x="447" y={calloutY - 4}>{activePart.name}</text>
            <text className="callout-english" x="447" y={calloutY + 15}>{activePart.english.toUpperCase()}</text>
          </svg>
          </div>
        </div>

        <div className="anatomy-control-bar">
          <button onClick={() => { setActiveIndex(0); setPlaying(false) }} aria-label="重新播放"><RotateCcw size={16}/></button>
          <button onClick={() => go(activeIndex - 1)} disabled={activeIndex === 0} aria-label="上一个部件"><SkipBack size={16}/></button>
          <button className="anatomy-play" onClick={() => setPlaying((value) => !value)}>{playing ? <><Pause size={16}/>暂停</> : <><Play size={16}/>播放讲解</>}</button>
          <button onClick={() => go(activeIndex + 1)} disabled={activeIndex === PARTS.length - 1} aria-label="下一个部件"><SkipForward size={16}/></button>
          <div className="anatomy-progress"><i style={{ width: `${progress}%` }}/></div>
        </div>
        <p className="guitar-credit">吉他图：William Crochot / Wikimedia Commons · CC BY-SA 4.0</p>
      </div>

      <aside className="anatomy-panel">
        <span>LESSON 01 · GUITAR ANATOMY</span>
        <h2>{activePart.name}</h2><strong>{activePart.english}</strong><p>{activePart.detail}</p>
        <div className="anatomy-counter"><b>{activeIndex + 1}</b><small>/ {PARTS.length}</small></div>
        <div className="anatomy-parts">
          {PARTS.map((part, index) => <button key={part.id} className={index === activeIndex ? 'active' : ''} onClick={() => go(index)}>
            <i>{String(index + 1).padStart(2, '0')}</i><span><strong>{part.name}</strong><small>{part.summary}</small></span>
          </button>)}
        </div>
        <button className="anatomy-next-lesson" onClick={onNext}>我认识了，下一课</button>
      </aside>
    </div>
  </section>
}
