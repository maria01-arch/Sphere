const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Remove wrongly placed useEffect from GroupChat
code = code.replace(
  `  useEffect(()=>{ loadAll() },[])
  useEffect(()=>{
    if(autoOpenGroup){setViewingGroup(autoOpenGroup);onAutoOpenDone&&onAutoOpenDone()}
  },[autoOpenGroup])
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])`,
  `  useEffect(()=>{ loadAll() },[])
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])`
);

// Add it correctly inside PulseTab after its own loadAll useEffect
code = code.replace(
  `  useEffect(()=>{ loadAll() },[])
  useEffect(()=>{
    const ch = supabase.channel('gc:'+group.id)`,
  `  useEffect(()=>{ loadAll() },[])
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])`
);

// Find PulseTab's useEffect and add autoOpenGroup handler there
code = code.replace(
  `function PulseTab({ currentUser, supabase, onUserClick, autoOpenGroup, onAutoOpenDone }) {`,
  `function PulseTab({ currentUser, supabase, onUserClick, autoOpenGroup, onAutoOpenDone }) {`
);

// Add useEffect in PulseTab after its loadAll
const pulseLoadAll = `  useEffect(()=>{ loadAll() },[])

  const loadAll = async () => {`;
code = code.replace(
  pulseLoadAll,
  `  useEffect(()=>{ loadAll() },[])
  useEffect(()=>{
    if(autoOpenGroup){setViewingGroup(autoOpenGroup);if(onAutoOpenDone)onAutoOpenDone()}
  },[autoOpenGroup])

  const loadAll = async () => {`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
