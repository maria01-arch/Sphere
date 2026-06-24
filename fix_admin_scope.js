const fs = require('fs');
let code = fs.readFileSync('src/components/SphereApp.js', 'utf8');

// Remove wrongly placed showAdmin/ADMIN_ID from AdminPanel
code = code.replace(
  `function AdminPanel({ currentUser, supabase, onBack }) {
  const [ads, setAds] = useState([])
  const [showAdmin, setShowAdmin] = useState(false)
  const ADMIN_ID = 'b29fa752-34f5-4a3e-a3e7-8178c2b176ae'
  const [showForm, setShowForm] = useState(false)`,
  `function AdminPanel({ currentUser, supabase, onBack }) {
  const [ads, setAds] = useState([])
  const [showForm, setShowForm] = useState(false)`
);

// Add showAdmin/ADMIN_ID correctly to SphereAppInner using unique anchor
code = code.replace(
  `function SphereAppInner({ currentUser }) {
  const [ads, setAds] = useState([])`,
  `function SphereAppInner({ currentUser }) {
  const [ads, setAds] = useState([])
  const [showAdmin, setShowAdmin] = useState(false)
  const ADMIN_ID = 'b29fa752-34f5-4a3e-a3e7-8178c2b176ae'`
);

fs.writeFileSync('src/components/SphereApp.js', code);
console.log('Done');
