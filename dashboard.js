(function(){
  const tableBody = document.querySelector('#villas-table tbody');
  const rowTpl = document.getElementById('row-template');
  const cardsContainer = document.getElementById('villas-cards');
  const tabs = document.querySelectorAll('.tab-btn');
  const searchInput = document.getElementById('search');
  const btnRefresh = document.getElementById('btn-refresh');
  const btnNew = document.getElementById('btn-new');

  const form = document.getElementById('villa-form');
  const formTitle = document.getElementById('form-title');
  const btnDelete = document.getElementById('btn-delete');
  const btnCancel = document.getElementById('btn-cancel');

  const fldId = document.getElementById('villa-id');
  const fldTitle = document.getElementById('title');
  const fldLocation = document.getElementById('location');
  const fldPrice = document.getElementById('price');
  const fldRating = document.getElementById('rating');
  const fldBookings = document.getElementById('bookingsThisMonth');
  const fldType = document.getElementById('type');
  const fldBedrooms = document.getElementById('bedrooms');
  const fldBathrooms = document.getElementById('bathrooms');
  const fldGuests = document.getElementById('guests');
  const fldSize = document.getElementById('size');
  const fldDescription = document.getElementById('description');
  const fldImages = document.getElementById('images');
  const imagesPreviews = document.getElementById('images-previews');
  const fldFeatures = document.getElementById('features');
  const fldAmenities = document.getElementById('amenities');
  const fldIsFeatured = document.getElementById('isFeatured');
  const fldIsBaru = document.getElementById('isBaru');
  const fldIsHot = document.getElementById('isHot');
  const fileImages = document.getElementById('image-files');

  // Auth overlay elements
  const authOverlay = document.getElementById('auth-overlay');
  const authForm = document.getElementById('auth-form');
  const authPassword = document.getElementById('auth-password');
  const authError = document.getElementById('auth-error');

  let allVillas = [];
  let originalImages = [];
  let activeTab = 'promoted';

  function toArrayFromInput(val){
    if(!val) return [];
    return val
      .split(',')
      .map(s=>s.trim())
      .filter(Boolean);
  }
  function toInputFromArray(arr){
    if(!Array.isArray(arr)) return '';
    return arr.join(', ');
  }
  function getImagesArray(){
    return toArrayFromInput(fldImages.value);
  }
  function setImagesArray(arr){
    fldImages.value = toInputFromArray(arr);
    renderImagePreviews();
  }
  function currency(n){
    const num = Number(n)||0;
    return num.toLocaleString('en-US');
  }

  function renderImagePreviews(){
    if (!imagesPreviews) return;
    const arr = getImagesArray();
    imagesPreviews.innerHTML = '';
    arr.forEach((url, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'preview-item';
      const img = document.createElement('img');
      img.src = url;
      img.alt = `Image ${idx+1}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preview-remove';
      btn.innerHTML = '<i class="fa fa-xmark"></i>';
      btn.addEventListener('click', () => {
        const cur = getImagesArray();
        cur.splice(idx, 1);
        setImagesArray(cur);
      });
      wrap.appendChild(img);
      wrap.appendChild(btn);
      imagesPreviews.appendChild(wrap);
    });
  }

  function renderCards(rows){
    if (!cardsContainer) return;
    // Filter by tab
    const list = activeTab === 'promoted' ? rows.filter(v => !!v.isFeatured) : rows;
    cardsContainer.innerHTML = '';
    list.forEach(v => {
      const card = document.createElement('div');
      card.className = 'card';

      // images
      const imgs = Array.isArray(v.images) ? v.images : [];
      const imgsWrap = document.createElement('div');
      imgsWrap.className = 'card-imgs';
      (imgs.length ? imgs.slice(0,4) : ['villasepuncak.webp']).forEach(url => {
        const im = document.createElement('img');
        im.src = url; im.alt = v.title || 'villa';
        imgsWrap.appendChild(im);
      });

      // body
      const body = document.createElement('div');
      body.className = 'card-body';
      const h3 = document.createElement('h3');
      h3.textContent = v.title || `Villa #${v.id}`;
      const meta1 = document.createElement('div');
      meta1.className = 'meta';
      meta1.textContent = `${v.location || '-'} • Rating ${v.rating ?? 0}`;
      const meta2 = document.createElement('div');
      meta2.className = 'meta';
      meta2.textContent = `Price ${currency(v.price)} • ${v.type || ''}`;
      const tags = document.createElement('div');
      tags.className = 'tags';
      if (v.isFeatured) {
        const t = document.createElement('span'); t.className='tag'; t.textContent='Promo'; tags.appendChild(t);
      }
      if (v.isBaru) {
        const t = document.createElement('span'); t.className='tag'; t.textContent='Baru'; tags.appendChild(t);
      }
      if (v.isHot) {
        const t = document.createElement('span'); t.className='tag'; t.textContent='Hot'; tags.appendChild(t);
      }
      if ((v.bookingsThisMonth ?? 0) > 0) {
        const t = document.createElement('span'); t.className='tag'; t.textContent=`Booked ${v.bookingsThisMonth}`; tags.appendChild(t);
      }
      body.appendChild(h3); body.appendChild(meta1); body.appendChild(meta2); body.appendChild(tags);

      // actions
      const actions = document.createElement('div');
      actions.className = 'actions';
      const btnE = document.createElement('button'); btnE.className='btn small'; btnE.innerHTML='<i class="fa fa-pen"></i> Edit';
      const btnD = document.createElement('button'); btnD.className='btn small danger'; btnD.innerHTML='<i class="fa fa-trash"></i> Delete';
      const btnP = document.createElement('button'); btnP.className='btn small';
      if (v.isFeatured) { btnP.innerHTML='<i class="fa fa-star"></i> Promoted'; btnP.disabled = true; }
      else { btnP.innerHTML='<i class="fa fa-bullhorn"></i> Promote'; }
      btnE.addEventListener('click', () => startEdit(v));
      btnD.addEventListener('click', () => confirmDelete(v));
      if (!v.isFeatured) btnP.addEventListener('click', () => promoteVilla(v.id));
      actions.appendChild(btnE); actions.appendChild(btnP); actions.appendChild(btnD);

      card.appendChild(imgsWrap);
      card.appendChild(body);
      card.appendChild(actions);
      cardsContainer.appendChild(card);
    });
  }

  async function fetchVillas(){
    if(!window.supabase){
      alert('Supabase is not initialized. Please set SUPABASE_URL and SUPABASE_ANON_KEY in supabase-init.js');
      return [];
    }
    const { data, error } = await window.supabase
      .from('villas')
      .select('*')
      .order('id', { ascending: true });
    if(error){
      console.error('Error fetching villas', error);
      alert('Failed to load villas: ' + error.message);
      return [];
    }
    return data || [];
  }

  function renderRows(rows){
    tableBody.innerHTML = '';
    rows.forEach(v => {
      const tr = rowTpl.content.firstElementChild.cloneNode(true);
      const tdId = tr.querySelector('.col-id');
      const tdImages = tr.querySelector('.col-images');
      const tdTitle = tr.querySelector('.col-title');
      const tdLocation = tr.querySelector('.col-location');
      const tdPrice = tr.querySelector('.col-price');
      const tdRating = tr.querySelector('.col-rating');
      const tdFeatured = tr.querySelector('.col-featured');
      const tdBookings = tr.querySelector('.col-bookings');
      const tdType = tr.querySelector('.col-type');

      tdId.textContent = v.id ?? '';

      // Images thumbnails (show up to 3)
      const imgs = Array.isArray(v.images) ? v.images : [];
      if (imgs.length) {
        const wrap = document.createElement('div');
        wrap.className = 'thumbs';
        imgs.slice(0,3).forEach((url) => {
          const i = document.createElement('img');
          i.src = url; i.className = 'thumb'; i.alt = v.title || 'villa';
          wrap.appendChild(i);
        });
        if (imgs.length > 3) {
          const more = document.createElement('span');
          more.className = 'thumb-more';
          more.textContent = `+${imgs.length - 3}`;
          wrap.appendChild(more);
        }
        tdImages.innerHTML = '';
        tdImages.appendChild(wrap);
      } else {
        tdImages.innerHTML = '<span class="muted">No images</span>';
      }

      tdTitle.textContent = v.title ?? '';
      tdLocation.textContent = v.location ?? '';
      tdPrice.textContent = currency(v.price);
      tdRating.textContent = v.rating ?? '';
      tdFeatured.innerHTML = v.isFeatured ? '<span class="badge ok">Yes</span>' : '<span class="badge">No</span>';
      tdBookings.textContent = v.bookingsThisMonth ?? 0;
      tdType.textContent = v.type ?? '';

      // Data labels for mobile cards
      tdId.setAttribute('data-label','ID');
      tdImages.setAttribute('data-label','Images');
      tdTitle.setAttribute('data-label','Title');
      tdLocation.setAttribute('data-label','Location');
      tdPrice.setAttribute('data-label','Price');
      tdRating.setAttribute('data-label','Rating');
      tdFeatured.setAttribute('data-label','Promo');
      tdBookings.setAttribute('data-label','Bookings');
      tdType.setAttribute('data-label','Type');

      tr.querySelector('[data-action="edit"]').addEventListener('click', () => startEdit(v));
      tr.querySelector('[data-action="delete"]').addEventListener('click', () => confirmDelete(v));

      tableBody.appendChild(tr);
    });
  }

  function filterRows(){
    const q = (searchInput.value||'').toLowerCase();
    const rows = allVillas.filter(v =>
      (v.title||'').toLowerCase().includes(q) ||
      (v.location||'').toLowerCase().includes(q)
    );
    renderRows(rows);
    renderCards(rows);
  }

  async function loadAndRender(){
    allVillas = await fetchVillas();
    filterRows();
  }

  function resetForm(){
    fldId.value = '';
    fldTitle.value = '';
    fldLocation.value = '';
    fldPrice.value = '';
    fldRating.value = '';
    fldBookings.value = '';
    fldType.value = 'resort';
    fldBedrooms.value = '';
    fldBathrooms.value = '';
    fldGuests.value = '';
    fldSize.value = '';
    fldDescription.value = '';
    fldImages.value = '';
    renderImagePreviews();
    fldFeatures.value = '';
    fldAmenities.value = '';
    fldIsFeatured.checked = false;
    if (fldIsBaru) fldIsBaru.checked = false;
    if (fldIsHot) fldIsHot.checked = false;
    originalImages = [];

    btnDelete.style.display = 'none';
    formTitle.textContent = 'Add New Villa';
  }

  function startEdit(v){
    fldId.value = v.id ?? '';
    fldTitle.value = v.title ?? '';
    fldLocation.value = v.location ?? '';
    fldPrice.value = v.price ?? '';
    fldRating.value = v.rating ?? '';
    fldBookings.value = v.bookingsThisMonth ?? '';
    fldType.value = v.type ?? 'resort';
    fldBedrooms.value = v.bedrooms ?? '';
    fldBathrooms.value = v.bathrooms ?? '';
    fldGuests.value = v.guests ?? '';
    fldSize.value = v.size ?? '';
    fldDescription.value = v.description ?? '';
    fldImages.value = toInputFromArray(v.images);
    renderImagePreviews();
    originalImages = Array.isArray(v.images) ? [...v.images] : [];
    fldFeatures.value = toInputFromArray(v.features);
    fldAmenities.value = toInputFromArray(v.amenities);
    fldIsFeatured.checked = !!v.isFeatured;
    if (fldIsBaru) fldIsBaru.checked = !!v.isBaru;
    if (fldIsHot) fldIsHot.checked = !!v.isHot;

    btnDelete.style.display = 'inline-flex';
    formTitle.textContent = 'Edit Villa #' + v.id;
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  function collectForm(){
    return {
      title: fldTitle.value.trim(),
      location: fldLocation.value.trim(),
      price: Number(fldPrice.value||0),
      rating: Number(fldRating.value||0),
      bookingsThisMonth: Number(fldBookings.value||0),
      type: fldType.value,
      bedrooms: Number(fldBedrooms.value||0),
      bathrooms: Number(fldBathrooms.value||0),
      guests: Number(fldGuests.value||0),
      size: fldSize.value.trim(),
      description: fldDescription.value.trim(),
      images: toArrayFromInput(fldImages.value),
      features: toArrayFromInput(fldFeatures.value),
      amenities: toArrayFromInput(fldAmenities.value),
      isFeatured: !!fldIsFeatured.checked,
      isBaru: !!(fldIsBaru && fldIsBaru.checked),
      isHot: !!(fldIsHot && fldIsHot.checked)
    };
  }

  async function saveForm(e){
    e.preventDefault();
    const id = fldId.value ? Number(fldId.value) : null;
    const payload = collectForm();

    try {
      if(id){
        const { error } = await window.supabase.from('villas').update(payload).eq('id', id);
        if(error) throw error;
        // After successful update, delete any removed images from storage
        const removed = (originalImages || []).filter(u => !(payload.images || []).includes(u));
        if (removed.length) {
          await deleteImagesFromStorage(removed, id);
        }
      } else {
        const { error } = await window.supabase.from('villas').insert(payload);
        if(error) throw error;
      }
      // Clear search so new/updated row is visible
      if (typeof searchInput !== 'undefined' && searchInput) {
        searchInput.value = '';
      }
      await loadAndRender();
      resetForm();
    } catch(err){
      console.error('Save failed', err);
      alert('Save failed: ' + err.message);
    }
  }

  function urlToBucketPath(publicUrl){
    try {
      const idx = publicUrl.indexOf('/villas/');
      if (idx >= 0) {
        return decodeURIComponent(publicUrl.substring(idx + '/villas/'.length));
      }
      // fallback for legacy prefix .../object/public/villas/
      const idx2 = publicUrl.indexOf('public/villas/');
      if (idx2 >= 0) {
        return decodeURIComponent(publicUrl.substring(idx2 + 'public/villas/'.length));
      }
      return null;
    } catch { return null; }
  }

  function isImageUsedElsewhere(url, currentId){
    return (allVillas || []).some(v => {
      if (currentId && v.id === currentId) return false;
      return Array.isArray(v.images) && v.images.includes(url);
    });
  }

  async function deleteImagesFromStorage(urls, currentId){
    if (!Array.isArray(urls) || urls.length === 0) return;
    const safeToDelete = urls.filter(u => !isImageUsedElsewhere(u, currentId));
    if (!safeToDelete.length) return;
    const paths = safeToDelete
      .map(u => urlToBucketPath(u))
      .filter(Boolean);
    if (!paths.length) return;
    const { error } = await window.supabase.storage.from('villas').remove(paths);
    if (error) {
      console.warn('Failed to delete some images from storage:', error.message);
    }
  }

  async function confirmDelete(v){
    if(!confirm(`Delete villa #${v.id} ${v.title}?`)) return;
    try {
      // Attempt to remove associated images from storage first
      const urls = Array.isArray(v.images) ? v.images : [];
      if (urls.length) {
        await deleteImagesFromStorage(urls, v.id);
      }
      const { error } = await window.supabase.from('villas').delete().eq('id', v.id);
      if(error) throw error;
      await loadAndRender();
      if(String(fldId.value) === String(v.id)) resetForm();
    } catch(err){
      console.error('Delete failed', err);
      alert('Delete failed: ' + err.message);
    }
  }

  // Events (bound after auth)
  function bindEventsAfterAuth(){
    searchInput.addEventListener('input', filterRows);
    btnRefresh.addEventListener('click', loadAndRender);
    btnNew.addEventListener('click', resetForm);
    btnCancel.addEventListener('click', resetForm);
    form.addEventListener('submit', saveForm);
    if (fileImages) fileImages.addEventListener('change', uploadImagesToSupabase);
    // Mutually exclusive status flags
    const statusBoxes = [fldIsFeatured, fldIsBaru, fldIsHot].filter(Boolean);
    statusBoxes.forEach(box => {
      box.addEventListener('change', () => {
        if (box.checked) {
          statusBoxes.forEach(other => { if (other !== box) other.checked = false; });
        }
      });
    });
    // Tabs
    tabs.forEach(btn => btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      filterRows();
    }));
  }

  function initDashboard(){
    resetForm();
    bindEventsAfterAuth();
    // default tab: promoted
    activeTab = 'promoted';
    tabs.forEach(b => b.classList.toggle('active', b.dataset.tab === 'promoted'));
    loadAndRender();
  }

  async function promoteVilla(id){
    try{
      // Unset all featured first, then set selected one
      const { error: e1 } = await window.supabase.from('villas').update({ isFeatured: false }).neq('id', id);
      if (e1) throw e1;
      // Also ensure promoted villa is not Baru/Hot to keep mutual exclusive status
      const { error: e2 } = await window.supabase.from('villas').update({ isFeatured: true, isBaru: false, isHot: false }).eq('id', id);
      if (e2) throw e2;
      await loadAndRender();
    } catch(err){
      console.error('Promote failed', err);
      alert('Failed to promote villa: ' + err.message);
    }
  }

  // Auth Gate
  const AUTH_KEY = 'vs_dash_authed';
  function showAuth(){ authOverlay.style.display = 'flex'; authPassword.focus(); }
  function hideAuth(){ authOverlay.style.display = 'none'; }

  const already = localStorage.getItem(AUTH_KEY) === '1';
  if (!already) {
    showAuth();
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const pass = authPassword.value;
      if (pass === 'ramli2025'){
        localStorage.setItem(AUTH_KEY, '1');
        authError.style.display = 'none';
        hideAuth();
        initDashboard();
      } else {
        authError.style.display = 'block';
      }
    });
  } else {
    initDashboard();
  }
})();

async function uploadImagesToSupabase(){
  const files = document.getElementById('image-files')?.files;
  const imagesTextarea = document.getElementById('images');
  if(!files || files.length === 0){
    alert('Please choose one or more images first.');
    return;
  }
  if(!window.supabase){
    alert('Supabase is not initialized.');
    return;
  }

  const bucket = 'villas';
  const urls = [];
  for (const file of files){
    const ext = file.name.split('.').pop();
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const path = `uploads/${filename}`;
    const { error: upErr } = await window.supabase.storage
      .from(bucket)
      .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
    if(upErr){
      alert('Upload failed: ' + upErr.message);
      return;
    }
    const { data } = window.supabase.storage.from(bucket).getPublicUrl(path);
    if (data?.publicUrl) urls.push(data.publicUrl);
  }

  if(urls.length){
    const existing = imagesTextarea.value.trim();
    imagesTextarea.value = existing ? `${existing}, ${urls.join(', ')}` : urls.join(', ');
    document.getElementById('image-files').value = '';
    // refresh previews
    const ev = new Event('input');
    imagesTextarea.dispatchEvent(ev);
    // or call directly
    if (typeof renderImagePreviews === 'function') {
      // no-op; inside closure we already render via setImagesArray
    }
    // Use closure function via hidden textarea
    // Since we can't access closure here, mimic by updating DOM element used
    const previews = document.getElementById('images-previews');
    if (previews) {
      // Rebuild simple previews (duplicate logic minimal)
      previews.innerHTML = '';
      imagesTextarea.value.split(',').map(s=>s.trim()).filter(Boolean).forEach((url) => {
        const wrap = document.createElement('div');
        wrap.className = 'preview-item';
        const img = document.createElement('img');
        img.src = url; wrap.appendChild(img);
        previews.appendChild(wrap);
      });
    }
  }
}
