import { fetchItem, supabase } from '../db/supabase.js'
// ── DATA ──
const params = new URLSearchParams(window.location.search);
const itemId = params.get('id');

// identify current local user id & current session user
const __suot_uid = localStorage.getItem('suotUserId') || 'anon';
let currentUser = null;
// obtain current user synchronously using top-level await
try {
    const { data:{ session } } = await supabase.auth.getSession();
    if (session) currentUser = session.user;
} catch(e) {
    console.error('failed to fetch session', e);
}

 const allPosted = []; // no longer using localStorage for items
const FALLBACK_ITEMS = [
  { id:'demo1', name:'Yellow Street Set', category:'Tops', brand:'Unbranded', condition:'Like New', size:'S', pts:550, tags:['Streetwear','Y2K'], desc:'A bold yellow co-ord set, perfect for summer streetwear looks.', image:'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800', postedAt:new Date().toISOString(), swapper:{name:'Ale Santos',handle:'@thriftbyale',swaps:24,rating:'4.9',items:12} },
  { id:'demo2', name:'Vintage Denim', category:'Bottoms', brand:"Levi's", condition:'Good', size:'27', pts:700, tags:['Vintage','Casual'], desc:"Classic Levi's straight-leg denim from the 90s.", image:'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800', postedAt:new Date(Date.now()-86400000*3).toISOString(), swapper:{name:'Mia Reyes',handle:'@miasfinds',swaps:41,rating:'5.0',items:28} },
  { id:'demo3', name:'Minimalist Watch', category:'Accessories', brand:'Unbranded', condition:'Very Good', size:'Free', pts:400, tags:['Minimal','Formal'], desc:'Clean, minimalist watch face with a tan leather strap.', image:'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=800', postedAt:new Date(Date.now()-86400000*7).toISOString(), swapper:{name:'Carlo Tan',handle:'@carlosclothes',swaps:9,rating:'4.7',items:7} },
  { id:'demo4', name:'Classic White Tee', category:'Tops', brand:'COS', condition:'Like New', size:'M', pts:250, tags:['Minimal','Casual'], desc:'Premium cotton white tee, barely worn.', image:'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800', postedAt:new Date(Date.now()-86400000).toISOString(), swapper:{name:'Sofia Cruz',handle:'@sofiasswap',swaps:17,rating:'4.8',items:15} },
  { id:'demo5', name:'Pleated Midi Skirt', category:'Bottoms', brand:'Zara', condition:'Good', size:'S', pts:600, tags:['Formal','Minimal'], desc:'Elegant pleated midi skirt in dusty rose. Perfect for work or events.', image:'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800', postedAt:new Date(Date.now()-86400000*2).toISOString(), swapper:{name:'Rica Lim',handle:'@ricalim',swaps:33,rating:'4.8',items:20} }
];


function getMyProfile() {
    try {
        return JSON.parse(localStorage.getItem(`suot_profile_${__suot_uid}`) || localStorage.getItem('suot_profile') || '{}');
    } catch(e) { return {}; }
}

const myProf = getMyProfile();
const mySwapper = myProf && myProf.id ? {
    name: myProf.display_name || myProf.username || 'Me',
    handle: myProf.username ? '@' + myProf.username : '',
    swaps: 0, rating: '—', items: allPosted.length
} : { name:'You', handle:'', swaps:0, rating:'—', items: allPosted.length };

const allItems = [
  ...allPosted.map(i => ({
    ...i,
    swapper: i.swapper || mySwapper
  })),
  ...FALLBACK_ITEMS
];

let item = allItems.find(i => String(i.id) === String(itemId)) || allItems[0];

// If an id is provided try to load the authoritative item from the DB
if (itemId) {
  (async () => {
    try {
      const dbItem = await fetchItem(itemId)
      if (dbItem) {
        item = dbItem
      }
    } catch (e) {
      console.error('fetchItem failed', e)
    }
    populatePage()
    syncWishlistBtn()
  })()
} else {
  populatePage()
  syncWishlistBtn()
}

// ── IMAGE STATE ──
let currentImgIndex = 0;
let imgs = [];

// ── POPULATE PAGE ──
function populatePage() {
  if (!item) return;

  // ownership calculation based on DB user_id (preferred) or local post id
const isOwner = currentUser && item.user_id && item.user_id === currentUser.id;

  // hide swap/message/wishlist when looking at own listing; show owner controls instead
  if (isOwner) {
    const area = document.querySelector('.action-area');
    if (area) area.style.display = 'none';
    const ownerArea = document.getElementById('ownerActionArea');
    if (ownerArea) ownerArea.classList.add('show');
  }


  // Build images array — support both item.images[] and legacy item.image
  imgs = (item.images && item.images.length)
    ? item.images
    : (item.image ? [item.image] : ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800']);

  currentImgIndex = 0;

  // Set main image
  const mainImg = document.getElementById('mainImage');
  mainImg.src = imgs[0];

  // Show/hide arrows & counter
  const showMulti = imgs.length > 1;
  document.getElementById('galleryPrev').style.display    = showMulti ? 'flex' : 'none';
  document.getElementById('galleryNext').style.display    = showMulti ? 'flex' : 'none';
  document.getElementById('imgCounter').style.display     = showMulti ? 'block' : 'none';
  updateCounter();

  // Build thumbnails
  const thumbRow = document.getElementById('thumbRow');
  thumbRow.innerHTML = '';
  if (showMulti) {
    imgs.forEach((src, idx) => {
      const t = document.createElement('div');
      t.className = 'thumb' + (idx === 0 ? ' active' : '');
      t.innerHTML = `<img src="${src}" alt="Photo ${idx+1}">`;
      t.onclick = () => goToImage(idx);
      thumbRow.appendChild(t);
    });
  }

  // Badges
  document.getElementById('badgeCategory').textContent  = item.category || '—';
  document.getElementById('badgeCondition').textContent = item.condition || '—';

  // Header
  document.getElementById('navCategory').textContent     = item.category || '—';
  document.getElementById('eyebrowCategory').textContent = item.category || '—';
  document.getElementById('eyebrowBrand').textContent    = item.brand || 'Unbranded';
  document.getElementById('itemName').textContent        = item.name || '—';
  document.getElementById('itemPrice').innerHTML         = `${(item.pts||0).toLocaleString()} <small>pts</small>`;
  document.getElementById('itemListed').textContent      = timeAgo(item.created_at || item.postedAt);

  // Meta pills
  document.getElementById('metaSize').textContent      = item.size || '—';
  document.getElementById('metaCondition').textContent = item.condition || '—';
  document.getElementById('metaCategory').textContent  = item.category || '—';

  // Tags
  const tags = item.tags || [];
  if (tags.length) {
    document.getElementById('tagsSection').style.display = 'block';
    document.getElementById('tagsRow').innerHTML = tags.map(t => `<span class="style-tag">${t}</span>`).join('');
  }

  // Description — DB uses 'description', local fallback uses 'desc'
  const descText = item.description || item.desc;
  if (descText) {
    document.getElementById('descSection').style.display = 'block';
    document.getElementById('itemDesc').textContent = descText;
  }

  // ── MAP: show meetup location ──
  const lat = parseFloat(item.latitude)
  const lng = parseFloat(item.longitude)
  if (!isNaN(lat) && !isNaN(lng)) {
    initMeetupMap(lat, lng, item.meetup_address || null)
  } else if (item.meetup_address) {
    const section = document.getElementById('meetupSection')
    section.classList.add('show')
    document.getElementById('meetupAddress').textContent = item.meetup_address
    document.getElementById('detailMap').style.display = 'none'
    document.getElementById('meetupDirections').style.display = 'none'
  }
  // Update owner button label based on whether location is already set
  if (isOwner) {
    const hasLoc = (!isNaN(lat) && !isNaN(lng)) || item.meetup_address
    const btn = document.getElementById('btnSetLocation')
    const lbl = document.getElementById('btnSetLocationLabel')
    if (btn && lbl) {
      lbl.textContent = hasLoc ? 'Update Meetup Location' : 'Set Meetup Location'
      if (hasLoc) btn.classList.add('has-location')
    }
  }

  // Swapper — always use DB-joined profiles row; never override with viewer's own cache
  let profileData = item.profiles || item.swapper || {};
  // supabase may return profiles as an array; grab the first element
  if (Array.isArray(profileData)) profileData = profileData[0] || {};
  const avatarUrl = profileData.avatar_url || profileData.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.display_name||profileData.name||'S')}&background=EBE0E3&color=C994A7&size=100`;
  document.getElementById('swapperAvatar').src = avatarUrl;
  const displayName = profileData.display_name || profileData.name || profileData.username || 'Swapper';
  const username    = profileData.username ? '@' + profileData.username : (profileData.handle || '@swapper');
  document.getElementById('swapperName').textContent   = displayName;
  document.getElementById('swapperHandle').textContent = username;
  // stats not tracked in DB yet; hide section if no data
  if (profileData.swaps || profileData.rating || profileData.items) {
      document.getElementById('swapperSwaps').textContent  = profileData.swaps  || '—';
      document.getElementById('swapperRating').textContent = profileData.rating || '—';
      document.getElementById('swapperItems').textContent  = profileData.items  || '—';
  } else {
      document.querySelector('.swapper-stats').style.display = 'none';
  }
  // store username for profile link
  window.__swUsername = profileData.username || '';

  document.title = `Suot | ${item.name}`;
  renderRelated();
}

// ── GALLERY NAVIGATION ──
function goToImage(idx) {
  currentImgIndex = idx;
  const mainImg = document.getElementById('mainImage');
  mainImg.style.opacity = '0';
  setTimeout(() => {
    mainImg.src = imgs[idx];
    mainImg.style.opacity = '1';
  }, 150);
  // Update thumbs
  document.querySelectorAll('.thumb').forEach((t, i) => t.classList.toggle('active', i === idx));
  updateCounter();
}

function galleryMove(dir) {
  const next = (currentImgIndex + dir + imgs.length) % imgs.length;
  goToImage(next);
}

function updateCounter() {
  document.getElementById('imgCounter').textContent = `${currentImgIndex + 1} / ${imgs.length}`;
}

// ── RELATED ──
function renderRelated() {
  const related = allItems.filter(i => i.id !== item.id && i.category === item.category).slice(0, 4);
  if (!related.length) { document.querySelector('.related-section').style.display = 'none'; return; }
  const fallback = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400';
  document.getElementById('relatedGrid').innerHTML = related.map(r => `
    <a class="related-card" href="item-detail.html?id=${r.id}">
      <div class="related-card-img"><img src="${r.image || fallback}" alt="${r.name}" loading="lazy"/></div>
      <div class="related-card-body">
        <p class="related-cat">${r.category}</p>
        <h4 class="related-name">${r.name}</h4>
        <span class="related-price">${(r.pts||0).toLocaleString()} pts</span>
      </div>
    </a>`).join('');
}

// ══════════════════════════════════════════════════════
//   MAP — only this function is new, everything else
//   in this script block is IDENTICAL to the original
// ══════════════════════════════════════════════════════
let _detailMap = null
function initMeetupMap(lat, lng, addressText) {
  // Show the section
  document.getElementById('meetupSection').classList.add('show')

  // Address line
  const short = addressText
    ? addressText.split(',').slice(0, 3).join(',').trim()
    : `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  document.getElementById('meetupAddress').textContent = short

  // Google Maps directions
  document.getElementById('meetupDirections').href =
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`

  // Init Leaflet once
  if (!_detailMap) {
    _detailMap = L.map('detailMap', { zoomControl: true, scrollWheelZoom: false })
      .setView([lat, lng], 15)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(_detailMap)

    // Rose pin — same as post-item
    const pin = L.divIcon({
      html: `<svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
        <filter id="pds"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,.22)"/></filter>
        <path d="M14 0C8.477 0 4 4.477 4 10c0 7.5 10 25 10 25S24 17.5 24 10C24 4.477 19.523 0 14 0z"
              fill="#C994A7" filter="url(#pds)"/>
        <circle cx="14" cy="10" r="4.5" fill="#fff"/>
      </svg>`,
      className: '', iconSize:[28,38], iconAnchor:[14,38], popupAnchor:[0,-42]
    })
    L.marker([lat, lng], { icon: pin })
      .bindPopup(`<span style="font-family:'DM Sans',sans-serif;font-size:12px;color:#4A635D;">${short}</span>`)
      .addTo(_detailMap)
  }

  // Silently try geolocation to show distance pill
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const km = haversineKm(pos.coords.latitude, pos.coords.longitude, lat, lng)
      document.getElementById('meetupDistText').textContent = formatDist(km) + ' away'
      document.getElementById('meetupDist').classList.add('show')
    }, () => {/* silent fail — distance is optional */}, { timeout: 5000 })
  }
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R=6371, dL=(lat2-lat1)*Math.PI/180, dN=(lng2-lng1)*Math.PI/180
  const a=Math.sin(dL/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dN/2)**2
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
}
function formatDist(km) {
  if (km<1) return `${Math.round(km*1000)} m`
  if (km<10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

// ── SWAP MODAL ──
let _offerMode = 'item'        // 'item' | 'item+pts' | 'pts'
let _myItems   = []
let _myBal     = 0
let _offerPts  = 0

window.selectedOfferId   = null
window.selectedOfferImg  = null
window.selectedOfferName = null
window.selectedOfferItemPts = 0

const FALLBACK = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'

async function openSwapModal() {
  if (!currentUser) { showToast('Sign in to send a swap request.'); return }
  if (String(item.id).startsWith('demo')) { showToast('Cannot swap demo items.'); return }
  if (item.user_id === currentUser.id) { showToast("That's your own item!"); return }

  // Reset state
  _offerMode = 'item'
  _offerPts  = 0
  window.selectedOfferId = null
  window.selectedOfferImg = null
  window.selectedOfferName = null
  window.selectedOfferItemPts = 0

  let profileData = item.profiles || item.swapper || {}
  if (Array.isArray(profileData)) profileData = profileData[0] || {}
  const name = profileData.display_name || profileData.name || profileData.username || 'Swapper'

  document.getElementById('modalTargetName').textContent = name
  document.getElementById('modalTargetPtsLabel').textContent = `${(item.pts||0).toLocaleString()} pts`
  document.getElementById('modalItemImg').src = imgs[0] || FALLBACK
  document.getElementById('modalItemName').textContent = item.name
  document.getElementById('modalItemPts').textContent = `${(item.pts||0).toLocaleString()} pts`
  document.getElementById('ptsOfferInput').value = ''
  document.getElementById('ptsGapHint').classList.remove('show')
  document.getElementById('swapPreviewBar').style.display = 'none'
  _resetSendBtn()
  setOfferMode('item')

  // Load my balance + items in parallel
  const [profileRes, itemsRes] = await Promise.all([
    supabase.from('profiles').select('pts').eq('id', currentUser.id).single(),
    supabase.from('items').select('id, name, images, pts').eq('user_id', currentUser.id).or('status.neq.swapped,status.is.null')
  ])

  _myBal   = profileRes.data?.pts || 0
  _myItems = itemsRes.data || []
  document.getElementById('myBalDisplay').textContent = _myBal.toLocaleString() + ' pts'

  _renderItemGrid()
  document.getElementById('swapModal').classList.add('open')
}

function _renderItemGrid() {
  const grid = document.getElementById('myItemsGrid')
  if (!_myItems.length) {
    grid.innerHTML = `<div style="grid-column:span 3;text-align:center;color:var(--muted);padding:16px;font-size:13px;">You have no items to offer. <a href="post-item.html" style="color:var(--forest);font-weight:700;">Post one first ↗</a></div>`
    return
  }
  grid.innerHTML = _myItems.map(i => {
    const img = i.images?.[0] || FALLBACK
    return `<div class="my-item-pick" id="mip-${i.id}"
      data-img="${img.replace(/"/g,'&quot;')}"
      data-name="${(i.name||'').replace(/"/g,'&quot;')}"
      data-pts="${i.pts||0}"
      onclick="selectOfferItem('${i.id}')">
      <img src="${img}" alt="${i.name||''}"/>
      <div class="my-item-pick-name">${i.name||''}</div>
      <div class="my-item-pick-pts">${(i.pts||0).toLocaleString()} pts</div>
    </div>`
  }).join('')
}

// ── OFFER MODE SWITCH ──
window.setOfferMode = function(mode) {
  _offerMode = mode

  // Update tabs
  ;['item','item+pts'].forEach(m => {
const tab = document.getElementById(m === 'item' ? 'tabOfferItem' : 'tabOfferItemPts')
    if (tab) tab.classList.toggle('active', m === mode)
  })

  // Show/hide item picker
  const itemSection = document.getElementById('itemPickerSection')
  itemSection.style.display = (mode === 'pts') ? 'none' : 'block'

  // Show/hide pts input
  const ptsSection = document.getElementById('ptsOfferSection')
  ptsSection.style.display = (mode === 'item') ? 'none' : 'block'

  // Update pts section label
  const lbl = document.getElementById('ptsOfferSectionLabel')
  if (lbl) lbl.textContent = mode === 'pts' ? 'Points to offer' : 'Extra points to add'

  // Reset pts input & hint
  document.getElementById('ptsOfferInput').value = ''
  _offerPts = 0
  document.getElementById('ptsGapHint').classList.remove('show')

  // If switching to pts-only, clear item selection
  if (mode === 'pts') {
    window.selectedOfferId = null
    window.selectedOfferImg = null
    window.selectedOfferName = null
    window.selectedOfferItemPts = 0
    document.querySelectorAll('.my-item-pick').forEach(c => c.classList.remove('selected'))
  }

  _updatePreviewAndBtn()
}

// ── PTS INPUT HANDLER ──
window.onPtsOfferInput = function() {
  const val = parseInt(document.getElementById('ptsOfferInput').value) || 0
  _offerPts = Math.max(0, val)

  // Show gap hint
  const hint = document.getElementById('ptsGapHint')
  const wantPts = item.pts || 0
  const havePts = (_offerMode === 'item' || _offerMode === 'item+pts') ? (window.selectedOfferItemPts || 0) : 0
  const total   = havePts + _offerPts
  const diff    = wantPts - total

  if (_offerMode !== 'item') {
    if (diff > 0) {
      hint.textContent = `Total offer: ${total.toLocaleString()} pts — still ${diff.toLocaleString()} pts short of ${wantPts.toLocaleString()} pts`
      hint.className = 'pts-gap-hint show'
    } else if (diff < 0) {
      hint.textContent = `Total offer: ${total.toLocaleString()} pts — ${Math.abs(diff).toLocaleString()} pts over asking price`
      hint.className = 'pts-gap-hint show over'
    } else {
      hint.textContent = `Total offer: ${total.toLocaleString()} pts — exactly matches asking price ✓`
      hint.className = 'pts-gap-hint show'
    }
  }

  _updatePreviewAndBtn()
}

// ── ITEM SELECTION ──
window.selectOfferItem = function(id) {
  const el = document.getElementById(`mip-${id}`)
  if (!el) return
  const img  = el.dataset.img  || FALLBACK
  const name = el.dataset.name || ''
  const pts  = parseInt(el.dataset.pts) || 0

  window.selectedOfferId      = id
  window.selectedOfferImg     = img
  window.selectedOfferName    = name
  window.selectedOfferItemPts = pts

  document.querySelectorAll('.my-item-pick').forEach(c => c.classList.remove('selected'))
  el.classList.add('selected')

  // Auto-fill pts gap when in item+pts mode
  if (_offerMode === 'item+pts') {
    const gap = (item.pts || 0) - pts
    if (gap > 0) {
      document.getElementById('ptsOfferInput').value = gap
      _offerPts = gap
    }
    window.onPtsOfferInput()
  }

  _updatePreviewAndBtn()
}

// ── UPDATE PREVIEW BAR + SEND BUTTON ──
function _updatePreviewAndBtn() {
  const bar      = document.getElementById('swapPreviewBar')
  const myImg    = document.getElementById('spMyImg')
  const theirImg = document.getElementById('spTheirImg')
  const spText   = document.getElementById('spText')
  const spSub    = document.getElementById('spSubText')

  theirImg.src = imgs[0] || FALLBACK

  let readyToSend = false
  let offerDesc   = ''
  let offerSub    = ''

  if (_offerMode === 'item') {
    if (window.selectedOfferId) {
      myImg.src          = window.selectedOfferImg
      myImg.style.display = 'block'
      offerDesc = `${window.selectedOfferName} ⇄ ${item.name}`
      offerSub  = `${(window.selectedOfferItemPts||0).toLocaleString()} pts ⇄ ${(item.pts||0).toLocaleString()} pts`
      readyToSend = true
    }
  } else if (_offerMode === 'item+pts') {
    if (window.selectedOfferId && _offerPts > 0) {
      myImg.src           = window.selectedOfferImg
      myImg.style.display = 'block'
      offerDesc = `${window.selectedOfferName} + ${_offerPts.toLocaleString()} pts ⇄ ${item.name}`
      offerSub  = `Total offer value: ${(window.selectedOfferItemPts + _offerPts).toLocaleString()} pts`
      readyToSend = _offerPts <= _myBal
      if (_offerPts > _myBal) offerSub = `⚠ Not enough pts — you only have ${_myBal.toLocaleString()} pts`
    } else if (window.selectedOfferId) {
      myImg.src           = window.selectedOfferImg
      myImg.style.display = 'block'
      offerDesc = window.selectedOfferName
      offerSub  = 'Enter pts to add above ↑'
    }
  } 

  if (offerDesc) {
    spText.textContent   = offerDesc
    spSub.textContent    = offerSub
    bar.style.display    = 'flex'
  } else {
    bar.style.display    = 'none'
  }

  const btn = document.getElementById('sendSwapBtn')
  btn.disabled         = !readyToSend
  btn.style.opacity    = readyToSend ? '1' : '.4'
  btn.style.cursor     = readyToSend ? 'pointer' : 'not-allowed'
  btn.textContent      = readyToSend ? 'Send Swap Request ✦' : 'Make your offer ↑'
}

function _resetSendBtn() {
  const btn = document.getElementById('sendSwapBtn')
  btn.disabled = true; btn.style.opacity = '.4'
  btn.style.cursor = 'not-allowed'; btn.textContent = 'Make your offer ↑'
  document.getElementById('swapPreviewBar').style.display = 'none'
}

function closeSwapModal() {
  document.getElementById('swapModal').classList.remove('open')
  window.selectedOfferId = null
  _offerPts = 0
}

async function confirmSwap() {
  const mode         = _offerMode
  const offerItemId  = window.selectedOfferId
  const offerItemName= window.selectedOfferName
  const offerPts     = _offerPts

  // Validate
  if (mode === 'item'     && !offerItemId)           return
  if (mode === 'item+pts' && (!offerItemId || offerPts <= 0)) return
  if (mode === 'pts'      && offerPts <= 0)          return
  if ((mode === 'pts' || mode === 'item+pts') && offerPts > _myBal) {
    showToast('Not enough pts in your balance.'); return
  }

  closeSwapModal()

  const recipientId = item.user_id
  if (!recipientId) { showToast('Cannot send swap request for this item.'); return }

  const btn = document.getElementById('sendSwapBtn')

  try {
    // 1. Reserve pts immediately if pts are part of the offer
    if (offerPts > 0) {
      const { error: deductErr } = await supabase
        .from('profiles')
        .update({ pts: _myBal - offerPts })
        .eq('id', currentUser.id)
      if (deductErr) { showToast('Failed to reserve pts: ' + deductErr.message); return }
    }

    // 2. Build swap payload
    const swapPayload = {
      requester_id:      currentUser.id,
      owner_id:          recipientId,
      requested_item_id: item.id,
      offered_item_id:   offerItemId || null,
      offered_pts:       offerPts > 0 ? offerPts : 0,
      pts_reserved_requester: offerPts > 0,
      status: 'pending'
    }

    const { data: newSwap, error } = await supabase
      .from('swaps').insert(swapPayload).select().single()
    if (error) {
      // Refund pts if swap insert failed
      if (offerPts > 0) await supabase.from('profiles').update({ pts: _myBal }).eq('id', currentUser.id)
      showToast('Failed: ' + error.message); return
    }

    // 3. Build human-readable offer message
    let offerMsg = ''
    if (mode === 'item')      offerMsg = `I'd like to swap my "${offerItemName}" for your "${item.name}"!`
    else if (mode === 'item+pts') offerMsg = `I'd like to swap my "${offerItemName}" + ${offerPts.toLocaleString()} pts for your "${item.name}"!`
    else                      offerMsg = `I'd like to offer ${offerPts.toLocaleString()} pts for your "${item.name}"!`

    // 4. Send message
    await supabase.from('messages').insert({
      from_user_id: currentUser.id,
      to_user_id:   recipientId,
      item_id:      item.id,
      swap_id:      newSwap.id,
      body:         offerMsg,
      msg_type:     'swap_request',
      read:         false
    })

    showToast('✦ Swap request sent!')
    setTimeout(() => {
      location.href = `message.html?with=${recipientId}&item=${item.id}&swap=${newSwap.id}`
    }, 800)

  } catch(err) {
    console.error('confirmSwap error:', err)
    // Refund pts on unexpected error
    if (offerPts > 0) await supabase.from('profiles').update({ pts: _myBal }).eq('id', currentUser.id)
    showToast('Something went wrong. Please try again.')
  }
}
// ── MESSAGE MODAL ──
function openMessageModal() {
  const fallback = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800';
  // Use the same profile data extraction logic as populatePage
  let profileData = item.profiles || item.swapper || {};
  if (Array.isArray(profileData)) profileData = profileData[0] || {};
  
  const avatarUrl = profileData.avatar_url || profileData.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.display_name||profileData.name||'S')}&background=EBE0E3&color=C994A7&size=100`;
  const displayName = profileData.display_name || profileData.name || profileData.username || 'Swapper';
  
  document.getElementById('msgAvatar').src          = avatarUrl;
  document.getElementById('msgToName').textContent  = displayName;
  document.getElementById('msgItemImg').src         = imgs[0] || fallback;
  document.getElementById('msgItemName').textContent = item.name;
  document.getElementById('msgText').value          = '';
  document.getElementById('messageModal').classList.add('open');
}
function closeMessageModal() { document.getElementById('messageModal').classList.remove('open'); }
function usePrompt(text)     { document.getElementById('msgText').value = text; document.getElementById('msgText').focus(); }
async function sendMessage() {
  const text = document.getElementById('msgText').value.trim();
  if (!text) { showToast('Please write a message first.'); return; }
  
  if (!currentUser) { showToast('Sign in to send messages.'); return; }
  if (String(item.id).startsWith('demo')) { showToast('Cannot message about demo items.'); return; }
  
  // Get the recipient (seller) user ID
  let recipientId = item.user_id;
  if (!recipientId) {
    // If no user_id in item (local item), can't send message
    showToast('This is a local item. Please post it first to enable messaging.');
    return;
  }
  
  try {
    // Save message to Supabase
    await supabase.from('messages').insert({
      from_user_id: currentUser.id,
      to_user_id: recipientId,
      item_id: item.id,
      body: text
    });
    closeMessageModal();
    // Redirect to the messages page with full item context
    setTimeout(() => {
      location.href = `message.html?with=${recipientId}&item=${item.id}`;
    }, 300);
  } catch (err) {
    console.error('Failed to send message:', err);
    showToast('Failed to send message. Please try again.');
  }
}

// ── SWAPPER PROFILE ──
function viewSwapperProfile(e) {
  e.preventDefault();
  // determine the username/handle using the same logic as populatePage
  let profileData = item.profiles || item.swapper || {};
  if (Array.isArray(profileData)) profileData = profileData[0] || {};
  const id = item.user_id || '';
  let handle = profileData.username || profileData.handle || '';
  handle = handle.replace(/^@/, '');
  if (id) {
      let url = `../profile/profile.html?userId=${encodeURIComponent(id)}`;
      if (handle) url += `&user=${encodeURIComponent(handle)}`;
      window.location.href = url;
  } else if (handle) {
      window.location.href = `../profile/profile.html?user=${encodeURIComponent(handle)}`;
  }
}

// ── WISHLIST ──
async function syncWishlistBtn() {
  const btn = document.getElementById('wishlistBtn');
  if (!currentUser || !item?.id || String(item.id).startsWith('demo')) {
    btn.classList.remove('saved');
    document.getElementById('wishlistLabel').textContent = 'Save to Wishlist';
    btn.querySelector('svg').setAttribute('fill', 'none');
    return;
  }
  const { data } = await supabase.from('wishlist')
    .select('id').eq('user_id', currentUser.id).eq('item_id', item.id).maybeSingle();
  const saved = !!data;
  btn.classList.toggle('saved', saved);
  document.getElementById('wishlistLabel').textContent = saved ? 'Saved ★' : 'Save to Wishlist';
  btn.querySelector('svg').setAttribute('fill', saved ? 'currentColor' : 'none');
}

async function toggleWishlist() {
  if (!currentUser) { showToast('Sign in to save items.'); return; }
  if (String(item.id).startsWith('demo')) { showToast('Demo items cannot be wishlisted.'); return; }
  const { data: existing } = await supabase.from('wishlist')
    .select('id').eq('user_id', currentUser.id).eq('item_id', item.id).maybeSingle();
  if (existing) {
    await supabase.from('wishlist').delete().eq('id', existing.id);
    showToast('Removed from wishlist.');
  } else {
    await supabase.from('wishlist').insert({ user_id: currentUser.id, item_id: item.id });
    showToast('★ Saved to wishlist!');
  }
  syncWishlistBtn();
}

// ── CLOSE ON BG CLICK / ESC ──
['swapModal','messageModal'].forEach(id => {
  document.getElementById(id).addEventListener('click', function(e) { if (e.target === this) this.classList.remove('open'); });
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { document.getElementById('swapModal').classList.remove('open'); document.getElementById('messageModal').classList.remove('open'); }
  // Arrow key navigation
  if (e.key === 'ArrowLeft')  galleryMove(-1);
  if (e.key === 'ArrowRight') galleryMove(1);
});

// ── HELPERS ──
function timeAgo(iso) {
  if (!iso) return 'Recently';
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff/60000);
  const hours = Math.floor(diff/3600000);
  const days  = Math.floor(diff/86400000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-PH', {month:'short', day:'numeric'});
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

// ── INIT ──
// populatePage() and syncWishlistBtn() are called after attempting DB fetch above

// ══════════════════════════════════════════════
//   OWNER: EDIT MEETUP LOCATION MODAL
// ══════════════════════════════════════════════
let _editMap = null, _editMarker = null
let _pendingLat = null, _pendingLng = null, _pendingAddr = ''

function _makeEditPin() {
  return L.divIcon({
    html: `<svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
      <filter id="pde"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,.22)"/></filter>
      <path d="M14 0C8.477 0 4 4.477 4 10c0 7.5 10 25 10 25S24 17.5 24 10C24 4.477 19.523 0 14 0z"
            fill="#C994A7" filter="url(#pde)"/>
      <circle cx="14" cy="10" r="4.5" fill="#fff"/>
    </svg>`,
    className:'', iconSize:[28,38], iconAnchor:[14,38], popupAnchor:[0,-42]
  })
}

function openLocationModal() {
  const existLat = parseFloat(item.latitude)
  const existLng = parseFloat(item.longitude)
  const startLat = !isNaN(existLat) ? existLat : 12.8797
  const startLng = !isNaN(existLng) ? existLng : 121.774
  const startZoom = !isNaN(existLat) ? 15 : 6
  document.getElementById('locationModal').classList.add('open')
  setTimeout(() => {
    if (!_editMap) {
      _editMap = L.map('editMeetupMap', { zoomControl: true, scrollWheelZoom: false })
        .setView([startLat, startLng], startZoom)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>', maxZoom: 19
      }).addTo(_editMap)
      _editMap.on('click', async e => {
        placePinEdit(e.latlng.lat, e.latlng.lng)
        const addr = await reverseGeocodeEdit(e.latlng.lat, e.latlng.lng)
        setPendingLocation(e.latlng.lat, e.latlng.lng, addr)
      })
    } else {
      _editMap.setView([startLat, startLng], startZoom)
      _editMap.invalidateSize()
    }
    if (!isNaN(existLat) && !isNaN(existLng)) {
      placePinEdit(existLat, existLng)
      const addr = item.meetup_address || `${existLat.toFixed(5)}, ${existLng.toFixed(5)}`
      setPendingLocation(existLat, existLng, addr)
    }
  }, 80)
}

function closeLocationModal() {
  document.getElementById('locationModal').classList.remove('open')
  _pendingLat = null; _pendingLng = null; _pendingAddr = ''
  const btn = document.getElementById('saveLocationBtn')
  btn.disabled = true; btn.style.opacity = '.4'; btn.style.cursor = 'not-allowed'
  btn.textContent = 'Pin a location first'
  document.getElementById('locModalAddr').classList.remove('show')
  document.getElementById('locModalSearch').value = ''
}

function placePinEdit(lat, lng) {
  if (_editMarker) _editMap.removeLayer(_editMarker)
  _editMarker = L.marker([lat, lng], { icon: _makeEditPin() }).addTo(_editMap)
}

function setPendingLocation(lat, lng, addr) {
  _pendingLat = lat; _pendingLng = lng; _pendingAddr = addr
  const short = addr.split(',').slice(0, 3).join(',').trim()
  const addrEl = document.getElementById('locModalAddr')
  addrEl.textContent = '📍 ' + short
  addrEl.classList.add('show')
  const btn = document.getElementById('saveLocationBtn')
  btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'
  btn.textContent = 'Save Location ✦'
}

async function reverseGeocodeEdit(lat, lng) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const d = await r.json()
    return d.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  } catch { return `${lat.toFixed(5)}, ${lng.toFixed(5)}` }
}

async function searchLocModal() {
  const q = document.getElementById('locModalSearch').value.trim()
  if (!q) return
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const results = await r.json()
    if (results.length) {
      const { lat, lon, display_name } = results[0]
      _editMap.setView([+lat, +lon], 15)
      placePinEdit(+lat, +lon)
      setPendingLocation(+lat, +lon, display_name)
    } else { showToast('Location not found. Try a different search.') }
  } catch { showToast('Search failed. Try tapping the map instead.') }
}

function useMyLocationModal() {
  if (!navigator.geolocation) { showToast('Geolocation not supported.'); return }
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude: lat, longitude: lng } = pos.coords
    _editMap.setView([lat, lng], 15)
    placePinEdit(lat, lng)
    const addr = await reverseGeocodeEdit(lat, lng)
    setPendingLocation(lat, lng, addr)
  }, () => showToast('Could not get location.'), { timeout: 8000 })
}

async function saveLocation() {
  if (_pendingLat == null) return
  const btn = document.getElementById('saveLocationBtn')
  btn.textContent = 'Saving…'; btn.disabled = true
 try {
    const { error } = await supabase.from('items').update({
      latitude: _pendingLat, longitude: _pendingLng, meetup_address: _pendingAddr
    }).eq('id', item.id)
    if (error) { showToast('Failed: ' + error.message); btn.disabled = false; btn.textContent = 'Save Location ✦'; return }
    closeLocationModal()
    showToast('📍 Meetup location saved!')
    setTimeout(() => location.reload(), 800)
  } catch(err) { showToast('Something went wrong.'); btn.disabled = false; btn.textContent = 'Save Location ✦' }
}

document.getElementById('locationModal').addEventListener('click', function(e) {
  if (e.target === this) closeLocationModal()
})

// expose functions for inline onclick handlers
window.toggleWishlist      = toggleWishlist;
window.syncWishlistBtn     = syncWishlistBtn;
window.viewSwapperProfile  = viewSwapperProfile;
window.openSwapModal       = openSwapModal;
window.closeSwapModal      = closeSwapModal;
window.confirmSwap         = confirmSwap;
window.openMessageModal    = openMessageModal;
window.closeMessageModal   = closeMessageModal;
window.usePrompt           = usePrompt;
window.sendMessage         = sendMessage;
window.galleryMove         = galleryMove;
window.openLocationModal   = openLocationModal;
window.closeLocationModal  = closeLocationModal;
window.saveLocation        = saveLocation;
window.searchLocModal      = searchLocModal;
window.useMyLocationModal  = useMyLocationModal;
window.setOfferMode        = setOfferMode;
window.onPtsOfferInput     = onPtsOfferInput;
window.selectOfferItem     = selectOfferItem;
 

