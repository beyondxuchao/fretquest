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
const PART_ANCHORS:Record<string,[number,number]>={headstock:[276,85],tuners:[302,108],nut:[246,163],neck:[255,300],fretboard:[220,360],frets:[205,375],strings:[188,620],body:[120,700],soundhole:[208,548],bridge:[190,694]}
const STRING_PATHS=[
  '247.2,84.9 230.1,162.4 169.7,683.8 168.9,695.7','244.3,111 234.4,162.6 175.5,683.9 174.7,697.1','244.6,137.7 240.4,162.8 182.3,685.9 181.9,699.1',
  '274.4,82.8 246.4,162.1 189.4,688.3 188.9,700.6','268.1,107.2 251.5,162.3 197.6,691.1 197.2,702.4','266,133.7 256.7,163 204.8,692.3 204.2,704.2',
]
const FRET_LINES=[[232.2,514.7,187.6,509],[233,504.7,188.5,499.2],[234.6,493.1,189.9,488.2],[235.5,481.2,191.3,476.2],[236.9,468.9,192.7,464.5],[237.6,454.8,194.1,451],[239,441,195.7,437.8],[240.1,426.3,197.4,423.4],[242.2,410.1,199.2,407.8],[243.4,393.8,200.9,391.5],[244.8,375.4,203,374.2],[246.7,356.8,205.3,355.4],[248.1,336.4,207.6,336.1],[250.4,315.7,209.9,315.2],[252.2,292.8,212.7,292.6],[253.9,270,215.3,269.8],[256.5,245.9,218.3,245.6],[258.8,220.3,221.1,220.3],[261.5,192.8,224.4,192.6]]

type Props = { onNext?: () => void }

export function GuitarAnatomyPage({ onNext }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const activePart = PARTS[activeIndex]
  const progress = useMemo(() => ((activeIndex + 1) / PARTS.length) * 100, [activeIndex])
  const [calloutX,calloutY]=PART_ANCHORS[activePart.id]

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
              <filter id="active-part-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#d7ff75" floodOpacity=".9"/>
              </filter>
            </defs>
            <g className="guitar-reference-base">
              {GUITAR_LAYER_IDS.map((id) => <use key={id} href={`/assets/acoustic-guitar-reference.svg#${id}`}/>) }
            </g>
            <g className={`anatomy-exact-highlight highlight-${activePart.id}`} filter="url(#active-part-glow)">
              {activePart.id==='headstock'&&<use href="/assets/acoustic-guitar-reference.svg#q9"/>}
              {activePart.id==='neck'&&<use href="/assets/acoustic-guitar-reference.svg#q2"/>}
              {activePart.id==='body'&&<><use href="/assets/acoustic-guitar-reference.svg#q4"/><use href="/assets/acoustic-guitar-reference.svg#q5"/><ellipse className="body-soundhole-cutout" cx="208" cy="548.5" rx="38.6" ry="48.2"/></>}
              {activePart.id==='fretboard'&&<polygon points="264.1,163.8 230.9,531 185.3,525.1 227.4,163.6"/>}
              {activePart.id==='nut'&&<line x1="227.5" y1="163" x2="264" y2="163"/>}
              {activePart.id==='soundhole'&&<ellipse cx="208" cy="548.5" rx="38.6" ry="48.2"/>}
              {activePart.id==='bridge'&&<polygon points="245.9,695.9 244.3,718.8 138.5,692.3 139.7,670.1"/>}
              {activePart.id==='strings'&&STRING_PATHS.map((points,index)=><polyline key={index} points={points}/>)}
              {activePart.id==='frets'&&FRET_LINES.map((line,index)=><line key={index} x1={line[0]} y1={line[1]} x2={line[2]} y2={line[3]}/>)}
              {activePart.id==='tuners'&&[[248.9,85.3],[246.7,111.4],[243.9,138.2],[275.6,83.5],[270.2,108.4],[264,133.5]].map(([cx,cy],index)=><circle key={index} cx={cx} cy={cy} r="7"/>)}
            </g>
          </svg>
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
