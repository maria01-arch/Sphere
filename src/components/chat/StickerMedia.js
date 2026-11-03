'use client'
import { NO_CALLOUT_STYLE, VIDEO_EXT } from '@/lib/constants'

export function StickerMedia({ url, size=132 }) {
  const blockContextMenu = (e)=>e.preventDefault()
  if(VIDEO_EXT.test(url)) {
    return <video src={url} autoPlay loop muted playsInline disablePictureInPicture controlsList="nodownload noplaybackrate"
      onContextMenu={blockContextMenu} draggable={false}
      style={{width:size,height:size,objectFit:'contain',display:'block',...NO_CALLOUT_STYLE}}/>
  }
  return <img src={url} alt="sticker" loading="lazy" draggable={false} onContextMenu={blockContextMenu}
    style={{width:size,height:size,objectFit:'contain',display:'block',...NO_CALLOUT_STYLE,pointerEvents:'auto'}}/>
}
