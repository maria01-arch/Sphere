const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Add popstate handler in SphereApp to prevent browser back from exiting
code = code.replace(
  `  const [hideNav, setHideNav] = useState(false)`,
  `  const [hideNav, setHideNav] = useState(false)
  useEffect(()=>{
    window.history.pushState(null,'',window.location.href)
    const handlePop = () => {
      window.history.pushState(null,'',window.location.href)
      if(viewingUser){setViewingUser(null);return}
      if(showMyProfile){setShowMyProfile(false);return}
      if(showSettings){setShowSettings(false);return}
    }
    window.addEventListener('popstate',handlePop)
    return()=>window.removeEventListener('popstate',handlePop)
  },[])`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
