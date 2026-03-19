    // ─────────────────────────────────────────
    //  SECTION SWITCHING
    // ─────────────────────────────────────────
    function showSection(btn, id) {
        document.querySelectorAll('.snav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('sec-' + id).classList.add('active');
    }

    // ─────────────────────────────────────────
    //  INIT — load all saved values
    // ─────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        // Account
        setVal('accEmail',   localStorage.getItem('suotEmail')   || '');
        setVal('accPhone',   localStorage.getItem('suotPhone')   || '');

        // Linked
        restoreLinked('google');
        restoreLinked('facebook');

        // Payment — wallets
        ['wGcash','wMaya','wPaypal','wShopeePay'].forEach(id => {
            const key = id.replace('w','suotWallet');
            document.getElementById(id).checked = localStorage.getItem(key) === 'true';
        });
        const walletNum = localStorage.getItem('suotWalletNumber') || '';
        setVal('walletNumber', walletNum);
        updateWalletRow();

        // Payout
        const payout = localStorage.getItem('suotPayout');
        if (payout) {
            const r = document.querySelector(`input[name="payout"][value="${payout}"]`);
            if (r) r.checked = true;
        }

        // Cards
        renderCards();

        // Shipping
        setVal('addrName',     localStorage.getItem('suotAddrName')     || '');
        setVal('addrStreet',   localStorage.getItem('suotAddrStreet')   || '');
        setVal('addrCity',     localStorage.getItem('suotAddrCity')     || '');
        setVal('addrProvince', localStorage.getItem('suotAddrProvince') || '');
        setVal('addrZip',      localStorage.getItem('suotAddrZip')      || '');
        setVal('addrPhone',    localStorage.getItem('suotAddrPhone')    || '');

        const courier = localStorage.getItem('suotCourier');
        if (courier) {
            const r = document.querySelector(`input[name="courier"][value="${courier}"]`);
            if (r) r.checked = true;
        }

        // Seller
        setVal('shopName', localStorage.getItem('suotShopName') || '');
        restoreCheckboxGroup('suotSwapPrefs', '#swapTags input');
        restoreCheckboxGroup('suotSizes',     '#sizeTags input');
        restoreToggle('toggleSwapOffers', 'suotSwapOffers');
        restoreToggle('toggleVacation',   'suotVacationMode');

        // Privacy
        const vis = localStorage.getItem('suotVisibility') || 'public';
        const vr = document.querySelector(`input[name="visibility"][value="${vis}"]`);
        if (vr) vr.checked = true;
        restoreToggle('toggleActivity',     'suotActivityStatus');
        restoreToggle('toggleDMs',          'suotAllowDMs');
        restoreToggle('toggleReadReceipts', 'suotReadReceipts');

        // Backdrop close for modals
        ['addCardModal','confirmModal'].forEach(id => {
            document.getElementById(id).addEventListener('click', function(e) {
                if (e.target === this) this.style.display = 'none';
            });
        });
    });

    // ─────────────────────────────────────────
    //  ACCOUNT
    // ─────────────────────────────────────────
    function saveField(inputId, storageKey, label) {
        const val = document.getElementById(inputId).value.trim();
        if (!val) { showToast(`${label} cannot be empty.`, 'error'); return; }
        localStorage.setItem(storageKey, val);
        showToast(`${label} saved!`);
    }

    function changePassword() {
        const cur  = document.getElementById('pwCurrent').value;
        const nw   = document.getElementById('pwNew').value;
        const conf = document.getElementById('pwConfirm').value;
        if (!cur || !nw || !conf)       { showToast('Please fill in all fields.', 'error'); return; }
        if (nw !== conf)                { showToast('Passwords do not match.', 'error'); return; }
        if (nw.length < 8)              { showToast('Password must be at least 8 characters.', 'error'); return; }
        ['pwCurrent','pwNew','pwConfirm'].forEach(id => document.getElementById(id).value = '');
        showToast('Password updated!');
    }

    const linkedState = {};
    function restoreLinked(name) {
        const saved = localStorage.getItem('suotLinked_' + name) === 'true';
        linkedState[name] = saved;
        updateLinkedUI(name);
    }

    function toggleLinked(name) {
        linkedState[name] = !linkedState[name];
        localStorage.setItem('suotLinked_' + name, linkedState[name]);
        updateLinkedUI(name);
        showToast(linkedState[name] ? `${capitalize(name)} connected!` : `${capitalize(name)} disconnected.`);
    }

    function updateLinkedUI(name) {
        const connected = linkedState[name];
        document.getElementById(name + 'Status').textContent = connected ? 'Connected' : 'Not connected';
        document.getElementById(name + 'Status').className   = 'linked-status' + (connected ? ' linked-on' : '');
        document.getElementById(name + 'Btn').textContent    = connected ? 'Disconnect' : 'Connect';
        document.getElementById(name + 'Btn').className      = 'btn-link-toggle' + (connected ? ' btn-link-disconnect' : '');
    }

    // ─────────────────────────────────────────
    //  PAYMENT — CARDS
    // ─────────────────────────────────────────
    let cards = JSON.parse(localStorage.getItem('suotCards') || '[]');

    function renderCards() {
        const list = document.getElementById('cardList');
        if (cards.length === 0) {
            list.innerHTML = '<p class="empty-state">No cards saved yet.</p>'; return;
        }
        list.innerHTML = cards.map((c, i) => `
            <div class="saved-card">
                <div class="card-chip"></div>
                <div class="card-info">
                    <span class="card-mask">${c.mask}</span>
                    <span class="card-exp">Exp: ${c.expiry}</span>
                </div>
                <span class="card-holder">${c.name}</span>
                <button class="btn-remove" onclick="removeCard(${i})">✕</button>
            </div>
        `).join('');
    }

    function openAddCard()  { document.getElementById('addCardModal').style.display = 'flex'; }
    function closeAddCard() { document.getElementById('addCardModal').style.display = 'none'; }

    function saveCard() {
        const name   = document.getElementById('cardName').value.trim();
        const number = document.getElementById('cardNumber').value.replace(/\s/g,'');
        const expiry = document.getElementById('cardExpiry').value.trim();
        const cvv    = document.getElementById('cardCvv').value.trim();

        if (!name || number.length < 15 || !expiry || !cvv) {
            showToast('Please fill in all card details.', 'error'); return;
        }
        const mask = '•••• •••• •••• ' + number.slice(-4);
        cards.push({ name, mask, expiry });
        localStorage.setItem('suotCards', JSON.stringify(cards));
        renderCards();
        closeAddCard();
        ['cardName','cardNumber','cardExpiry','cardCvv'].forEach(id => document.getElementById(id).value = '');
        showToast('Card added!');
    }

    function removeCard(i) {
        cards.splice(i, 1);
        localStorage.setItem('suotCards', JSON.stringify(cards));
        renderCards();
        showToast('Card removed.');
    }

    function formatCardNumber(input) {
        let v = input.value.replace(/\D/g,'').substring(0,16);
        input.value = v.replace(/(.{4})/g,'$1 ').trim();
    }

    function formatExpiry(input) {
        let v = input.value.replace(/\D/g,'').substring(0,4);
        if (v.length >= 3) v = v.substring(0,2) + ' / ' + v.substring(2);
        input.value = v;
    }

    // ─────────────────────────────────────────
    //  PAYMENT — WALLETS
    // ─────────────────────────────────────────
    function saveWallet() {
        ['wGcash','wMaya','wPaypal','wShopeePay'].forEach(id => {
            const key = id.replace('w','suotWallet');
            localStorage.setItem(key, document.getElementById(id).checked);
        });
        updateWalletRow();
    }

    function updateWalletRow() {
        const anyChecked = ['wGcash','wMaya','wPaypal','wShopeePay'].some(id => document.getElementById(id).checked);
        document.getElementById('walletNumberRow').style.display = anyChecked ? 'flex' : 'none';
        setVal('walletNumber', localStorage.getItem('suotWalletNumber') || '');
    }

    function saveWalletNumber() {
        localStorage.setItem('suotWalletNumber', document.getElementById('walletNumber').value.trim());
        showToast('Wallet number saved!');
    }

    function savePayout(radio) { localStorage.setItem('suotPayout', radio.value); showToast('Payout preference saved!'); }

    // ─────────────────────────────────────────
    //  SHIPPING
    // ─────────────────────────────────────────
    function saveAddress() {
        const fields = { addrName:'suotAddrName', addrStreet:'suotAddrStreet', addrCity:'suotAddrCity',
                         addrProvince:'suotAddrProvince', addrZip:'suotAddrZip', addrPhone:'suotAddrPhone' };
        Object.entries(fields).forEach(([id, key]) => localStorage.setItem(key, document.getElementById(id).value.trim()));
        showToast('Address saved!');
    }

    function saveCourier(radio) { localStorage.setItem('suotCourier', radio.value); showToast('Courier preference saved!'); }

    // ─────────────────────────────────────────
    //  SELLER
    // ─────────────────────────────────────────
    function saveSwapPrefs() {
        const checked = [...document.querySelectorAll('#swapTags input:checked')].map(i => i.value);
        localStorage.setItem('suotSwapPrefs', JSON.stringify(checked));
    }

    function saveSizes() {
        const checked = [...document.querySelectorAll('#sizeTags input:checked')].map(i => i.value);
        localStorage.setItem('suotSizes', JSON.stringify(checked));
    }

    function restoreCheckboxGroup(storageKey, selector) {
        const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
        document.querySelectorAll(selector).forEach(cb => {
            cb.checked = saved.includes(cb.value);
        });
    }

    // ─────────────────────────────────────────
    //  PRIVACY
    // ─────────────────────────────────────────
    function saveVisibility(radio) { localStorage.setItem('suotVisibility', radio.value); showToast('Visibility updated!'); }

    // ─────────────────────────────────────────
    //  TOGGLES (shared)
    // ─────────────────────────────────────────
    function saveToggle(inputId, storageKey) {
        localStorage.setItem(storageKey, document.getElementById(inputId).checked);
    }

    function restoreToggle(inputId, storageKey) {
        document.getElementById(inputId).checked = localStorage.getItem(storageKey) === 'true';
    }

    // ─────────────────────────────────────────
    //  CONFIRM MODAL (Deactivate / Delete)
    // ─────────────────────────────────────────
    let confirmAction = null;

    function openConfirm(action) {
        confirmAction = action;
        const isDelete = action === 'delete';
        document.getElementById('confirmTitle').textContent = isDelete ? 'Delete Account?' : 'Deactivate Account?';
        document.getElementById('confirmWord').textContent  = isDelete ? 'DELETE' : 'DEACTIVATE';
        document.getElementById('confirmInput').value       = '';
        document.getElementById('confirmInput').placeholder = isDelete ? 'Type DELETE' : 'Type DEACTIVATE';
        document.getElementById('confirmBody').textContent  = isDelete
            ? 'All your data, listings, and swap history will be permanently removed. This cannot be undone.'
            : 'Your profile will be hidden. You can return anytime by logging back in.';
        document.getElementById('addCardModal').style.display = 'none';
        document.getElementById('confirmModal').style.display = 'flex';
    }

    function closeConfirm() { document.getElementById('confirmModal').style.display = 'none'; }

    function executeConfirm() {
        const word     = confirmAction === 'delete' ? 'DELETE' : 'DEACTIVATE';
        const typed    = document.getElementById('confirmInput').value.trim().toUpperCase();
        if (typed !== word) { showToast(`Please type ${word} to confirm.`, 'error'); return; }
        closeConfirm();
        showToast(confirmAction === 'delete' ? 'Account deleted. Goodbye 👋' : 'Account deactivated.');
    }

    // ─────────────────────────────────────────
    //  HELPERS
    // ─────────────────────────────────────────
    function setVal(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val;
    }

    function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

    function showToast(msg, type = 'success') {
        const t = document.createElement('div');
        t.className = `toast toast-${type}`;
        t.innerText = msg;
        document.body.appendChild(t);
        setTimeout(() => t.classList.add('toast-show'), 10);
        setTimeout(() => { t.classList.remove('toast-show'); setTimeout(() => t.remove(), 400); }, 3000);
    }
    