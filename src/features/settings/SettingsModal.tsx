import { Settings2, Trash2, X } from 'lucide-react'
import type { FretboardStyle } from '../../types'

type SettingsModalProps = {
  minFret: number
  maxFret: number
  fretboardStyle: FretboardStyle
  activeStrings: boolean[]
  stringNames: readonly string[]
  onMinFretChange: (value: number) => void
  onMaxFretChange: (value: number) => void
  onFretboardStyleChange: (style: FretboardStyle) => void
  onToggleString: (index: number) => void
  onClearCache: () => void
  onClose: () => void
}

const BOARD_STYLES: Array<{value:FretboardStyle;preview:string;name:string;description:string}> = [
  {value:'practice',preview:'practice-preview',name:'训练模式',description:'高对比，更容易定位'},
  {value:'realistic',preview:'wood-preview',name:'玫瑰木',description:'经典深棕色木纹'},
  {value:'ebony',preview:'ebony-preview',name:'乌木',description:'近黑色，纹理细密'},
  {value:'maple',preview:'maple-preview',name:'枫木',description:'浅黄明亮木色'},
]

export function SettingsModal({ minFret, maxFret, fretboardStyle, activeStrings, stringNames, onMinFretChange, onMaxFretChange, onFretboardStyleChange, onToggleString, onClearCache, onClose }: SettingsModalProps) {
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <aside className="modal" onMouseDown={(event) => event.stopPropagation()}>
      <button className="modal-close" onClick={onClose}><X size={20}/></button>
      <div className="modal-icon"><Settings2 size={21}/></div><h2>训练设置</h2><p>控制本局出现的指板范围</p>
      <label className="field-label">练习范围 <strong>{minFret} – {maxFret} 品</strong></label>
      <div className="dual-fret-range"><div className="dual-range-track" style={{background:`linear-gradient(90deg,#303630 0 ${((minFret-1)/17)*100}%,#b8ee50 ${((minFret-1)/17)*100}% ${((maxFret-1)/17)*100}%,#303630 ${((maxFret-1)/17)*100}% 100%)`}}/><input aria-label="起始品" type="range" min="1" max="18" value={minFret} onChange={(event) => onMinFretChange(Math.min(Number(event.target.value), maxFret - 1))}/><input aria-label="结束品" type="range" min="1" max="18" value={maxFret} onChange={(event) => onMaxFretChange(Math.max(Number(event.target.value), minFret + 1))}/><div className="dual-range-values"><span>起始 <b>{minFret}</b></span><span>结束 <b>{maxFret}</b></span></div></div>
      <label className="field-label board-style-title">指板外观</label>
      <div className="board-style-options">{BOARD_STYLES.map((style) => <button key={style.value} className={fretboardStyle === style.value ? 'selected' : ''} onClick={() => onFretboardStyleChange(style.value)}><span className={`style-preview ${style.preview}`}><i/><i/><i/></span><strong>{style.name}</strong><small>{style.description}</small></button>)}</div>
      <label className="field-label strings-title">参与练习的弦</label>
      <div className="string-toggles">{stringNames.map((name,index) => <button key={name} className={activeStrings[index] ? 'selected' : ''} onClick={() => onToggleString(index)}>{name}</button>)}</div>
      <button className="clear-cache" onClick={onClearCache}><Trash2 size={15}/> 清空本地缓存并恢复默认</button>
      <button className="primary modal-save" onClick={onClose}>保存设置</button>
    </aside>
  </div>
}
