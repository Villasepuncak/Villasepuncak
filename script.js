// Sample villa data (would normally come from villas.json)
let villasData = { villas: [] };

// Make villasData globally available for pdf-generator.js
window.villasData = villasData;

// DOM Elements
const villasGrid = document.querySelector('.villas-grid');
const featuredVilla = document.querySelector('.featured-villa');
const sortBySelect = document.getElementById('sort-by');
const filterBySelect = document.getElementById('filter-by');
const villaModal = document.getElementById('villa-modal');
const modalContent = document.querySelector('.modal-content .modal-body');
const closeModalBtn = document.querySelector('.close-modal');
const favModal = document.getElementById('fav-modal');
const favVillasList = document.querySelector('.fav-villas-list');
const favCartBtn = document.querySelector('.fav-cart-btn');
const favCount = document.querySelector('.fav-count');
const whatsappAllBtn = document.querySelector('.whatsapp-all-btn');
const bookingForm = document.getElementById('booking-form');
const childrenInput = document.getElementById('children');
const childrenAgesContainer = document.getElementById('children-ages-container');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');
const whatsappBookingModal = document.getElementById('whatsapp-booking-modal');
const whatsappBookingForm = document.getElementById('whatsapp-booking-form');
const whatsappCheckInInput = document.getElementById('whatsapp-check-in');
const whatsappCheckOutInput = document.getElementById('whatsapp-check-out');
// Flatpickr instances (global for cross-function control)
let whatsappCheckInPicker = null;
let whatsappCheckOutPicker = null;

// Store current villa ID for WhatsApp booking
let currentWhatsappVillaId = null;

// State
let favoriteVillas = JSON.parse(localStorage.getItem('favoriteVillas')) || [];
let currentVillas = [];

// --- Site config (logo and hero images) ---
async function loadSiteConfig() {
    if (!window.supabase) return { logo_url: '', hero_images: [] };
    try {
        const { data, error } = await window.supabase
            .from('site_config')
            .select('*')
            .limit(1)
            .maybeSingle();
        if (error && error.code !== 'PGRST116') throw error;
        return data || { logo_url: '', hero_images: [] };
    } catch (e) {
        console.warn('Site config fetch failed:', e);
        return { logo_url: '', hero_images: [] };
    }
}



// Open WhatsApp booking modal for sending ALL favorites (no specific villa)
function openWhatsAppAllBookingModal() {
    currentWhatsappVillaId = null;
    if (whatsappBookingForm) {
        whatsappBookingForm.reset();
    }
    if (whatsappBookingModal) {
        whatsappBookingModal.classList.add('active');
    }
    // Auto-open check-in picker to guide the user
    if (whatsappCheckInPicker) {
        setTimeout(() => whatsappCheckInPicker.open(), 0);
    } else if (whatsappCheckInInput) {
        // Fallback: focus input to trigger native/open
        setTimeout(() => whatsappCheckInInput.focus(), 0);
    }
}



function applySiteConfig(cfg) {
    try {
        const logoImg = document.querySelector('header .logo img');
        if (logoImg && cfg.logo_url) {
            logoImg.src = cfg.logo_url;
        }
        if (Array.isArray(cfg.hero_images) && cfg.hero_images.length) {
            renderIntroImages(cfg.hero_images);
            startIntroSlideshow();
            activateIntroText();
        } else {
            // fallback to existing behavior if no hero images configured
            if (typeof initializeIntroSection === 'function') initializeIntroSection();
            startIntroSlideshow();
            activateIntroText();
        }
    } catch (e) {
        console.warn('Failed to apply site config:', e);
    }
}

function renderIntroImages(images) {
    const introImagesContainer = document.getElementById('introImages');
    if (!introImagesContainer) return;
    introImagesContainer.innerHTML = '';
    images.forEach((url, index) => {
        const img = document.createElement('img');
        img.src = url;
        img.alt = `Hero ${index + 1}`;
        img.classList.add('intro-image');
        if (index === 0) img.classList.add('active');
        introImagesContainer.appendChild(img);
    });
}

// --- Intro images slideshow ---
let introSlideTimer = null;
function startIntroSlideshow(intervalMs = 5000) {
    const container = document.getElementById('introImages');
    if (!container) return;
    const slides = Array.from(container.querySelectorAll('.intro-image'));
    // Clear previous timer
    if (introSlideTimer) { clearInterval(introSlideTimer); introSlideTimer = null; }
    if (!slides || slides.length < 2) return; // nothing to cycle

    let current = slides.findIndex(s => s.classList.contains('active'));
    if (current < 0) { current = 0; slides[0].classList.add('active'); }

    introSlideTimer = setInterval(() => {
        const prev = current;
        current = (current + 1) % slides.length;
        slides[prev]?.classList.remove('active');
        slides[current]?.classList.add('active');
    }, intervalMs);
}

// Activate intro text animations so elements become visible
function activateIntroText() {
    try {
        const headlines = document.querySelectorAll('.intro-headline, .intro-subhead, .intro-cta, #scroll-note-btn');
        const scrollHint = document.getElementById('scrollHint');
        setTimeout(() => {
            headlines.forEach(el => {
                if (!el.id || el.id !== 'scroll-note-btn') {
                    el.classList.add('active', 'in-view');
                }
            });
            if (scrollHint) scrollHint.classList.add('active');
            const scrollNoteBtn = document.getElementById('scroll-note-btn');
            if (scrollNoteBtn) {
                setTimeout(() => scrollNoteBtn.classList.add('active', 'in-view'), 900);
            }
        }, 300);
    } catch (e) { /* no-op */ }
}

// Load villa data from Supabase instead of villas.json
async function loadVillaData() {
    try {
        if (!window.supabase) {
            console.error('Supabase client not initialized. Include supabase-js and supabase-init.js');
            return { villas: [] };
        }

        const { data, error } = await window.supabase
            .from('villas')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;

        villasData = { villas: data || [] };
        window.villasData = villasData; // Update global reference
        currentVillas = [...villasData.villas];
        return villasData;
    } catch (error) {
        console.error('Error loading villa data from Supabase:', error);
        villasData = { villas: [] };
        window.villasData = villasData;
        currentVillas = [];
        return villasData;
    }
}

// Initialize the app
async function init() {
    await loadVillaData();
    renderVillas();
    renderFeaturedVilla();
    setupEventListeners();
    updateFavCount();
    // Load and apply site configuration (logo and hero images)
    try {
        const cfg = await loadSiteConfig();
        applySiteConfig(cfg);
    } catch (e) {
        console.warn('Failed to load site config', e);
    }
}

// Render villas to the grid
function renderVillas() {
    villasGrid.innerHTML = '';


    // Create cards group
    const cardsGroup = document.createElement('div');
    cardsGroup.className = 'villas-cards-group';


    currentVillas.forEach(villa => {
        const formattedPrice = villa.price.toLocaleString('en-US');
        const firstImg = (Array.isArray(villa.images) && villa.images[0]) ? villa.images[0] : 'villasepuncak.webp';
        const villaCard = document.createElement('div');
        villaCard.className = 'villa-card';
        villaCard.innerHTML = `
            <div style="position:relative;">
                <img src="${firstImg}" alt="${villa.title}" class="villa-img">
                <div class="villa-img-overlay"></div>
                <div class="villa-badges">
                    ${villa.isFeatured ? '<span class="villa-badge">Featured</span>' : ''}
                    ${villa.isBaru ? '<span class="villa-badge badge-baru">Baru</span>' : ''}
                    ${villa.isHot ? '<span class="villa-badge badge-hot">Hot</span>' : ''}
                    ${!villa.isFeatured && villa.bookingsThisMonth > 10 ? '<span class="villa-badge badge-booked">Most Booked</span>' : ''}
                </div>
            </div>
            <div class="villa-info">
                <h3 class="villa-title">${villa.title}</h3>
                <p class="villa-price">Mulai Dari ${formattedPrice}/Malam</p>
                <p class="villa-location"><i class="fas fa-map-marker-alt"></i> ${villa.location}</p>
                <div class="villa-features">
                    ${(villa.features || []).map(feature => `
                        <span class="feature-tag">${feature}</span>
                    `).join('')}
                </div>
                <div class="villa-rating">
                    ${renderStars(villa.rating)}
                    <span>(${villa.rating})</span>
                </div>
                <div class="villa-actions">
                    <button class="whatsapp-btn" data-id="${villa.id}">
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </button>
                    <button class="fav-btn ${isFavorite(villa.id) ? 'active' : ''}" data-id="${villa.id}">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
            </div>
        `;

        cardsGroup.appendChild(villaCard);
    });

    villasGrid.appendChild(cardsGroup);

    // Add event listeners to the new elements
    addVillaCardEventListeners();
}

// Render featured villa
function renderFeaturedVilla() {
    const featured = villasData.villas.find(villa => villa.isFeatured);
    if (!featured) return;
    const formattedPrice = featured.price.toLocaleString('en-US');
    const featuredImg = (Array.isArray(featured.images) && featured.images[0]) ? featured.images[0] : 'villasepuncak.webp';
    featuredVilla.innerHTML = `
        <div style="position:relative;">
            <img src="${featuredImg}" alt="${featured.title}" class="villa-img">
            <div class="villa-img-overlay"></div>
            <span class="villa-badge">Featured</span>
        </div>
        <div class="villa-info">
            <h3 class="villa-title">${featured.title}</h3>
            <p class="villa-price">Mulai Dari ${formattedPrice}/Malam</p>
            <p class="villa-location"><i class="fas fa-map-marker-alt"></i> ${featured.location}</p>
            <p class="villa-description">${featured.description}</p>
            <div class="villa-features">
                ${(featured.features || []).map(feature => `
                    <span class="feature-tag">${feature}</span>
                `).join('')}
            </div>
            <div class="villa-rating">
                ${renderStars(featured.rating)}
                <span>(${featured.rating})</span>
            </div>
            <div class="villa-actions">
                <button class="whatsapp-btn" data-id="${featured.id}">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                </button>
                <button class="submit-btn view-details-btn" data-id="${featured.id}">
                    View Details
                </button>
            </div>
        </div>
    `;

    // Add event listeners to featured villa buttons
    document.querySelector('.view-details-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(e.target.dataset.id);
        openVillaModal(id);
    });

    document.querySelector('.featured-villa .whatsapp-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const villaId = parseInt(e.target.closest('.whatsapp-btn').dataset.id);
        openWhatsAppBookingModal(villaId);
    });

    // Make the entire featured villa div clickable
    featuredVilla.addEventListener('click', (e) => {
        // Don't open modal if clicking on buttons inside the featured villa
        if (e.target.closest('button')) return;
        const id = parseInt(featuredVilla.querySelector('.whatsapp-btn').dataset.id);
        openVillaModal(id);
    });
}

// Render stars based on rating
function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = '';

    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            stars += '<i class="fas fa-star"></i>';
        } else if (i === fullStars + 1 && hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }

    return stars;
}

// Open villa modal with details
function openVillaModal(id) {
    const villa = villasData.villas.find(v => v.id === id);
    if (!villa) return;
    const formattedPrice = villa.price.toLocaleString('en-US');
    const imgs = (Array.isArray(villa.images) && villa.images.length > 0) ? villa.images : ['villasepuncak.webp'];
    modalContent.innerHTML = `
        <div class="villa-details">
            <div class="villa-gallery">
                <img src="${imgs[0]}" alt="${villa.title}" class="main-image" id="main-image">
                <div class="thumbnail-container">
                    ${imgs.map((img, index) => `
                        <img src="${img}" alt="Thumbnail ${index + 1}" class="thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">
                    `).join('')}
                </div>
            </div>
            
            <div class="villa-content">
                <h2>${villa.title}</h2>
                <p class="villa-location"><i class="fas fa-map-marker-alt"></i> ${villa.location}</p>
                <p class="villa-price">Mulai Dari ${formattedPrice}/Malam</p>
                <div class="villa-rating">
                    ${renderStars(villa.rating)}
                    <span>(${villa.rating})</span>
                </div>
                
                <p class="villa-description">${villa.description}</p>
                
                <div class="villa-specs">
                    <div class="spec-item">
                        <i class="fas fa-bed"></i>
                        <span>${villa.bedrooms} Bedrooms</span>
                    </div>
                    <div class="spec-item">
                        <i class="fas fa-bath"></i>
                        <span>${villa.bathrooms} Bathrooms</span>
                    </div>
                    <div class="spec-item">
                        <i class="fas fa-users"></i>
                        <span>Pax ${villa.guests}</span>
                    </div>
                    <div class="spec-item">
                        <i class="fas fa-vector-square"></i>
                        <span>${villa.size}</span>
                    </div>
                </div>
                
                <h3>Features</h3>
                <div class="amenities-list">
                    ${(villa.features || []).map(feature => `
                        <div class="amenity-item">
                            <i class="fas fa-check"></i>
                            <span>${feature}</span>
                        </div>
                    `).join('')}
                </div>
                
                <h3>Amenities</h3>
                <div class="amenities-list">
                    ${(villa.amenities || []).map(amenity => `
                        <div class="amenity-item">
                            <i class="fas fa-check"></i>
                            <span>${amenity}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="modal-actions">
                    <button class="whatsapp-btn" data-id="${villa.id}" style="margin-right: 1rem;">
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </button>
                    <button class="fav-btn ${isFavorite(villa.id) ? 'active' : ''}" data-id="${villa.id}">
                        <i class="fas fa-heart"></i> ${isFavorite(villa.id) ? 'Remove from Favorites' : 'Add to Favorites'}
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add event listeners for thumbnails
    const mainImage = document.querySelector('.main-image');
    const thumbnails = document.querySelectorAll('.thumbnail');
    
    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', (e) => {
            const index = e.target.dataset.index;
            mainImage.src = villa.images[index];
            mainImage.dataset.index = index; // Update the current index

            // Update active thumbnail
            thumbnails.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
    
    // Add click event to main image for fullscreen view
    mainImage.addEventListener('click', () => {
        const currentIndex = parseInt(mainImage.dataset.index || '0');
        openFullscreenViewer(villa.images, currentIndex);
    });
    
    // Set initial index on main image
    mainImage.dataset.index = '0';

    // Add event listeners to modal buttons
    document.querySelector('.modal-actions .whatsapp-btn')?.addEventListener('click', (e) => {
        const villaId = parseInt(e.target.closest('.whatsapp-btn').dataset.id);
        openWhatsAppBookingModal(villaId);
    });

    document.querySelector('.modal-actions .fav-btn')?.addEventListener('click', (e) => {
        toggleFavorite(villa.id);

        // Update the modal button state
        const modalButton = e.target.closest('button');
        if (isFavorite(villa.id)) {
            modalButton.classList.add('active');
            modalButton.innerHTML = `<i class="fas fa-heart"></i> Remove from Favorites`;
        } else {
            modalButton.classList.remove('active');
            modalButton.innerHTML = `<i class="fas fa-heart"></i> Add to Favorites`;
        }

        // Update the corresponding villa card's fav button
        const villaCardButton = document.querySelector(`.villa-card .fav-btn[data-id="${villa.id}"]`);
        if (villaCardButton) {
            if (isFavorite(villa.id)) {
                villaCardButton.classList.add('active');
            } else {
                villaCardButton.classList.remove('active');
            }
        }
    });

    // Open modal
    villaModal.classList.add('active');
}













// Open WhatsApp booking modal
function openWhatsAppBookingModal(villaId) {
    const villa = villasData.villas.find(v => v.id === villaId);
    if (!villa) {
        alert('Villa not found.');
        return;
    }

    currentWhatsappVillaId = villaId;

    // Reset form
    if (whatsappBookingForm) {
        whatsappBookingForm.reset();
    }

    // Open modal
    if (whatsappBookingModal) {
        whatsappBookingModal.classList.add('active');
    }
}

// Send villa details via WhatsApp with booking dates
function sendVillaToWhatsApp(villaId, checkInDate = null, checkOutDate = null) {
    const villa = villasData.villas.find(v => v.id === villaId);
    if (!villa) {
        alert('Villa not found.');
        return;
    }

    // Helper for short month format e.g., 11 Nov 2025
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fmtShort = (d) => `${d.getDate()} ${monthsShort[d.getMonth()]} ${d.getFullYear()}`;

    let messageLines = [];

    if (checkInDate && checkOutDate) {
        const nights = Math.round((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        const nightsStr = String(nights).padStart(2, '0');

        messageLines.push('\u2705\u2705\u2705');
        messageLines.push(`${villa.title}`);
        messageLines.push(`Location: ${villa.location}`);
        messageLines.push(`Rating: ${villa.rating}`);
        messageLines.push('');
        messageLines.push(`Check-In: ${fmtShort(checkInDate)}`);
        messageLines.push(`Check-Out: ${fmtShort(checkOutDate)}`);
        messageLines.push(`Total: ${nightsStr} Malam`);
        messageLines.push('');
        messageLines.push('Dibantu Cek Availability Kak');
        messageLines.push('*VillaSepuncak*');
    } else {
        // Fallback without dates
        messageLines.push('\u2705\u2705\u2705');
        messageLines.push(`${villa.title}`);
        messageLines.push(`Location: ${villa.location}`);
        messageLines.push(`Rating: ${villa.rating}`);
        messageLines.push('');
        messageLines.push('Dibantu Cek Availability Kak');
        messageLines.push('*VillaSepuncak*');
    }

    const message = messageLines.join('\n');
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/+6283185294060?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');

    // Close modal after sending
    if (whatsappBookingModal) {
        whatsappBookingModal.classList.remove('active');
    }
}

// Share multiple villas via WhatsApp (for "Send All" button)
async function sendAllFavoritesToWhatsApp(checkInDate = null, checkOutDate = null) {
    if (favoriteVillas.length === 0) {
        alert('Your favorites list is empty.');
        return;
    }

    // Build message similar to sendVillaToWhatsApp, with optional dates for ALL
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fmtShort = (d) => `${d.getDate()} ${monthsShort[d.getMonth()]} ${d.getFullYear()}`;

    let nightsStr = '';
    if (checkInDate && checkOutDate) {
        const nights = Math.round((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        nightsStr = String(nights).padStart(2, '0');
    }

    const messageLines = [];
    favoriteVillas.forEach(villaId => {
        const villa = villasData.villas.find(v => v.id === villaId);
        if (!villa) return;
        messageLines.push('\u2705\u2705\u2705');
        messageLines.push(`${villa.title}`);
        messageLines.push(`Location: ${villa.location}`);
        messageLines.push(`Rating: ${villa.rating}`);
        messageLines.push('');
        if (checkInDate && checkOutDate) {
            messageLines.push(`Check-In: ${fmtShort(checkInDate)}`);
            messageLines.push(`Check-Out: ${fmtShort(checkOutDate)}`);
            messageLines.push(`Total: ${nightsStr} Malam`);
            messageLines.push('');
        }
    });
    // Append a single footer call-to-action
    messageLines.push('Dibantu Cek Availability Kak');
    messageLines.push('*VillaSepuncak*');

    const message = messageLines.join('\n');
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/+6283185294060?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
}

// Toggle villa favorite status
function toggleFavorite(villaId) {
    if (isFavorite(villaId)) {
        favoriteVillas = favoriteVillas.filter(id => id !== villaId);
    } else {
        favoriteVillas.push(villaId);
    }

    localStorage.setItem('favoriteVillas', JSON.stringify(favoriteVillas));
    updateFavCount();
    renderFavModal();
}

// Check if villa is favorite
function isFavorite(villaId) {
    return favoriteVillas.includes(villaId);
}

// Update favorite count
function updateFavCount() {
    favCount.textContent = favoriteVillas.length;
    console.log('Favorite count:', favoriteVillas.length);
}

// Render favorite villas modal
function renderFavModal() {
    favVillasList.innerHTML = '';

    if (favoriteVillas.length === 0) {
        favVillasList.innerHTML = '<p>Your favorites list is empty.</p>';
        return;
    }

    favoriteVillas.forEach(villaId => {
        const villa = villasData.villas.find(v => v.id === villaId);
        if (!villa) return;

        const favItem = document.createElement('div');
        favItem.className = 'fav-villa-item';
        const favFormattedPrice = villa.price.toLocaleString('en-US');
        favItem.innerHTML = `
            <div class="fav-villa-info">
                <img src="${villa.images[0]}" alt="${villa.title}" class="fav-villa-img">
                <div>
                    <h4>${villa.title}</h4>
                    <p>Mulai Dari ${favFormattedPrice}/Malam</p>
                    <div class="fav-villa-meta" style="display:flex; gap:8px; align-items:center; color:#6b7280; font-size:.9rem;">
                        <span><i class="fas fa-map-marker-alt"></i> ${villa.location}</span>
                        <span class="sep">•</span>
                        <span><i class="fas fa-star" style="color:#f39c12;"></i> ${villa.rating}</span>
                    </div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <button class="whatsapp-fav-btn" data-id="${villa.id}" title="Send this villa via WhatsApp">
                    <i class="fab fa-whatsapp"></i>
                </button>
                <button class="remove-fav" data-id="${villa.id}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        favVillasList.appendChild(favItem);
    });

    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-fav').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.closest('button').dataset.id);
            toggleFavorite(id);
        });
    });

    // Add event listeners to WhatsApp buttons for each favorite villa
    document.querySelectorAll('.whatsapp-fav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const villaId = parseInt(btn.dataset.id);
            if (!villaId) return;
            openWhatsAppBookingModal(villaId);
        });
    });
}

// Filter and sort villas
function filterAndSortVillas() {
    const filterValue = filterBySelect.value;
    const sortValue = sortBySelect.value;

    let filteredVillas = [...villasData.villas];

    // Filter
    if (filterValue === 'pool') {
        filteredVillas = filteredVillas.filter(villa => villa.features.includes('Private Pool'));
    } else if (filterValue === 'resort') {
        filteredVillas = filteredVillas.filter(villa => villa.type === 'resort');
    } else if (filterValue === 'outside') {
        filteredVillas = filteredVillas.filter(villa => villa.type === 'outside');
    }

    // Sort
    if (sortValue === 'price-asc') {
        filteredVillas.sort((a, b) => a.price - b.price);
    } else if (sortValue === 'price-desc') {
        filteredVillas.sort((a, b) => b.price - a.price);
    } else if (sortValue === 'rating') {
        filteredVillas.sort((a, b) => b.rating - a.rating);
    } else if (sortValue === 'popularity') {
        filteredVillas.sort((a, b) => b.bookingsThisMonth - a.bookingsThisMonth);
    }

    currentVillas = filteredVillas;
    renderVillas();
}


// Handle children ages input
function handleChildrenAges() {
    const childrenCount = parseInt(childrenInput.value) || 0;
    childrenAgesContainer.innerHTML = '';

    if (childrenCount > 0) {
        const agesGroup = document.createElement('div');
        agesGroup.className = 'form-group';
        agesGroup.innerHTML = '<label>Children Ages:</label>';

        for (let i = 1; i <= childrenCount; i++) {
            const ageInput = document.createElement('input');
            ageInput.type = 'number';
            ageInput.min = '0';
            ageInput.max = '17';
            ageInput.placeholder = `Child ${i} age`;
            ageInput.required = true;
            ageInput.className = 'child-age';
            agesGroup.appendChild(ageInput);
        }

        childrenAgesContainer.appendChild(agesGroup);
        childrenAgesContainer.style.display = 'block';
    } else {
        childrenAgesContainer.style.display = 'none';
    }
}

// --- Booking Section Date Logic ---

// Elements for booking date logic
const checkInInput = document.getElementById('check-in');
const totalNightsInput = document.getElementById('total-nights-input-id');
const checkOutSpan = document.getElementById('check-out');

let selectedCheckInDate = null;
let selectedTotalNights = null;
let calculatedCheckOutDate = null;

// Initialize flatpickr for check-in
if (checkInInput) {
    flatpickr(checkInInput, {
        minDate: 'today',
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: 'j M Y',
        disableMobile: true,
        locale: 'id',
        onChange: function (selectedDates) {
            selectedCheckInDate = selectedDates[0] || null;
            updateCheckOutDate();
        }
    });
}

// Listen for changes on total nights
if (totalNightsInput) {
    totalNightsInput.addEventListener('input', function () {
        selectedTotalNights = parseInt(totalNightsInput.value, 10) || null;
        updateCheckOutDate();
    });
}

function updateCheckOutDate() {
    if (selectedCheckInDate && selectedTotalNights && selectedTotalNights > 0) {
        // Calculate check-out date
        const checkOut = new Date(selectedCheckInDate);
        checkOut.setDate(checkOut.getDate() + selectedTotalNights);
        calculatedCheckOutDate = checkOut;
        // Format as YYYY-MM-DD
        const yyyy = checkOut.getFullYear();
        const mm = String(checkOut.getMonth() + 1).padStart(2, '0');
        const dd = String(checkOut.getDate()).padStart(2, '0');
        checkOutSpan.textContent = `${yyyy}-${mm}-${dd}`;
    } else {
        checkOutSpan.textContent = '-';
        calculatedCheckOutDate = null;
    }
}

// On form submit, use calculated check-out date
function handleBookingSubmit(e) {
    e.preventDefault();

    const formData = {
        checkIn: checkInInput.value,
        checkOut: calculatedCheckOutDate ? `${calculatedCheckOutDate.getFullYear()}-${String(calculatedCheckOutDate.getMonth() + 1).padStart(2, '0')}-${String(calculatedCheckOutDate.getDate()).padStart(2, '0')}` : '',
        adults: document.getElementById('adults').value,
        children: childrenInput.value,
        childrenAges: [],
        notes: document.getElementById('notes').value
    };

    // Get children ages
    document.querySelectorAll('.child-age').forEach(input => {
        formData.childrenAges.push(input.value);
    });

    // Find selected villa (if applicable)
    // const villa = villasData.villas.find(v => v.id === parseInt(formData.villaId));
    // For now, just send booking info (no villa selection in this form)

    // Calculate nights
    const checkInDate = new Date(formData.checkIn);
    const checkOutDate = calculatedCheckOutDate;
    const nights = selectedTotalNights || (checkInDate && checkOutDate ? Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)) : 0);

    // Prepare WhatsApp message
    let message = `New Booking Inquiry:\n\n`;
    // message += `*Villa:* ${villa.title}\n`;
    // message += `*Harga:* $${villa.price}/malam\n`;
    message += `*Check In:* ${formData.checkIn}\n`;
    message += `*Check Out:* ${formData.checkOut}\n`;
    message += `*Malam:* Rb{nights}\n`;
    // message += `*Total:* $${villa.price * nights}\n`;
    message += `*Adults:* ${formData.adults}\n`;
    message += `*Children:* ${formData.children}\n`;

    if (formData.childrenAges.length > 0) {
        message += `*Children Ages:* ${formData.childrenAges.join(', ')}\n`;
    }

    message += `*Special Requests:* ${formData.notes || 'None'}\n\n`;
    message += `Please contact the guest as soon as possible.`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/+6283185294060?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
    bookingForm.reset();
    checkOutSpan.textContent = '-';
    selectedCheckInDate = null;
    selectedTotalNights = null;
    calculatedCheckOutDate = null;
}

// Add event listeners to villa cards
function addVillaCardEventListeners() {
    document.querySelectorAll('.villa-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't open modal if clicking on buttons inside the card
            if (e.target.closest('button')) return;

            const id = parseInt(card.querySelector('.whatsapp-btn').dataset.id);
            openVillaModal(id);
        });
    });

    document.querySelectorAll('.whatsapp-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const villaId = parseInt(btn.dataset.id);
            if (!villaId) return;
            openWhatsAppBookingModal(villaId);
        });
    });

    document.querySelectorAll('.fav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(e.target.closest('button').dataset.id);
            toggleFavorite(id);

            // Update the button's visual state
            const button = e.target.closest('button');
            if (isFavorite(id)) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }

            // Update the modal fav button if the modal is open for this villa
            const modalFavButton = document.querySelector('.modal-actions .fav-btn');
            if (modalFavButton && villaModal.classList.contains('active')) {
                const modalVillaId = parseInt(modalFavButton.dataset.id);
                if (modalVillaId === id) {
                    if (isFavorite(id)) {
                        modalFavButton.classList.add('active');
                        modalFavButton.innerHTML = `<i class="fas fa-heart"></i> Remove from Favorites`;
                    } else {
                        modalFavButton.classList.remove('active');
                        modalFavButton.innerHTML = `<i class="fas fa-heart"></i> Add to Favorites`;
                    }
                }
            }
        });
    });
}

// Setup all event listeners
function setupEventListeners() {

    // Scroll Note Button functionality
    const scrollNoteBtn = document.getElementById('scroll-note-btn');
    const scrollNoteBox = document.getElementById('scroll-note-box');

    if (scrollNoteBtn && scrollNoteBox) {
        scrollNoteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            scrollNoteBox.classList.toggle('active');
        });
        // Hide note box if clicking outside
        document.addEventListener('click', (e) => {
            if (scrollNoteBox.classList.contains('active')) {
                if (!scrollNoteBox.contains(e.target) && e.target !== scrollNoteBtn) {
                    scrollNoteBox.classList.remove('active');
                }
            }
        });
    }


    // Filter and sort controls
    sortBySelect.addEventListener('change', filterAndSortVillas);
    filterBySelect.addEventListener('change', filterAndSortVillas);

    // Modal close button
    closeModalBtn.addEventListener('click', () => {
        villaModal.classList.remove('active');
        favModal.classList.remove('active');
        if (whatsappBookingModal) {
            whatsappBookingModal.classList.remove('active');
        }
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === villaModal) {
            villaModal.classList.remove('active');
        }
        if (e.target === favModal) {
            favModal.classList.remove('active');
        }
        if (whatsappBookingModal && e.target === whatsappBookingModal) {
            whatsappBookingModal.classList.remove('active');
        }
    });

    // Close modal when clicking on close buttons (using event delegation)
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-modal') || e.target.closest('.btn-cancel')) {
            // Find which modal this close button belongs to
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        }
    });

    // Favorite cart button
    favCartBtn.addEventListener('click', () => {
        renderFavModal();
        favModal.classList.add('active');
    });

    // Share all favorites button -> open date picker modal
    whatsappAllBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openWhatsAppAllBookingModal();
    });

    // Children input change
    childrenInput.addEventListener('input', handleChildrenAges);

    // Booking form submission
    bookingForm.addEventListener('submit', handleBookingSubmit);

    // Initialize flatpickr for WhatsApp booking form
    if (whatsappCheckInInput && whatsappCheckOutInput) {

        // Initialize check-in date picker
        whatsappCheckInPicker = flatpickr(whatsappCheckInInput, {
            minDate: 'today',
            dateFormat: 'Y-m-d',
            altInput: true,
            altFormat: 'j M Y',
            disableMobile: true,
            locale: 'id',
            onChange: function (selectedDates) {
                // Update check-out min date to be after check-in
                if (selectedDates[0]) {
                    const minCheckOut = new Date(selectedDates[0]);
                    minCheckOut.setDate(minCheckOut.getDate() + 1);
                    if (whatsappCheckOutPicker) {
                        whatsappCheckOutPicker.set('minDate', minCheckOut);
                        // Auto-open the check-out picker to enhance UX
                        whatsappCheckOutPicker.open();
                        // If current checkout is invalid, adjust it to min valid date
                        const currentOut = whatsappCheckOutPicker.selectedDates?.[0];
                        if (!currentOut || currentOut <= selectedDates[0]) {
                            whatsappCheckOutPicker.setDate(minCheckOut, true);
                        }
                    }
                } else {
                    // If check-in cleared, reset checkout constraints and value
                    if (whatsappCheckOutPicker) {
                        whatsappCheckOutPicker.clear();
                        whatsappCheckOutPicker.set('minDate', 'today');
                    }
                }
            }
        });

        // Initialize check-out date picker
        whatsappCheckOutPicker = flatpickr(whatsappCheckOutInput, {
            minDate: 'today',
            dateFormat: 'Y-m-d',
            altInput: true,
            altFormat: 'j M Y',
            disableMobile: true,
            locale: 'id'
        });
    }

    // WhatsApp booking form submission
    if (whatsappBookingForm) {
        whatsappBookingForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const checkIn = whatsappCheckInInput?.value;
            const checkOut = whatsappCheckOutInput?.value;

            if (!checkIn || !checkOut) {
                alert('Please select both check-in and check-out dates.');
                return;
            }

            // Validate that check-out is after check-in
            const checkInDate = new Date(checkIn);
            const checkOutDate = new Date(checkOut);

            if (checkOutDate <= checkInDate) {
                alert('Check-out date must be after check-in date.');
                return;
            }

            // Send WhatsApp message with dates (short month + auto nights)
            if (currentWhatsappVillaId) {
                // Single villa flow
                sendVillaToWhatsApp(currentWhatsappVillaId, checkInDate, checkOutDate);
            } else {
                // All favorites flow
                sendAllFavoritesToWhatsApp(checkInDate, checkOutDate);
            }
        });
    }

    // Mobile menu button
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // Close mobile menu when clicking on a link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    });

    // Villas grid horizontal scroll arrows
    const villasGridEl = document.querySelector('.villas-grid');
    const leftArrow = document.querySelector('.villas-scroll-arrow.left');
    const rightArrow = document.querySelector('.villas-scroll-arrow.right');
    const scrollIndicator = document.querySelector('.villas-scroll-indicator-bar');
    if (leftArrow && rightArrow && villasGridEl) {
        leftArrow.addEventListener('click', () => {
            villasGridEl.scrollBy({ left: -350, behavior: 'smooth' });
        });
        rightArrow.addEventListener('click', () => {
            villasGridEl.scrollBy({ left: 350, behavior: 'smooth' });
        });
    }
    // Drag-to-scroll (mouse and touch)
    let isDown = false;
    let startX, scrollLeft;
    villasGridEl.addEventListener('mousedown', (e) => {
        isDown = true;
        villasGridEl.classList.add('dragging');
        startX = e.pageX - villasGridEl.offsetLeft;
        scrollLeft = villasGridEl.scrollLeft;
    });
    villasGridEl.addEventListener('mouseleave', () => {
        isDown = false;
        villasGridEl.classList.remove('dragging');
    });
    villasGridEl.addEventListener('mouseup', () => {
        isDown = false;
        villasGridEl.classList.remove('dragging');
    });
    villasGridEl.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - villasGridEl.offsetLeft;
        const walk = (x - startX) * 1.2; // scroll-fast
        villasGridEl.scrollLeft = scrollLeft - walk;
    });
    // Touch support
    villasGridEl.addEventListener('touchstart', (e) => {
        isDown = true;
        startX = e.touches[0].pageX - villasGridEl.offsetLeft;
        scrollLeft = villasGridEl.scrollLeft;
    });
    villasGridEl.addEventListener('touchend', () => {
        isDown = false;
    });
    villasGridEl.addEventListener('touchmove', (e) => {
        if (!isDown) return;
        const x = e.touches[0].pageX - villasGridEl.offsetLeft;
        const walk = (x - startX) * 1.2;
        villasGridEl.scrollLeft = scrollLeft - walk;
    });
    // Scroll indicator update
    function updateScrollIndicator() {
        if (!scrollIndicator) return;
        const maxScroll = villasGridEl.scrollWidth - villasGridEl.clientWidth;
        const percent = maxScroll > 0 ? (villasGridEl.scrollLeft / maxScroll) * 100 : 0;
        scrollIndicator.style.width = `${percent}%`;
    }
    villasGridEl.addEventListener('scroll', updateScrollIndicator);
    window.addEventListener('resize', updateScrollIndicator);
    setTimeout(updateScrollIndicator, 300);
}

// Fullscreen Image Viewer
let currentImageIndex = 0;
let currentVillaImages = [];

function openFullscreenViewer(images, startIndex = 0) {
    const viewer = document.getElementById('fullscreen-viewer');
    const fullscreenImage = document.getElementById('fullscreen-image');
    const currentImageEl = document.getElementById('current-image');
    const totalImagesEl = document.getElementById('total-images');
    const fullscreenContent = document.querySelector('.fullscreen-content');
    
    currentVillaImages = images;
    currentImageIndex = startIndex;
    
    // Preload the image before showing
    const img = new Image();
    img.onload = function() {
        // Update the image source and counter
        fullscreenImage.src = this.src;
        currentImageEl.textContent = currentImageIndex + 1;
        totalImagesEl.textContent = currentVillaImages.length;
        
        // Show the viewer
        viewer.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Trigger reflow to ensure the initial state is applied
        void viewer.offsetHeight;
        
        // Add show class to trigger the animation
        viewer.classList.add('show');
        
        // Add a small delay to ensure the transition works
        setTimeout(() => {
            fullscreenContent.style.opacity = '1';
            fullscreenContent.style.transform = 'scale(1)';
        }, 50);
    };
    
    // Start loading the image
    img.src = currentVillaImages[currentImageIndex];
}

function closeFullscreenViewer() {
    const viewer = document.getElementById('fullscreen-viewer');
    const fullscreenContent = document.querySelector('.fullscreen-content');
    
    // Start fade out animation
    viewer.classList.remove('show');
    fullscreenContent.style.opacity = '0';
    fullscreenContent.style.transform = 'scale(0.95)';
    
    // Wait for the animation to complete before hiding
    setTimeout(() => {
        viewer.style.display = 'none';
        document.body.style.overflow = '';
    }, 400); // Match this with the CSS transition duration
}

function showNextImage(e) {
    if (e) e.stopPropagation();
    if (currentVillaImages.length <= 1) return;
    
    currentImageIndex = (currentImageIndex + 1) % currentVillaImages.length;
    updateFullscreenImage();
}

function showPrevImage(e) {
    if (e) e.stopPropagation();
    if (currentVillaImages.length <= 1) return;
    
    currentImageIndex = (currentImageIndex - 1 + currentVillaImages.length) % currentVillaImages.length;
    updateFullscreenImage();
}

function updateFullscreenImage() {
    const fullscreenImage = document.getElementById('fullscreen-image');
    const currentImageEl = document.getElementById('current-image');
    
    // Add fade out class
    fullscreenImage.classList.add('fade-out');
    
    // After fade out, update image and fade in
    setTimeout(() => {
        // Create a new image to preload
        const img = new Image();
        img.onload = function() {
            // Update the image source
            fullscreenImage.src = this.src;
            currentImageEl.textContent = currentImageIndex + 1;
            
            // Remove fade-out class to trigger fade in
            setTimeout(() => {
                fullscreenImage.classList.remove('fade-out');
            }, 20);
        };
        
        // Start loading the new image
        img.src = currentVillaImages[currentImageIndex];
    }, 200); // Match this with the CSS transition duration
}

// Initialize fullscreen viewer event listeners
function initFullscreenViewer() {
    const viewer = document.getElementById('fullscreen-viewer');
    const closeBtn = document.querySelector('.close-fullscreen');
    const nextBtn = document.querySelector('.next-btn');
    const prevBtn = document.querySelector('.prev-btn');
    const fullscreenImage = document.getElementById('fullscreen-image');
    
    // Close when clicking outside the image
    viewer.addEventListener('click', (e) => {
        if (e.target === viewer) {
            closeFullscreenViewer();
        }
    });
    
    // Close button
    closeBtn.addEventListener('click', closeFullscreenViewer);
    
    // Navigation buttons
    nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showNextImage();
    });
    
    prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showPrevImage();
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!viewer.classList.contains('show')) return;
        
        if (e.key === 'Escape') {
            closeFullscreenViewer();
        } else if (e.key === 'ArrowRight') {
            showNextImage();
        } else if (e.key === 'ArrowLeft') {
            showPrevImage();
        }
    });
    
    // Swipe support for touch devices
    let touchStartX = 0;
    let touchEndX = 0;
    
    fullscreenImage.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    fullscreenImage.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        const swipeThreshold = 50; // Minimum distance to consider it a swipe
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                showNextImage(); // Swipe left
            } else {
                showPrevImage(); // Swipe right
            }
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initFullscreenViewer();
    init()
        .catch(error => {
            console.error('Error initializing app:', error);
        })
        .finally(() => {
            // Ensure intro text becomes visible even if config load failed
            if (typeof activateIntroText === 'function') activateIntroText();
        });
});












// Function to update header height CSS custom property and intro section height
function updateHeaderHeight() {
    const header = document.querySelector('header');
    const introSection = document.querySelector('.intro-section');

    if (header) {
        const headerHeight = header.offsetHeight;
        document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);

        // Also directly set the intro section height as a fallback
        if (introSection) {
            const windowHeight = window.innerHeight;
            const newHeight = windowHeight - headerHeight;
            introSection.style.height = `${newHeight}px`;
            introSection.style.minHeight = `${newHeight}px`;
        }
    }
}



// Function to initialize intro section with images from JSON data
function initializeIntroSection() {
    const introImagesContainer = document.getElementById('introImages');
    const headlines = document.querySelectorAll('.intro-headline, .intro-subhead, .intro-cta, #scroll-note-btn');
    const scrollHint = document.getElementById('scrollHint');

    // Get images from the loaded data, fallback to default images
    const imagesData = (villasData.web_intro_images && villasData.web_intro_images.images) || [];

    // Clear existing images
    if (introImagesContainer) {
        introImagesContainer.innerHTML = '';
    }

    // Create image elements only if we have images
    if (imagesData.length > 0) {
        imagesData.forEach((imageUrl, index) => {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = `Travel destination ${index + 1}`;
            img.classList.add('intro-image');
            if (index === 0) img.classList.add('active');
            if (introImagesContainer) {
                introImagesContainer.appendChild(img);
            }
        });
    }

    // Image switching logic
    const images = document.querySelectorAll('.intro-image');
    let currentImageIndex = 0;

    function switchImage() {
        if (images.length === 0) return;

        // Remove active class from current image
        images[currentImageIndex].classList.remove('active');

        // Move to next image
        currentImageIndex = (currentImageIndex + 1) % images.length;

        // Add active class to new image
        images[currentImageIndex].classList.add('active');
    }

    // Start image switching every 5 seconds
    const imageInterval = setInterval(switchImage, 5000);

    // Animate elements on page load
    setTimeout(() => {
        headlines.forEach(headline => {
            // Animate intro-headline, intro-subhead, intro-cta immediately
            if (!headline.id || headline.id !== 'scroll-note-btn') {
                headline.classList.add('active', 'in-view');
            }
        });
        if (scrollHint) {
            scrollHint.classList.add('active');
        }
        // Animate scroll-note-btn after intro-cta (extra delay)
        const scrollNoteBtn = document.getElementById('scroll-note-btn');
        if (scrollNoteBtn) {
            setTimeout(() => {
                scrollNoteBtn.classList.add('active', 'in-view');
            }, 900); // 400ms after the rest
        }
    }, 500);

    // Return cleanup function
    return () => {
        clearInterval(imageInterval);
    };
}



// Function to handle viewport height changes (especially for mobile browsers)
function updateViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);

    // Update intro section height again with new viewport height
    updateHeaderHeight();
}

// Initialize layout functions
function initializeLayout() {
    updateHeaderHeight();
    updateViewportHeight();
}

initializeLayout();