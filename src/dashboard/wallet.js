
import { supabase, fetchWalletBalances, fetchWalletEvents } from '../db/supabase.js'

async function boot() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '../auth/login.html'; return }
    const { data: profile } = await supabase.from('profiles').select('display_name,username,avatar_url').eq('id', session.user.id).single()
    if (profile) {
        const name = profile.display_name || profile.username || 'You'
        document.getElementById('profileName').textContent = name
        document.getElementById('userAvatar').src = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=EBE0E3&color=C994A7&size=100`
    }
    await loadBalances()
    await loadEvents()
}

async function loadBalances() {
    const { pts, circulation_buffer, bufferEntries } = await fetchWalletBalances()
    document.getElementById('activeBalance').textContent = (pts||0).toLocaleString()
    document.getElementById('bufferBalance').textContent = (circulation_buffer||0).toLocaleString()
    document.getElementById('capBarFill').style.width = Math.min(((pts||0)/2500)*100, 100) + '%'
    renderBufferExpiry(bufferEntries || [])
}

function renderBufferExpiry(entries) {
    const wrap = document.getElementById('bufferExpiryWrap')
    if (!entries.length) { wrap.innerHTML = `<div class="buffer-empty-note">No buffer points yet</div>`; hideAllBanners(); return }
    const now = Date.now()
    const displayed = entries.slice(0, 3), rest = entries.length - 3
    const restPts = entries.slice(3).reduce((s,e) => s+(e.remaining||0), 0)
    wrap.innerHTML = displayed.map(e => {
        const days = Math.max(0, Math.ceil((new Date(e.expires_at).getTime()-now)/86400000))
        const tc = days<=3?'urgent':days<=7?'warning':'ok'
        const label = new Date(e.expires_at).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})
        return `<div class="buffer-expiry-item"><div class="bei-left"><span class="bei-pts">${(e.remaining||0).toLocaleString()} pts</span><span class="bei-date">Expires ${label}</span></div><span class="bei-tag ${tc}">${days}d left${days<=3?'!':''}</span></div>`
    }).join('') + (rest>0 ? `<div class="buffer-expiry-item" style="opacity:.6;"><div class="bei-left"><span class="bei-pts">+${restPts.toLocaleString()} pts</span><span class="bei-date">${rest} more batch${rest>1?'es':''}</span></div></div>` : '')
    showExpiryBanners(entries, now)
}

function showExpiryBanners(entries, now) {
    const urgent  = entries.filter(e => Math.ceil((new Date(e.expires_at).getTime()-now)/86400000) <= 3)
    const warning = entries.filter(e => { const d=Math.ceil((new Date(e.expires_at).getTime()-now)/86400000); return d>3&&d<=7 })
    const ub=document.getElementById('expiryBannerUrgent'), wb=document.getElementById('expiryBannerWarning')
    if (urgent.length) {
        const pts=urgent.reduce((s,e)=>s+(e.remaining||0),0), days=Math.ceil((new Date(urgent[0].expires_at).getTime()-now)/86400000)
        document.getElementById('expiryBannerUrgentTitle').textContent=`⚠️ ${pts.toLocaleString()} pts expiring in ${days<=1?'less than a day':days+' days'}!`
        document.getElementById('expiryBannerUrgentDesc').textContent='These buffer points will be lost if unused. Swap items now to trigger an auto-refill.'
        ub.classList.remove('hidden')
    } else ub.classList.add('hidden')
    if (!urgent.length && warning.length) {
        const pts=warning.reduce((s,e)=>s+(e.remaining||0),0), days=Math.ceil((new Date(warning[0].expires_at).getTime()-now)/86400000)
        document.getElementById('expiryBannerWarningTitle').textContent=`${pts.toLocaleString()} pts expiring in ${days} days`
        document.getElementById('expiryBannerWarningDesc').textContent='Keep swapping to use your buffer before it expires!'
        wb.classList.remove('hidden')
    } else wb.classList.add('hidden')
}
function hideAllBanners() { document.getElementById('expiryBannerUrgent').classList.add('hidden'); document.getElementById('expiryBannerWarning').classList.add('hidden') }

async function loadEvents() {
    const events = await fetchWalletEvents(50)
    const body = document.getElementById('historyBody')
    document.getElementById('eventCount').textContent = events.length
    if (!events.length) { body.innerHTML=`<div class="ht-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-4 0v2M12 12v4M10 14h4"/></svg>No transactions yet.</div>`; return }
    body.innerHTML = events.map(ev => {
        const amtCls = ev.event_type==='expired'?'negative':ev.to_wallet==='active'?'positive':ev.from_wallet==='active'&&ev.to_wallet==='external'?'negative':'neutral'
        const prefix = amtCls==='positive'?'+':amtCls==='negative'?'−':''
        const icons = {topup:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,overflow:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`,refill:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"/></svg>`,spend:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,earn:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`,admin:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,expired:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`}
        const labels = {topup:'Top Up',overflow:'Overflow to Buffer',refill:'Buffer Auto-Refill',spend:'Points Spent',earn:'Points Earned',admin:'Admin Adjustment',expired:'Buffer Expired'}
        const names = {active:'Active',buffer:'Buffer',external:'External'}
        const d=Date.now()-new Date(ev.created_at).getTime(),m=Math.floor(d/60000),h=Math.floor(d/3600000),dy=Math.floor(d/86400000)
        const time = m<1?'just now':m<60?`${m}m ago`:h<24?`${h}h ago`:dy<7?`${dy}d ago`:new Date(ev.created_at).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})
        return `<div class="ht-row">
            <div class="ht-event"><div class="ht-badge ${ev.event_type}">${icons[ev.event_type]||icons.admin}</div><div><div class="ht-title">${labels[ev.event_type]||ev.event_type}</div><div class="ht-note">${ev.note||''}</div></div></div>
            <div class="ht-wallet"><span>${names[ev.from_wallet]||ev.from_wallet}</span> <span class="arrow">→</span> <span>${names[ev.to_wallet]||ev.to_wallet}</span></div>
            <div class="ht-amount ${amtCls}">${prefix}${(ev.amount||0).toLocaleString()} pts</div>
            <div class="ht-time">${time}</div>
        </div>`
    }).join('')
}

window.logout = () => supabase.auth.signOut().then(() => location.href = '../auth/login.html')
window.refreshWallet = async function() { await loadBalances(); await loadEvents() }

boot()