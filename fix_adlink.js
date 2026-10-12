const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Fix AdCard click to add https:// if missing
code = code.replace(
  `function AdCard({ ad }) {
  return (
    <div onClick={()=>ad.link_url&&window.open(ad.link_url,'_blank')}`,
  `function AdCard({ ad }) {
  const openLink = () => {
    if(!ad.link_url) return
    const url = ad.link_url.startsWith('http')?ad.link_url:'https://'+ad.link_url
    window.open(url,'_blank')
  }
  return (
    <div onClick={openLink}`
);

// Same fix for reel ad link
code = code.replace(
  `{currentAd.link_url&&<button onClick={()=>window.open(currentAd.link_url,'_blank')}`,
  `{currentAd.link_url&&<button onClick={()=>window.open(currentAd.link_url.startsWith('http')?currentAd.link_url:'https://'+currentAd.link_url,'_blank')}`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
