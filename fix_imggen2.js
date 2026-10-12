const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

code = code.replace(
  `  const generateImage = async() => {
    if(!imgPrompt.trim()) return
    setGeneratingImg(true)
    setGenImg(null)
    try {
      const url = 'https://image.pollinations.ai/prompt/'+encodeURIComponent(imgPrompt+', high quality, detailed, 4k')+'?width=768&height=768&nologo=true&seed='+Math.floor(Math.random()*99999)
      const img = new Image()
      img.onload = () => { setGenImg(url); setGeneratingImg(false) }
      img.onerror = () => {
        const fallback = 'https://image.pollinations.ai/prompt/'+encodeURIComponent(imgPrompt)+'?width=512&height=512&nologo=true&seed='+Math.floor(Math.random()*99999)
        setGenImg(fallback); setGeneratingImg(false)
      }
      img.src = url
    } catch(e) { setGeneratingImg(false); alert('Image generation failed, try again') }
  }`,
  `  const generateImage = async() => {
    if(!imgPrompt.trim()) return
    setGeneratingImg(true)
    setGenImg(null)
    try {
      const res = await fetch('/api/imagine',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:imgPrompt})})
      const data = await res.json()
      if(data.image) setGenImg(data.image)
      else alert('Generation failed, try again')
    } catch(e) { alert('Error: '+e.message) }
    setGeneratingImg(false)
  }`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
