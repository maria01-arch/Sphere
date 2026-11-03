
export function trimVideoToBlob(videoEl, start, end) {
  return new Promise((resolve, reject) => {
    const maxDim = 480
    const scale = Math.min(1, maxDim/Math.max(videoEl.videoWidth||maxDim, videoEl.videoHeight||maxDim))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round((videoEl.videoWidth||maxDim)*scale))
    canvas.height = Math.max(1, Math.round((videoEl.videoHeight||maxDim)*scale))
    const ctx = canvas.getContext('2d')
    const stream = canvas.captureStream(30)
    const mimeType = (typeof MediaRecorder!=='undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) ? 'video/webm;codecs=vp9' : 'video/webm'
    let recorder
    try { recorder = new MediaRecorder(stream, {mimeType}) } catch(e) { reject(e); return }
    const chunks = []
    recorder.ondataavailable = e => { if(e.data.size>0) chunks.push(e.data) }
    recorder.onerror = reject
    recorder.onstop = () => resolve(new Blob(chunks,{type:'video/webm'}))

    let rafId
    const stopAll = () => {
      videoEl.pause()
      if(rafId) cancelAnimationFrame(rafId)
      if(recorder.state!=='inactive') recorder.stop()
    }
    const draw = () => {
      if(videoEl.currentTime >= end || videoEl.paused || videoEl.ended) { stopAll(); return }
      ctx.drawImage(videoEl,0,0,canvas.width,canvas.height)
      rafId = requestAnimationFrame(draw)
    }
    videoEl.pause()
    videoEl.currentTime = start
    videoEl.onseeked = () => {
      videoEl.onseeked = null
      recorder.start()
      videoEl.play().then(()=>{ rafId = requestAnimationFrame(draw) }).catch(reject)
    }
    // safety timeout in case seeking/events never fire
    setTimeout(()=>{ if(recorder.state==='inactive'&&chunks.length===0) reject(new Error('Trim timed out')) }, (end-start)*1000 + 5000)
  })
}
