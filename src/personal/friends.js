
import { supabase } from '../db/supabase.js'

let me = null, myP = null
let following = new Set(), followers = new Set(), friends = new Set()
let followingData = [], followersData = []
let activeTab = 'friends'

const tabMeta = {
  friends:   { title: 'Friends',       sub: 'People who follow each other' },
  followers: { title: 'Followers',     sub: 'People who follow you' },
  following: { title: 'Following',     sub: 'People you follow' },
  find:      { title: '🔎 Find People', sub: 'Discover new swappers on Suot' }
}

// ====== BOOT ======
const { data: { session } } = await supabase.auth.getSession()
if (!session) { location.href = '../auth/login.html' }
me = session.user

const { data: p } = await supabase.from('profiles').select('*').eq('id', me.id).single()
myP = p || {}
document.getElementById('navName').textContent = myP.display_name || myP.username || 'You'
document.getElementById('navAv').src = myP.avatar_url || av(myP.display_name || 'U')

await loadAll()
updMsgBadge()

supabase.channel('follows-rt')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, async () => { await loadAll() })
  .subscribe()

// ====== LOAD ALL ======
async function loadAll() {
  const [fwingRes, fwersRes] = await Promise.all([
    supabase.from('follows').select('following_id').eq('follower_id', me.id),
    supabase.from('follows').select('follower_id').eq('following_id', me.id)
  ])

  following = new Set((fwingRes.data || []).map(f => f.following_id))
  followers = new Set((fwersRes.data || []).map(f => f.follower_id))
  friends   = new Set([...following].filter(id => followers.has(id)))

  const allIds = [...new Set([...following, ...followers])]
  let profMap = {}
  if (allIds.length) {
    const { data: profs } = await supabase.from('profiles').select('id,username,display_name,avatar_url').in('id', allIds)
    profs?.forEach(pr => profMap[pr.id] = pr)
  }

  followingData = [...following].map(id => profMap[id]).filter(Boolean)
  followersData = [...followers].map(id => profMap[id]).filter(Boolean)

  const fc = friends.size, frc = followers.size, fwc = following.size
  document.getElementById('cnt-friends').textContent     = fc
  document.getElementById('cnt-followers').textContent   = frc
  document.getElementById('cnt-following').textContent   = fwc
  document.getElementById('tbadge-friends').textContent  = fc
  document.getElementById('tbadge-followers').textContent = frc
  document.getElementById('tbadge-following').textContent = fwc

  renderTab(activeTab)
}

// ====== TABS ======
window.switchTab = function(tab) {
  activeTab = tab
  ;['friends','followers','following','find'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle('active', t === tab)
    const s = document.getElementById(`stat-${t}`)
    if (s) s.classList.toggle('active', t === tab)
  })
  const m = tabMeta[tab]
  document.getElementById('rightTitle').textContent = m.title
  document.getElementById('rightSub').textContent   = m.sub
  document.getElementById('frSearch').style.opacity = tab === 'find' ? '0' : '1'
  document.getElementById('frSearch').style.pointerEvents = tab === 'find' ? 'none' : ''
  renderTab(tab)
}

function renderTab(tab) {
  const el = document.getElementById('frContent')
  if (tab === 'friends') {
    const list = followingData.filter(u => friends.has(u.id))
    if (!list.length) { el.innerHTML = emptyHTML(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="width:1.35em;height:1.35em;display:inline-block;vertical-align:middle;"><path d="M7.5 13.5c1.5 1.5 3.2 2.3 4.5 2.3 1.4 0 3.2-.8 4.5-2.3"/><path d="M7 12c-1.2-1.2-2-2.3-2-3.6 0-1.4 1.1-2.4 2.4-2.4 1 0 1.8.6 2.6 1.4"/><path d="M17 12c1.2-1.2 2-2.3 2-3.6 0-1.4-1.1-2.4-2.4-2.4-1 0-1.8.6-2.6 1.4"/></svg>`,'No friends yet','Follow someone and when they follow back, they\'ll show up here.','find'); return }
    el.innerHTML = `<div class="fr-grid">${list.map((u,i) => personCard(u,i)).join('')}</div>`
  } else if (tab === 'followers') {
    if (!followersData.length) { el.innerHTML = emptyHTML('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="width:1.35em;height:1.35em;display:inline-block;vertical-align:middle;"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="20 8 20 14 16 12"/></svg>','No followers yet','Post items and be active in the community!'); return }
    el.innerHTML = `<div class="fr-grid">${followersData.map((u,i) => personCard(u,i)).join('')}</div>`
  } else if (tab === 'following') {
    if (!followingData.length) { el.innerHTML = emptyHTML('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="width:1.35em;height:1.35em;display:inline-block;vertical-align:middle;"><path d="m12 17.27 4.8-3.86a4 4 0 0 0 2.2-3.41V8a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v1.99a4 4 0 0 0 2.2 3.41L12 17.27z" stroke-width="2.4"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></svg>','Not following anyone','Discover swappers and follow them!','find'); return }
    el.innerHTML = `<div class="fr-grid">${followingData.map((u,i) => personCard(u,i)).join('')}</div>`
  } else if (tab === 'find') {
    el.innerHTML = `
      <div class="find-box">
        <div class="find-label">Search for a Swapper</div>
        <div class="find-row">
          <input class="find-inp" id="findInp" type="text" placeholder="Enter username or display name..." onkeydown="if(event.key==='Enter')searchPeople()"/>
          <button class="find-btn" onclick="searchPeople()">Search</button>
        </div>
      </div>
      <div id="findResults"></div>`
    setTimeout(() => document.getElementById('findInp')?.focus(), 50)
  }
}

function emptyHTML(icon, title, desc, findBtn = null) {
  return `<div class="fr-empty">
    <div class="fr-empty-icon">${icon}</div>
    <h4>${title}</h4>
    <p>${desc}</p>
    ${findBtn ? `<button class="fr-empty-btn" onclick="switchTab('${findBtn}')">Find People</button>` : ''}
  </div>`
}

// ====== PERSON CARD ======
function personCard(u, i) {
  const name = u.display_name || u.username || 'User'
  const ava  = u.avatar_url || av(name)
  const isFriend    = friends.has(u.id)
  const isFollowing = following.has(u.id)
  const isFollower  = followers.has(u.id)

  let badges = ''
  if (isFriend)                   badges += `<span class="pc-badge friends"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="width:1.05em;height:1.05em;display:inline-block;vertical-align:-0.15em;margin-right:.35em;"><path d="M7.5 13.5c1.5 1.5 3.2 2.3 4.5 2.3 1.4 0 3.2-.8 4.5-2.3"/><path d="M7 12c-1.2-1.2-2-2.3-2-3.6 0-1.4 1.1-2.4 2.4-2.4 1 0 1.8.6 2.6 1.4"/><path d="M17 12c1.2-1.2 2-2.3 2-3.6 0-1.4-1.1-2.4-2.4-2.4-1 0-1.8.6-2.6 1.4"/></svg>Friends</span>`
  if (isFollowing && !isFollower) badges += `<span class="pc-badge following">✨ Following</span>`
  if (isFollower && !isFollowing) badges += `<span class="pc-badge follower"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;display:inline-block;vertical-align:middle;margin-right:0.25em;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> Follows you</span>`

  const followBtn = isFollowing
    ? `<button class="btn-follow unfollow" onclick="toggleFollow('${u.id}',false,this)">Unfollow</button>`
    : `<button class="btn-follow follow" onclick="toggleFollow('${u.id}',true,this)">${isFollower ? 'Follow Back' : 'Follow'}</button>`

  return `<div class="person-card ${isFriend ? 'friend' : ''}" id="pc-${u.id}" style="animation-delay:${i * 35}ms">
    <img class="pc-av" src="${ava}" alt="${esc(name)}" onclick="location.href='../profile/profile.html?userId=${u.id}'"/>
    <div class="pc-info" onclick="location.href='../profile/profile.html?userId=${u.id}'">
      <div class="pc-name">${esc(name)}</div>
      <div class="pc-user">@${esc(u.username || 'user')}</div>
      <div class="pc-badges">${badges}</div>
    </div>
    <div class="pc-actions">
      <button class="btn-msg" title="Message" onclick="location.href='message.html?with=${u.id}'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="width:1.05em;height:1.05em;display:inline-block;vertical-align:-0.15em;"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg></button>
      ${followBtn}
    </div>
  </div>`
}

// ====== FOLLOW / UNFOLLOW ======
window.toggleFollow = async function(userId, doFollow, btn) {
  btn.disabled = true
  if (doFollow) {
    const { error } = await supabase.from('follows').insert({ follower_id: me.id, following_id: userId })
    if (error) { showToast('Could not follow. Try again.'); btn.disabled = false; return }
    following.add(userId)
    if (followers.has(userId)) friends.add(userId)
    showToast(friends.has(userId) ? 'You\'re now friends!' : 'Following!')
  } else {
    const { error } = await supabase.from('follows').delete().eq('follower_id', me.id).eq('following_id', userId)
    if (error) { showToast('Could not unfollow. Try again.'); btn.disabled = false; return }
    following.delete(userId)
    friends.delete(userId)
    showToast('Unfollowed.')
  }
  await loadAll()
}

// ====== FIND ======
window.searchPeople = async function() {
  const q = document.getElementById('findInp')?.value.trim()
  if (!q) return
  const el = document.getElementById('findResults')
  el.innerHTML = `<div class="ldr"><div class="spin"></div> Searching...</div>`
  const { data } = await supabase.from('profiles')
    .select('id,username,display_name,avatar_url')
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .neq('id', me.id).limit(12)
  if (!data?.length) { el.innerHTML = emptyHTML('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="width:1.35em;height:1.35em;display:inline-block;vertical-align:middle;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" stroke-width="2.4"/></svg>','No results','Try a different name or username.'); return }
  el.innerHTML = `<div class="fr-grid">${data.map((u,i) => personCard(u,i)).join('')}</div>`
}

// ====== FILTER ======
window.filterCards = function(q) {
  document.querySelectorAll('.person-card').forEach(c => {
    const n = (c.querySelector('.pc-name')?.textContent || '').toLowerCase()
    const u = (c.querySelector('.pc-user')?.textContent || '').toLowerCase()
    c.style.display = (!q || n.includes(q.toLowerCase()) || u.includes(q.toLowerCase())) ? '' : 'none'
  })
}

// ====== MSG BADGE ======
async function updMsgBadge() {
  const { data } = await supabase.from('messages').select('id').eq('to_user_id', me.id).eq('read', false)
  const b = document.getElementById('msgBadge')
  if (data?.length) { b.textContent = data.length; b.style.display = 'flex' } else b.style.display = 'none'
}

// ====== UTILS ======
function av(n) { return `https://ui-avatars.com/api/?name=${encodeURIComponent(n)}&background=EBE0E3&color=C994A7&size=100` }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }
function showToast(msg) {
  const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show')
  setTimeout(() => t.classList.remove('show'), 3000)
}
window.doLogout = () => location.href = '../auth/login.html'
