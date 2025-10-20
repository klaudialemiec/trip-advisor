// Trip Advisor Frontend JavaScript
class TripAdvisorApp {
    constructor() {
        this.places = [];
        this.currentTab = 'map';
        this.currentFilter = 'all';
        this.currentSort = 'name';
        this.map = null;
        this.markers = [];
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.showEmptyState();
    }

    bindEvents() {
        // Analyze button
        document.getElementById('analyze-btn').addEventListener('click', () => {
            this.analyzeVideo();
        });

        // Enter key in input
        document.getElementById('youtube-url').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.analyzeVideo();
            }
        });

        // Tab switching
        document.getElementById('map-tab').addEventListener('click', () => {
            this.switchTab('map');
        });

        document.getElementById('list-tab').addEventListener('click', () => {
            this.switchTab('list');
        });

        // Sort
        document.getElementById('sort-select').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.renderPlacesList();
        });
    }

    async analyzeVideo() {
        const urlInput = document.getElementById('youtube-url');
        const url = urlInput.value.trim();
        
        if (!url) {
            this.showError('Proszę podać link do filmu YouTube');
            return;
        }

        if (!this.isValidYouTubeUrl(url)) {
            this.showError('Nieprawidłowy link do filmu YouTube');
            return;
        }

        this.hideError();
        this.showLoading();

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ video_url: url })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Wystąpił błąd podczas analizy filmu');
            }

            this.places = data.places;
            this.renderResults();
            
        } catch (error) {
            console.error('Error analyzing video:', error);
            this.showError('Wystąpił błąd podczas analizy filmu. Spróbuj ponownie.');
        } finally {
            this.hideLoading();
        }
    }

    isValidYouTubeUrl(url) {
        const patterns = [
            /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/,
            /^https?:\/\/youtube\.com\/watch\?.*v=/
        ];
        return patterns.some(pattern => pattern.test(url));
    }

    showLoading() {
        document.getElementById('loading-state').classList.remove('hidden');
        document.getElementById('empty-state').classList.add('hidden');
        document.getElementById('map-view').classList.add('hidden');
        document.getElementById('list-view').classList.add('hidden');
        document.getElementById('analyze-btn').disabled = true;
        document.getElementById('analyze-btn').innerHTML = '<i class="fas fa-spinner loading-spinner mr-2"></i>Analizuję...';
    }

    hideLoading() {
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('analyze-btn').disabled = false;
        document.getElementById('analyze-btn').innerHTML = '<i class="fab fa-youtube mr-2"></i>Analizuj film';
    }

    showEmptyState() {
        document.getElementById('empty-state').classList.remove('hidden');
        document.getElementById('map-view').classList.add('hidden');
        document.getElementById('list-view').classList.add('hidden');
    }

    showError(message) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            const span = errorDiv.querySelector('span');
            if (span) {
                span.textContent = message;
            }
            errorDiv.classList.remove('hidden');
        }
    }

    hideError() {
        document.getElementById('error-message').classList.add('hidden');
    }

    renderResults() {
        if (this.places.length === 0) {
            this.showEmptyState();
            return;
        }

        document.getElementById('empty-state').classList.add('hidden');
        
        const placesCountEl = document.getElementById('places-count');
        const totalCountEl = document.getElementById('total-count');
        
        if (placesCountEl) {
            placesCountEl.textContent = this.places.length;
        }
        
        if (totalCountEl) {
            totalCountEl.textContent = this.places.length;
        }

        this.generateFilterButtons();
        this.switchTab(this.currentTab);
    }

    switchTab(tab) {
        this.currentTab = tab;
        
        // Update tab buttons
        const mapTab = document.getElementById('map-tab');
        const listTab = document.getElementById('list-tab');
        
        if (tab === 'map') {
            mapTab.className = 'py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 border-blue-500 text-blue-600';
            listTab.className = 'py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';
            
            document.getElementById('map-view').classList.remove('hidden');
            document.getElementById('list-view').classList.add('hidden');
            
            this.initMap();
        } else {
            listTab.className = 'py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 border-blue-500 text-blue-600';
            mapTab.className = 'py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';
            
            document.getElementById('list-view').classList.remove('hidden');
            document.getElementById('map-view').classList.add('hidden');
            
            this.renderPlacesList();
        }
    }

    initMap() {
        const mapElement = document.getElementById('map');
        
        // Initialize map
        this.map = new google.maps.Map(mapElement, {
            center: { lat: 52.2297, lng: 21.0122 }, // Warsaw as default
            zoom: 6,
            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: true,
        });

        // Clear existing markers
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];

        if (this.places.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            
            console.log(`Rendering ${this.places.length} places on map`);
            
            this.places.forEach((place, index) => {
                console.log(`Place ${index}:`, place);
                
                if (place.coordinates && (place.coordinates.lat !== 0 || place.coordinates.lng !== 0)) {
                    console.log(`Adding marker for ${place.name} at ${place.coordinates.lat}, ${place.coordinates.lng}`);
                    
                    const marker = new google.maps.Marker({
                        position: place.coordinates,
                        map: this.map,
                        title: place.name,
                        icon: this.getMarkerIcon(place.type)
                    });

                    const infoWindow = new google.maps.InfoWindow({
                        content: this.createInfoWindowContent(place)
                    });

                    marker.addListener('click', () => {
                        infoWindow.open(this.map, marker);
                    });

                    this.markers.push(marker);
                    bounds.extend(place.coordinates);
                } else {
                    console.log(`Skipping ${place.name} - invalid coordinates:`, place.coordinates);
                }
            });

            console.log(`Total markers added: ${this.markers.length}`);

            // Fit map to show all markers
            if (this.markers.length > 0) {
                this.map.fitBounds(bounds);
            }
        }
    }

    getMarkerIcon(type) {
        const iconMap = {
            'park': 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
            'mountains': 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png',
            'sea': 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
            'city': 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            'lake': 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
            'monument': 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
            'other': 'https://maps.google.com/mapfiles/ms/icons/gray-dot.png',
        };
        return iconMap[type] || iconMap['other'];
    }

    createInfoWindowContent(place) {
        console.log(`Creating info window for place: ${place.name}, photos:`, place.photos);
        
        const photosHtml = place.photos && place.photos.length > 0 ? `
            <div class="mb-3">
                <div class="flex space-x-1 overflow-x-auto">
                    ${place.photos.slice(0, 3).map(photo => `
                        <img 
                            src="${photo}" 
                            alt="${place.name}" 
                            class="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80"
                            onclick="window.openPhotoGallery('${place.id}')"
                        />
                    `).join('')}
                    ${place.photos.length > 3 ? `
                        <div class="w-16 h-16 bg-gray-200 rounded flex items-center justify-center cursor-pointer hover:bg-gray-300" onclick="window.openPhotoGallery('${place.id}')">
                            <span class="text-xs text-gray-600">+${place.photos.length - 3}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        ` : '';

        const googleMapsUrl = this.getGoogleMapsUrl(place);

        return `
            <div class="p-2 max-w-xs">
                <h3 class="font-semibold text-lg mb-2">${place.name}</h3>
                ${photosHtml}
                <p class="text-sm text-gray-600 mb-2">${place.description}</p>
                <div class="flex items-center space-x-2">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        ${place.type}
                    </span>
                    ${place.rating ? `<span class="text-sm text-yellow-600">⭐ ${place.rating}</span>` : ''}
                </div>
                ${place.address ? `<p class="text-xs text-gray-500 mt-1">${place.address}</p>` : ''}
                ${googleMapsUrl ? `
                    <button
                        type="button"
                        class="mt-3 inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                        onclick="window.open('${googleMapsUrl}', '_blank')"
                    >
                        <i class="fas fa-bookmark mr-2"></i>Zapisz w Google Maps
                    </button>
                ` : ''}
            </div>
        `;
    }

    generateFilterButtons() {
        const filterContainer = document.querySelector('#list-view .flex.flex-wrap.gap-2');
        const existingButtons = filterContainer.querySelectorAll('button[id^="filter-"]');
        existingButtons.forEach(btn => btn.remove());

        const typeCounts = {};
        this.places.forEach(place => {
            typeCounts[place.type] = (typeCounts[place.type] || 0) + 1;
        });

        const typeIcons = {
            'park': '🌳',
            'mountains': '⛰️',
            'sea': '🌊',
            'city': '🏙️',
            'monument': '🏛️',
            'lake': '🏞️',
            'other': '📍',
        };

        Object.entries(typeCounts).forEach(([type, count]) => {
            const button = document.createElement('button');
            button.id = `filter-${type}`;
            button.className = 'px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200';
            button.innerHTML = `
                <span>${typeIcons[type] || '📍'}</span>
                <span class="capitalize ml-1">${type}</span>
                <span>(${count})</span>
            `;
            
            button.addEventListener('click', () => {
                this.setFilter(type);
            });
            
            filterContainer.appendChild(button);
        });
    }

    setFilter(type) {
        this.currentFilter = type;
        
        // Update filter buttons
        document.querySelectorAll('[id^="filter-"]').forEach(btn => {
            btn.className = 'px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200';
        });
        
        const activeButton = document.getElementById(`filter-${type}`);
        if (activeButton) {
            activeButton.className = 'px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800';
        }
        
        this.renderPlacesList();
    }

    renderPlacesList() {
        const placesList = document.getElementById('places-list');
        placesList.innerHTML = '';

        let filteredPlaces = this.places;
        
        // Apply filter
        if (this.currentFilter !== 'all') {
            filteredPlaces = this.places.filter(place => place.type === this.currentFilter);
        }

        // Apply sort
        filteredPlaces.sort((a, b) => {
            switch (this.currentSort) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'type':
                    return a.type.localeCompare(b.type);
                case 'rating':
                    return (b.rating || 0) - (a.rating || 0);
                default:
                    return 0;
            }
        });

        if (filteredPlaces.length === 0) {
            placesList.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-map-marker-alt text-gray-400 text-4xl mb-4"></i>
                    <p class="text-gray-600">Brak miejsc do wyświetlenia dla wybranego filtra</p>
                </div>
            `;
            return;
        }

        // Group by type if showing all
        if (this.currentFilter === 'all') {
            const grouped = {};
            filteredPlaces.forEach(place => {
                if (!grouped[place.type]) {
                    grouped[place.type] = [];
                }
                grouped[place.type].push(place);
            });

            Object.entries(grouped).forEach(([type, places]) => {
                const typeSection = document.createElement('div');
                typeSection.className = 'space-y-3';
                
                const typeHeader = document.createElement('div');
                typeHeader.className = 'flex items-center space-x-2';
                typeHeader.innerHTML = `
                    <span class="text-lg">${this.getTypeIcon(type)}</span>
                    <h3 class="text-lg font-semibold text-gray-900 capitalize">
                        ${type} (${places.length})
                    </h3>
                `;
                
                typeSection.appendChild(typeHeader);
                
                places.forEach(place => {
                    typeSection.appendChild(this.createPlaceCard(place));
                });
                
                placesList.appendChild(typeSection);
            });
        } else {
            filteredPlaces.forEach(place => {
                placesList.appendChild(this.createPlaceCard(place));
            });
        }
    }

    createPlaceCard(place) {
        console.log(`Creating card for place: ${place.name}, photos:`, place.photos);
        
        const photosHtml = place.photos && place.photos.length > 0 ? `
            <div class="mb-3">
                <div class="flex space-x-2 overflow-x-auto">
                    ${place.photos.slice(0, 4).map(photo => `
                        <img 
                            src="${photo}" 
                            alt="${place.name}" 
                            class="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80 flex-shrink-0"
                            onclick="window.openPhotoGallery('${place.id}')"
                        />
                    `).join('')}
                    ${place.photos.length > 4 ? `
                        <div class="w-20 h-20 bg-gray-200 rounded flex items-center justify-center cursor-pointer hover:bg-gray-300 flex-shrink-0" onclick="window.openPhotoGallery('${place.id}')">
                            <span class="text-sm text-gray-600">+${place.photos.length - 4}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        ` : '';

        const googleMapsUrl = this.getGoogleMapsUrl(place);

        const card = document.createElement('div');
        card.className = 'bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow fade-in';
        
        card.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-2">
                        <h4 class="text-lg font-semibold text-gray-900">${place.name}</h4>
                        <span class="text-lg">${this.getTypeIcon(place.type)}</span>
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${this.getTypeColor(place.type)}">
                            ${place.type}
                        </span>
                    </div>
                    
                    ${photosHtml}
                    
                    <p class="text-gray-600 mb-3">${place.description}</p>
                    
                    <div class="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        ${place.rating ? `
                            <div class="flex items-center space-x-1">
                                <i class="fas fa-star text-yellow-500"></i>
                                <span>${place.rating}</span>
                            </div>
                        ` : ''}
                        
                        ${place.address ? `
                            <div class="flex items-center space-x-1">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${place.address}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="sm:ml-4 flex flex-col items-start sm:items-end gap-2">
                    ${googleMapsUrl ? `
                        <button
                            type="button"
                            data-action="save-to-google-maps"
                            class="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                        >
                            <i class="fas fa-bookmark mr-2"></i>Zapisz w Google Maps
                        </button>
                    ` : ''}
                    ${place.website ? `
                        <a
                            href="${place.website}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                            <i class="fas fa-external-link-alt mr-2"></i>Strona www
                        </a>
                    ` : ''}
                </div>
            </div>
        `;
        
        const saveButton = card.querySelector('[data-action="save-to-google-maps"]');
        if (saveButton && googleMapsUrl) {
            saveButton.addEventListener('click', () => {
                window.open(googleMapsUrl, '_blank');
            });
        }

        return card;
    }

    getGoogleMapsUrl(place) {
        if (!place) {
            return null;
        }

        if (place.google_place_id) {
            const encodedId = encodeURIComponent(place.google_place_id);
            return `https://www.google.com/maps/place/?q=place_id:${encodedId}`;
        }

        if (place.coordinates && typeof place.coordinates.lat === 'number' && typeof place.coordinates.lng === 'number' && (place.coordinates.lat !== 0 || place.coordinates.lng !== 0)) {
            return `https://www.google.com/maps/search/?api=1&query=${place.coordinates.lat},${place.coordinates.lng}`;
        }

        if (place.name) {
            return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`;
        }

        return null;
    }

    getTypeIcon(type) {
        const iconMap = {
            'park': '🌳',
            'mountains': '⛰️',
            'sea': '🌊',
            'city': '🏙️',
            'monument': '🏛️',
            'lake': '🏞️',
            'other': '📍'
        };
        return iconMap[type] || '📍';
    }

    getTypeColor(type) {
        const colorMap = {
            'park': 'bg-green-100 text-green-800',
            'mountains': 'bg-orange-100 text-orange-800',
            'sea': 'bg-blue-100 text-blue-800',
            'city': 'bg-red-100 text-red-800',
            'monument': 'bg-purple-100 text-purple-800',
            'lake': 'bg-blue-100 text-blue-800',
            'other': 'bg-gray-100 text-gray-800'
        };
        return colorMap[type] || 'bg-gray-100 text-gray-800';
    }

    showPhotoGallery(place) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('photo-gallery-modal');
        if (!modal) {
            modal = this.createPhotoGalleryModal();
            document.body.appendChild(modal);
        }

        // Update modal content
        const modalTitle = modal.querySelector('#photo-gallery-title');
        const modalImages = modal.querySelector('#photo-gallery-images');
        const modalCounter = modal.querySelector('#photo-gallery-counter');

        if (modalTitle) {
            modalTitle.textContent = place.name;
        }
        
        if (modalImages) {
            modalImages.innerHTML = '';

            place.photos.forEach((photo, index) => {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'flex-shrink-0 w-full h-full flex items-center justify-center';
                imgContainer.innerHTML = `
                    <img 
                        src="${photo}" 
                        alt="${place.name} - Zdjęcie ${index + 1}" 
                        class="max-w-full max-h-full object-contain"
                    />
                `;
                modalImages.appendChild(imgContainer);
            });
        }

        // Update counter
        if (modalCounter) {
            modalCounter.textContent = `1 / ${place.photos.length}`;
        }

        // Show modal
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // Initialize gallery
        this.currentPhotoIndex = 0;
        this.currentPlace = place;
        this.updateGalleryDisplay();
    }

    createPhotoGalleryModal() {
        const modal = document.createElement('div');
        modal.id = 'photo-gallery-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 hidden';
        
        modal.innerHTML = `
            <div class="flex flex-col h-full">
                <!-- Header -->
                <div class="flex items-center justify-between p-4 text-white">
                    <h2 id="photo-gallery-title" class="text-xl font-semibold"></h2>
                    <div class="flex items-center space-x-4">
                        <span id="photo-gallery-counter" class="text-sm"></span>
                        <button id="photo-gallery-close" class="text-white hover:text-gray-300">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="flex-1 flex items-center justify-center p-4">
                    <div id="photo-gallery-images" class="w-full h-full flex overflow-hidden">
                        <!-- Images will be inserted here -->
                    </div>
                </div>

                <!-- Navigation -->
                <div class="flex items-center justify-center p-4 space-x-4">
                    <button id="photo-gallery-prev" class="bg-white bg-opacity-20 text-white px-4 py-2 rounded hover:bg-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed">
                        <i class="fas fa-chevron-left mr-2"></i>Poprzednie
                    </button>
                    <button id="photo-gallery-next" class="bg-white bg-opacity-20 text-white px-4 py-2 rounded hover:bg-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed">
                        Następne<i class="fas fa-chevron-right ml-2"></i>
                    </button>
                </div>
            </div>
        `;

        // Add event listeners
        modal.querySelector('#photo-gallery-close').addEventListener('click', () => {
            this.hidePhotoGallery();
        });

        modal.querySelector('#photo-gallery-prev').addEventListener('click', () => {
            this.previousPhoto();
        });

        modal.querySelector('#photo-gallery-next').addEventListener('click', () => {
            this.nextPhoto();
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hidePhotoGallery();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!modal.classList.contains('hidden')) {
                if (e.key === 'Escape') {
                    this.hidePhotoGallery();
                } else if (e.key === 'ArrowLeft') {
                    this.previousPhoto();
                } else if (e.key === 'ArrowRight') {
                    this.nextPhoto();
                }
            }
        });

        return modal;
    }

    hidePhotoGallery() {
        const modal = document.getElementById('photo-gallery-modal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    previousPhoto() {
        if (this.currentPhotoIndex > 0) {
            this.currentPhotoIndex--;
            this.updateGalleryDisplay();
        }
    }

    nextPhoto() {
        if (this.currentPhotoIndex < this.currentPlace.photos.length - 1) {
            this.currentPhotoIndex++;
            this.updateGalleryDisplay();
        }
    }

    updateGalleryDisplay() {
        const modalImages = document.getElementById('photo-gallery-images');
        const modalCounter = document.getElementById('photo-gallery-counter');
        const prevBtn = document.getElementById('photo-gallery-prev');
        const nextBtn = document.getElementById('photo-gallery-next');

        if (!modalImages || !this.currentPlace) return;

        // Update counter
        if (modalCounter) {
            modalCounter.textContent = `${this.currentPhotoIndex + 1} / ${this.currentPlace.photos.length}`;
        }

        // Update navigation buttons
        if (prevBtn) {
            prevBtn.disabled = this.currentPhotoIndex === 0;
        }
        if (nextBtn) {
            nextBtn.disabled = this.currentPhotoIndex === this.currentPlace.photos.length - 1;
        }

        // Update image display
        const imageContainers = modalImages.querySelectorAll('div');
        imageContainers.forEach((container, index) => {
            if (index === this.currentPhotoIndex) {
                container.classList.remove('hidden');
            } else {
                container.classList.add('hidden');
            }
        });
    }
}

// Global function to open photo gallery
window.openPhotoGallery = function(placeId) {
    const place = app.places.find(p => p.id === placeId);
    if (place && place.photos && place.photos.length > 0) {
        app.showPhotoGallery(place);
    }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TripAdvisorApp();
});
