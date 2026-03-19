
    // ─────────────────────────────────────
    //  SEED DATA
    // ─────────────────────────────────────
    const SEED = [
        {
            id: 's1', name: 'Vintage Levi\'s Denim', category: 'Bottoms', size: 'M',
            condition: 'Good', how: 'Swapped', from: '@denimfinds',
            img: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600',
            date: new Date('2026-01-15').toISOString(), notes: 'Perfect for casual days. Slightly distressed.'
        },
        {
            id: 's2', name: 'White Everyday Tee', category: 'Tops', size: 'S',
            condition: 'Like New', how: 'Purchased', from: 'Suot Marketplace',
            img: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600',
            date: new Date('2026-01-22').toISOString(), notes: ''
        },
        {
            id: 's3', name: 'Dusty Rose Joggers', category: 'Bottoms', size: 'M',
            condition: 'Like New', how: 'Swapped', from: '@pastelcloset',
            img: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600',
            date: new Date('2026-02-01').toISOString(), notes: 'Super comfy, great fit.'
        },
        {
            id: 's4', name: 'Boho Fringe Poncho', category: 'Outerwear', size: 'Free Size',
            condition: 'Good', how: 'Gifted', from: '@ate_rhea',
            img: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600',
            date: new Date('2026-02-10').toISOString(), notes: 'Gift from a friend. Hand-knit.'
        },
        {
            id: 's5', name: 'Streetwear Crop Top', category: 'Tops', size: 'S',
            condition: 'Good', how: 'Swapped', from: '@streetstyleph',
            img: 'https://images.unsplash.com/photo-1503342394128-c104d54dba01?w=600',
            date: new Date('2026-02-18').toISOString(), notes: ''
        },
        {
            id: 's6', name: 'Neutral Wardrobe Set', category: 'Tops', size: 'M',
            condition: 'Brand New', how: 'Purchased', from: 'Suot Marketplace',
            img: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600',
            date: new Date('2026-02-20').toISOString(), notes: 'Still has tags on.'
        },
    ];

    // ─────────────────────────────────────
    //  STATE
    // ─────────────────────────────────────
    const __suot_uid = localStorage.getItem('suotUserId') || 'anon';
    let collection = JSON.parse(localStorage.getItem(`suotCollection_${__suot_uid}`) || 'null');
    if (!collection) {
        collection = SEED;
        localStorage.setItem(`suotCollection_${__suot_uid}`, JSON.stringify(collection));
    }

    let activeFilter = 'all';
    let activeDetailId = null;

    // ─────────────────────────────────────
    //  INIT
    // ─────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        renderCollection();

        document.getElementById('itemImgInput').addEventListener('change', function () {
            if (!this.files[0]) return;
            const reader = new FileReader();
            reader.onload = e => {
                document.getElementById('imgPreview').src = e.target.result;
                document.getElementById('imgPreview').style.display = 'block';
                document.getElementById('imgUploadPrompt').style.display = 'none';
            };
            reader.readAsDataURL(this.files[0]);
        });

        ['detailModal','addModal'].forEach(id => {
            document.getElementById(id).addEventListener('click', function(e) {
                if (e.target === this) this.style.display = 'none';
            });
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') { closeDetailModal(); closeAddModal(); }
        });
    });

    // ─────────────────────────────────────
    //  RENDER
    // ─────────────────────────────────────
    function renderCollection() {
        const sort   = document.getElementById('sortSelect').value;
        let items    = [...collection];

        // Filter
        if (activeFilter !== 'all') items = items.filter(i => i.category === activeFilter);

        // Sort
        if (sort === 'newest') items.sort((a,b) => new Date(b.date) - new Date(a.date));
        else if (sort === 'oldest') items.sort((a,b) => new Date(a.date) - new Date(b.date));
        else if (sort === 'name') items.sort((a,b) => a.name.localeCompare(b.name));

        // Stats (always from full collection)
        document.getElementById('statTotal').textContent     = collection.length;
        document.getElementById('statSwapped').textContent   = collection.filter(i => i.how === 'Swapped').length;
        document.getElementById('statPurchased').textContent = collection.filter(i => i.how === 'Purchased').length;
        document.getElementById('statGifted').textContent    = collection.filter(i => i.how === 'Gifted').length;

        const grid  = document.getElementById('collectionGrid');
        const empty = document.getElementById('emptyState');

        if (items.length === 0) {
            grid.innerHTML = '';
            empty.style.display = 'flex';
            return;
        }
        empty.style.display = 'none';

        grid.innerHTML = items.map((item, idx) => `
            <div class="closet-card" onclick="openDetail('${item.id}')" style="animation-delay:${idx * 0.05}s">
                <div class="closet-img-wrap">
                    <img src="${item.img || 'https://via.placeholder.com/400x500?text=No+Photo'}" alt="${item.name}" loading="lazy">
                    <span class="how-badge how-${item.how.toLowerCase()}">${item.how}</span>
                </div>
                <div class="closet-card-body">
                    <p class="closet-category">${item.category}</p>
                    <h4 class="closet-name">${item.name}</h4>
                    <p class="closet-date">Acquired: ${formatDate(item.date)}</p>
                </div>
            </div>
        `).join('');
    }

    // ─────────────────────────────────────
    //  FILTER
    // ─────────────────────────────────────
    function setFilter(btn, filter) {
        document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = filter;
        renderCollection();
    }

    // ─────────────────────────────────────
    //  ADD ITEM
    // ─────────────────────────────────────
    function openAddModal() {
        document.getElementById('addName').value      = '';
        document.getElementById('addCategory').value  = '';
        document.getElementById('addSize').value      = '';
        document.getElementById('addCondition').value = '';
        document.getElementById('addHow').value       = 'Swapped';
        document.getElementById('addFrom').value      = '';
        document.getElementById('addNotes').value     = '';
        document.getElementById('imgPreview').src     = '';
        document.getElementById('imgPreview').style.display        = 'none';
        document.getElementById('imgUploadPrompt').style.display   = 'flex';
        document.getElementById('itemImgInput').value = '';
        document.getElementById('addModal').style.display = 'flex';
    }

    function closeAddModal() { document.getElementById('addModal').style.display = 'none'; }

    function addItem() {
        const name     = document.getElementById('addName').value.trim();
        const category = document.getElementById('addCategory').value;

        if (!name)     { showToast('Item name is required.', 'error'); return; }
        if (!category) { showToast('Please select a category.', 'error'); return; }

        const imgSrc = document.getElementById('imgPreview').src;
        const item = {
            id:        'c' + Date.now(),
            name,
            category,
            size:      document.getElementById('addSize').value      || '—',
            condition: document.getElementById('addCondition').value || '—',
            how:       document.getElementById('addHow').value,
            from:      document.getElementById('addFrom').value.trim() || '—',
            img:       (imgSrc && imgSrc !== window.location.href) ? imgSrc : '',
            date:      new Date().toISOString(),
            notes:     document.getElementById('addNotes').value.trim()
        };

        collection.unshift(item);
        localStorage.setItem(`suotCollection_${__suot_uid}`, JSON.stringify(collection));
        renderCollection();
        closeAddModal();
        showToast('Item added to your closet! 🎉');
    }

    // ─────────────────────────────────────
    //  DETAIL MODAL
    // ─────────────────────────────────────
    function openDetail(id) {
        const item = collection.find(i => i.id === id);
        if (!item) return;
        activeDetailId = id;

        document.getElementById('detailImg').src          = item.img || 'https://via.placeholder.com/600x750?text=No+Photo';
        document.getElementById('detailName').textContent = item.name;
        document.getElementById('detailCategory').textContent = item.category;
        document.getElementById('detailDate').textContent = 'Acquired ' + formatDate(item.date);
        document.getElementById('detailSize').textContent      = item.size      || '—';
        document.getElementById('detailCondition').textContent = item.condition || '—';
        document.getElementById('detailFrom').textContent      = item.from      || '—';

        const badge = document.getElementById('detailBadge');
        badge.textContent = item.how;
        badge.className   = `detail-how-badge how-${item.how.toLowerCase()}`;

        const notesWrap = document.getElementById('detailNotesWrap');
        if (item.notes) {
            document.getElementById('detailNotes').textContent = item.notes;
            notesWrap.style.display = 'block';
        } else {
            notesWrap.style.display = 'none';
        }

        document.getElementById('detailDeleteBtn').onclick = () => removeItem(id);
        document.getElementById('detailModal').style.display = 'flex';
    }

    function closeDetailModal() { document.getElementById('detailModal').style.display = 'none'; }

    function removeItem(id) {
        if (!confirm('Remove this item from your closet?')) return;
        collection = collection.filter(i => i.id !== id);
        localStorage.setItem(`suotCollection_${__suot_uid}`, JSON.stringify(collection));
        closeDetailModal();
        renderCollection();
        showToast('Item removed from your closet.');
    }

    // ─────────────────────────────────────
    //  HELPERS
    // ─────────────────────────────────────
    function formatDate(iso) {
        const d = new Date(iso);
        return d.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
    }

    function showToast(msg, type = 'success') {
        const t = document.createElement('div');
        t.className = `toast toast-${type}`;
        t.innerText = msg;
        document.body.appendChild(t);
        setTimeout(() => t.classList.add('toast-show'), 10);
        setTimeout(() => { t.classList.remove('toast-show'); setTimeout(() => t.remove(), 400); }, 3000);
    }
    