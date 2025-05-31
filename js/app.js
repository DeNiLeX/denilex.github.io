// app.js - Versión reorganizada

/**************************************
 * CONSTANTES Y CONFIGURACIÓN INICIAL *
 **************************************/
const ADMIN_PASSWORD = "admin123";
const DEFAULT_MAP_CENTER = ol.proj.fromLonLat([-90.5167, 14.6333]);
const DEFAULT_MAP_ZOOM = 7;

// Estilos para marcadores
const markerStyles = {
    'azul': new ol.style.Style({
        image: new ol.style.Icon({
            src: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-blue.png',
            scale: 0.8,
            anchor: [0.5, 1]
        })
    }),
    'rojo': new ol.style.Style({
        image: new ol.style.Icon({
            src: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-red.png',
            scale: 0.8,
            anchor: [0.5, 1]
        })
    }),
    'verde': new ol.style.Style({
        image: new ol.style.Icon({
            src: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-green.png',
            scale: 0.8,
            anchor: [0.5, 1]
        })
    }),
    'amarillo': new ol.style.Style({
        image: new ol.style.Icon({
            src: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-gold.png',
            scale: 0.8,
            anchor: [0.5, 1]
        })
    }),
    'morado': new ol.style.Style({
        image: new ol.style.Icon({
            src: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-violet.png',
            scale: 0.8,
            anchor: [0.5, 1]
        })
    }),
    'busqueda': new ol.style.Style({
        image: new ol.style.Icon({
            src: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-orange.png',
            scale: 1,
            anchor: [0.5, 1]
        })
    })
};

const circleColors = {
    'azul': 'rgba(52, 152, 219, 0.2)',
    'rojo': 'rgba(231, 76, 60, 0.2)',
    'verde': 'rgba(46, 204, 113, 0.2)',
    'amarillo': 'rgba(241, 196, 15, 0.2)',
    'morado': 'rgba(155, 89, 182, 0.2)'
};

const circleBorders = {
    'azul': 'rgba(52, 152, 219, 0.8)',
    'rojo': 'rgba(231, 76, 60, 0.8)',
    'verde': 'rgba(46, 204, 113, 0.8)',
    'amarillo': 'rgba(241, 196, 15, 0.8)',
    'morado': 'rgba(155, 89, 182, 0.8)'
};

/*********************
 * ESTADO GLOBAL *
 *********************/
let state = {
    providers: [
        {
            id: 1,
            name: "Distribuidora Comercial GT",
            address: "5ta avenida 12-45 zona 1",
            phone: "12345678",
            department: "Guatemala",
            municipality: "Guatemala",
            zone: "Zona 1",
            latitude: 14.6349,
            longitude: -90.5069,
            radius: 500
        },
        {
            id: 2,
            name: "Suministros Industriales del Norte",
            address: "3ra calle 7-89 zona 3",
            phone: "87654321",
            department: "Quetzaltenango",
            municipality: "Quetzaltenango",
            zone: "Zona 3",
            latitude: 14.8347,
            longitude: -91.5181,
            radius: 800
        }
    ],
    hiddenProviders: [],
    showHidden: false,
    currentId: 3,
    isEditing: false,
    map: null,
    markers: [],
    circles: [],
    searchLayer: null,
    popup: null,
    popupOverlay: null,
    doubleClickMarker: null, // ← Añade esta línea
};

let doubleClickMarkerTimeout = null; // Agrega esta variable global


/*********************
 * FUNCIONES DEL MAPA *
 *********************/
function initMap() {
    state.map = new ol.Map({
        target: 'map',
        layers: [new ol.layer.Tile({ source: new ol.source.OSM() })],
        view: new ol.View({
            center: DEFAULT_MAP_CENTER,
            zoom: DEFAULT_MAP_ZOOM
        })
    });

    initPopup();
    setupMapInteractions();
    updateMap();

    setTimeout(() => state.map.updateSize(), 100);
}

function initPopup() {
    state.popup = document.getElementById('popup');
    state.popupOverlay = new ol.Overlay({
        element: state.popup,
        autoPan: { animation: { duration: 250 } },
        autoPanMargin: 50,
        positioning: 'bottom-center'
    });
    
    state.map.addOverlay(state.popupOverlay);
    
    document.getElementById('popup-closer').addEventListener('click', (evt) => {
        state.popupOverlay.setPosition(undefined);
        evt.preventDefault();
    });
}

function setupMapInteractions() {
    let selectedFeature = null;
    
    state.map.on('pointermove', function(e) {
        if (e.dragging) return;
        const hit = state.map.hasFeatureAtPixel(e.pixel, {
            layerFilter: layer => layer.get('interactive') !== false
        });
        state.map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });
    
    state.map.on('singleclick', function(evt) {
        state.popupOverlay.setPosition(undefined);
        
        const features = [];
        state.map.forEachFeatureAtPixel(evt.pixel, function(feature) {
            const type = feature.get('type');
            if (type === 'provider' || type === 'search-result') {
                features.push(feature);
            }
        });
        
        if (features.length > 0) {
            selectedFeature = features[0];
            const coordinate = evt.coordinate;
            const lonLat = ol.proj.toLonLat(coordinate);
            
            if (selectedFeature.get('type') === 'provider') {
                document.getElementById('popup-title').innerHTML = selectedFeature.get('name');
                document.getElementById('popup-info').innerHTML = selectedFeature.get('info');
            } else {
                document.getElementById('popup-title').innerHTML = 'Ubicación encontrada';
                document.getElementById('popup-info').innerHTML = `
                    <p>${selectedFeature.get('name')}</p>
                    <div class="popup-coords">
                        <p><strong>Latitud:</strong> ${lonLat[1].toFixed(6)}</p>
                        <p><strong>Longitud:</strong> ${lonLat[0].toFixed(6)}</p>
                    </div>
                    <button id="useLocationBtn" class="btn btn-primary btn-sm">
                        <i class="fas fa-map-marker-alt"></i> Usar esta ubicación
                    </button>
                `;
                
                document.getElementById('useLocationBtn').addEventListener('click', function() {
                    document.getElementById('latitude').value = lonLat[1].toFixed(6);
                    document.getElementById('longitude').value = lonLat[0].toFixed(6);
                    state.popupOverlay.setPosition(undefined);
                    showNotification('Coordenadas copiadas al formulario');
                });
            }
            
            state.popupOverlay.setPosition(coordinate);
            
            const currentZoom = state.map.getView().getZoom();
            if (currentZoom < 12) {
                state.map.getView().animate({
                    zoom: Math.max(currentZoom, 12),
                    center: coordinate,
                    duration: 300
                });
            }
        } else {
            selectedFeature = null;
        }
    });

    // NUEVA FUNCIONALIDAD: Doble clic para crear marcador y obtener coordenadas
    state.map.on('dblclick', async function(evt) {
    const coordinate = evt.coordinate;
    const lonLat = ol.proj.toLonLat(coordinate);
    
    // Limpiar marcador anterior si existe
    if (state.doubleClickMarker) {
        state.map.removeLayer(state.doubleClickMarker);
        state.doubleClickMarker = null;
    }
        // Limpiar timeout anterior si existe
    if (doubleClickMarkerTimeout) {
        clearTimeout(doubleClickMarkerTimeout);
        doubleClickMarkerTimeout = null;
    }

    // Crear feature con propiedades interactivas
    const markerFeature = new ol.Feature({
        geometry: new ol.geom.Point(coordinate),
        type: 'manual-selection',
        name: 'Ubicación seleccionada',
        info: `
            <div class="popup-coords">
                <p><strong>Latitud:</strong> ${lonLat[1].toFixed(6)}</p>
                <p><strong>Longitud:</strong> ${lonLat[0].toFixed(6)}</p>
            </div>
            <button id="useManualLocationBtn" class="btn btn-primary btn-sm">
                <i class="fas fa-map-marker-alt"></i> Usar estas coordenadas
            </button>
        `,
        lonLat: lonLat // Guardamos las coordenadas
    });
    
    // Crear capa con el feature
    state.doubleClickMarker = new ol.layer.Vector({
        source: new ol.source.Vector({
            features: [markerFeature]
        }),
        style: new ol.style.Style({
            image: new ol.style.Icon({
                src: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-orange.png',
                scale: 1,
                anchor: [0.5, 1]
            })
        })
    });
    
    // Hacer la capa interactiva
    state.doubleClickMarker.set('interactive', true);
    state.map.addLayer(state.doubleClickMarker);
    
    // Mostrar popup inmediatamente
    showManualSelectionPopup(markerFeature, coordinate);

    // Nuevo timeout, se guarda el id
    doubleClickMarkerTimeout = setTimeout(() => {
        if (state.doubleClickMarker) {
            state.map.removeLayer(state.doubleClickMarker);
            state.doubleClickMarker = null;
            state.popupOverlay.setPosition(undefined);
        }
        doubleClickMarkerTimeout = null;
    }, 3000);
});
// Función auxiliar para mostrar el popup de selección manual
function showManualSelectionPopup(feature, coordinate) {
    document.getElementById('popup-title').innerHTML = feature.get('name');
    document.getElementById('popup-info').innerHTML = feature.get('info');
    state.popupOverlay.setPosition(coordinate);
    
    // Configurar el botón
    document.getElementById('useManualLocationBtn').addEventListener('click', function() {
        const lonLat = feature.get('lonLat');
        document.getElementById('latitude').value = lonLat[1].toFixed(6);
        document.getElementById('longitude').value = lonLat[0].toFixed(6);
        state.popupOverlay.setPosition(undefined);
        showNotification('Coordenadas copiadas al formulario');
    });
}

// Modifica el event listener singleclick para incluir manual-selection
state.map.on('singleclick', function(evt) {
    state.popupOverlay.setPosition(undefined);
    
    const features = [];
    state.map.forEachFeatureAtPixel(evt.pixel, function(feature) {
        const type = feature.get('type');
        if (type === 'provider' || type === 'search-result' || type === 'manual-selection') {
            features.push(feature);
        }
    });
    
    if (features.length > 0) {
        const selectedFeature = features[0];
        const coordinate = evt.coordinate;
        
        if (selectedFeature.get('type') === 'manual-selection') {
            showManualSelectionPopup(selectedFeature, coordinate);
        } else if (selectedFeature.get('type') === 'provider') {
            document.getElementById('popup-title').innerHTML = selectedFeature.get('name');
            document.getElementById('popup-info').innerHTML = selectedFeature.get('info');
            state.popupOverlay.setPosition(coordinate);
        } else {
            document.getElementById('popup-title').innerHTML = 'Ubicación encontrada';
            document.getElementById('popup-info').innerHTML = selectedFeature.get('name');
            state.popupOverlay.setPosition(coordinate);
        }
        
        const currentZoom = state.map.getView().getZoom();
        if (currentZoom < 12) {
            state.map.getView().animate({
                zoom: Math.max(currentZoom, 12),
                center: coordinate,
                duration: 300
            });
        }
    }
});
}

function updateMap() {
    // Limpiar marcadores y círculos anteriores
    state.markers.forEach(marker => state.map.removeLayer(marker));
    state.markers = [];
    state.circles.forEach(circle => state.map.removeLayer(circle));
    state.circles = [];
    
    // Determinar qué proveedores mostrar
    const providersToShow = state.showHidden ? state.hiddenProviders : state.providers;
    
    providersToShow.forEach(provider => {
        if (provider.latitude && provider.longitude) {
            const coords = ol.proj.fromLonLat([provider.longitude, provider.latitude]);
            
            const markerFeature = new ol.Feature({
                geometry: new ol.geom.Point(coords),
                name: provider.name,
                id: provider.id,
                type: 'provider',
                info: `
                    <p><strong>Dirección:</strong> ${provider.address}</p>
                    <p><strong>Teléfono:</strong> ${provider.phone}</p>
                    <p><strong>Departamento: ${provider.department}</p>
                    <p><strong>Municipio:</strong> ${provider.municipality}</p>
                    ${provider.zone ? `<p><strong>Zona:</strong> ${provider.zone}</p>` : ''}
                `
            });
            
            markerFeature.setStyle(markerStyles[provider.color || 'azul']);
            
            const markerLayer = new ol.layer.Vector({
                source: new ol.source.Vector({ features: [markerFeature] })
            });
            
            state.map.addLayer(markerLayer);
            state.markers.push(markerLayer);
            
            if (provider.radius) {
                const circle = new ol.layer.Vector({
                    source: new ol.source.Vector(),
                    style: new ol.style.Style({
                        fill: new ol.style.Fill({ 
                            color: circleColors[provider.color || 'azul'] 
                        }),
                        stroke: new ol.style.Stroke({
                            color: circleBorders[provider.color || 'azul'],
                            width: 2
                        })
                    })
                });
                
                const circleFeature = new ol.Feature({
                    geometry: new ol.geom.Circle(coords, provider.radius)
                });
                
                circle.getSource().addFeature(circleFeature);
                state.map.addLayer(circle);
                state.circles.push(circle);
            }
        }
    });
    
    if (state.markers.length > 0) {
        const extent = state.markers[0].getSource().getExtent();
        for (let i = 1; i < state.markers.length; i++) {
            ol.extent.extend(extent, state.markers[i].getSource().getExtent());
        }
        state.map.getView().fit(extent, {padding: [50, 50, 50, 50]});
    }
}

/*****************************
 * FUNCIONES DE PROVEEDORES *
 *****************************/
async function hideProvider(id) {
    // Solicitar contraseña al ocultar
    const password = await askPassword("Ingrese la contraseña para ocultar este proveedor:");
    
    if (password !== ADMIN_PASSWORD) {
        showNotification("Contraseña incorrecta", 'error');
        return; // Detener si la contraseña es incorrecta
    }

    const providerIndex = state.providers.findIndex(p => p.id === id);
    if (providerIndex === -1) return;
    
    state.hiddenProviders.push(state.providers[providerIndex]);
    state.providers.splice(providerIndex, 1);
    
    renderProviderList();
    updateMap();
    updateProviderCount();
    showNotification('Proveedor oculto temporalmente');
}

function restoreProvider(id) {
    const providerIndex = state.hiddenProviders.findIndex(p => p.id === id);
    if (providerIndex === -1) return;
    
    state.providers.push(state.hiddenProviders[providerIndex]);
    state.hiddenProviders.splice(providerIndex, 1);
    
    renderProviderList();
    updateMap();
    updateProviderCount();
    showNotification('Proveedor restaurado');
}

async function toggleHiddenProviders() {
    // Si vamos a MOSTRAR ocultos (y no están visibles actualmente)
    if (!state.showHidden) {
        const password = await askPassword();
        
        if (password !== ADMIN_PASSWORD) {
            showNotification("Contraseña incorrecta", 'error');
            return; // No continuar si la contraseña es incorrecta
        }
    }
    
    // Cambiar el estado
    state.showHidden = !state.showHidden;
    
    // Actualizar la UI
    updateToggleButton();
    renderProviderList();
    updateMap();
    updateProviderCount();
}

function updateToggleButton() {
    const toggleBtn = document.getElementById('toggleHiddenBtn');
    if (!toggleBtn) return;
    
    if (state.showHidden) {
        toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Mostrar Visibles';
        toggleBtn.classList.remove('btn-secondary');
        toggleBtn.classList.add('btn-warning');
    } else {
        toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Mostrar ocultos';
        toggleBtn.classList.remove('btn-warning');
        toggleBtn.classList.add('btn-secondary');
    }
}

function renderProviderList(filteredProviders = null) {
    const listContainer = document.getElementById('providerList');
    listContainer.innerHTML = '';

    // Determinar qué proveedores mostrar
    const providersToShow = state.showHidden ? state.hiddenProviders : 
                          (filteredProviders || state.providers);

    if (providersToShow.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <p>${state.showHidden ? 'No hay proveedores ocultos' : 'No hay proveedores para mostrar'}</p>
            </div>
        `;
        return;
    }

    providersToShow.forEach(provider => {
        const card = document.createElement('div');
        card.className = `provider-card ${state.showHidden ? 'hidden-provider' : ''}`;
        card.dataset.id = provider.id;
        
        let phoneClicks = 0;
        let clickTimeout;
        
        const phoneElement = document.createElement('p');
        phoneElement.innerHTML = `<strong><i class="fas fa-phone"></i> Teléfono:</strong> <span class="phone-number">${provider.phone}</span>`;
        
        const phoneSpan = phoneElement.querySelector('.phone-number');
        phoneSpan.addEventListener('click', function() {
            phoneClicks++;
            
            if (phoneClicks === 1) {
                clickTimeout = setTimeout(() => {
                    phoneClicks = 0;
                }, 300);
            } else if (phoneClicks === 2) {
                clearTimeout(clickTimeout);
                navigator.clipboard.writeText(provider.phone)
                    .then(() => showNotification('Teléfono copiado al portapapeles'))
                    .catch(() => showNotification('No se pudo copiar el teléfono', 'error'));
                phoneClicks = 0;
            }
        });
        
        card.innerHTML = `
            <h3>${provider.name}</h3>
            <p><strong><i class="fas fa-map-marker-alt"></i> Dirección:</strong> ${provider.address}</p>
            <p><strong><i class="fas fa-map"></i> Departamento:</strong> ${provider.department}</p>
            <p><strong><i class="fas fa-city"></i> Municipio:</strong> ${provider.municipality}</p>
            ${provider.zone ? `<p><strong><i class="fas fa-map-pin"></i> Zona:</strong> ${provider.zone}</p>` : ''}
        `;
        
        card.appendChild(phoneElement);
        
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'card-actions';

        if (state.showHidden) {
            const restoreBtn = document.createElement('button');
            restoreBtn.className = 'btn btn-sm btn-success';
            restoreBtn.innerHTML = '<i class="fas fa-eye"></i> Mostrar';
            restoreBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const password = await askPassword();
                if (password !== ADMIN_PASSWORD) {
                    showNotification("Contraseña incorrecta", 'error');
                    return;
                }
                restoreProvider(provider.id);
        });
            actionsContainer.appendChild(restoreBtn);

        if (provider.latitude && provider.longitude) {
            const locateBtn = document.createElement('button');
            locateBtn.className = 'btn btn-sm btn-info';
            locateBtn.innerHTML = '<i class="fas fa-map-marked-alt"></i>';
            locateBtn.title = 'Ubicar en el mapa';
            locateBtn.addEventListener('click', () => locateProvider(provider.id));
            actionsContainer.appendChild(locateBtn);
            
            }

        } else {
            const hideBtn = document.createElement('button');
            hideBtn.className = 'btn btn-sm btn-warning';
            hideBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Ocultar';
            hideBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                hideProvider(provider.id);
            });
            actionsContainer.appendChild(hideBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-danger';
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteBtn.title = 'Eliminar';
            deleteBtn.addEventListener('click', () => deleteProvider(provider.id));
            actionsContainer.appendChild(deleteBtn);
            
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-sm btn-primary';
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.title = 'Editar';
            editBtn.addEventListener('click', () => editProvider(provider.id));
            actionsContainer.appendChild(editBtn);
            
            if (provider.latitude && provider.longitude) {
                const locateBtn = document.createElement('button');
                locateBtn.className = 'btn btn-sm btn-info';
                locateBtn.innerHTML = '<i class="fas fa-map-marked-alt"></i>';
                locateBtn.title = 'Ubicar en el mapa';
                locateBtn.addEventListener('click', () => locateProvider(provider.id));
                actionsContainer.appendChild(locateBtn);
            }
        }
        
        card.appendChild(actionsContainer);
        listContainer.appendChild(card);
    });
}

/*************************
 * FUNCIONES DEL FORMULARIO *
 *************************/
function initForm() {
    const form = document.getElementById('providerForm');
    const toggleFormBtn = document.getElementById('toggleFormBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    toggleFormBtn.addEventListener('click', function() {
    cancelEdit(); // Limpia el formulario y estado de edición
    // Ahora sí, muestra el formulario y oculta la lista
    document.getElementById('formSection').style.display = 'block';
    document.getElementById('listSection').style.display = 'none';
});

    form.addEventListener('submit', function(e) {
    e.preventDefault();
    state.isEditing ? updateProvider() : addProvider();
    // Mostrar lista y ocultar formulario después de guardar
    document.getElementById('formSection').style.display = 'none';
    document.getElementById('listSection').style.display = 'block';
});
    
    cancelBtn.addEventListener('click', function() {
    const formSection = document.getElementById('formSection');
    const listSection = document.getElementById('listSection');
    formSection.style.display = 'none';
    listSection.style.display = 'block';
    cancelEdit();
});
    
    document.getElementById('getLocation').addEventListener('click', function() {
        if (navigator.geolocation) {
            const btn = this;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Obteniendo...';
            btn.disabled = true;
            
            navigator.geolocation.getCurrentPosition(
                position => {
                    document.getElementById('latitude').value = position.coords.latitude.toFixed(6);
                    document.getElementById('longitude').value = position.coords.longitude.toFixed(6);
                    btn.innerHTML = '<i class="fas fa-location-arrow"></i> Obtener Ubicación';
                    btn.disabled = false;
                },
                error => {
                    showNotification('No se pudo obtener la ubicación: ' + error.message, 'error');
                    btn.innerHTML = '<i class="fas fa-location-arrow"></i> Obtener Ubicación';
                    btn.disabled = false;
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        } else {
            showNotification('Geolocalización no es soportada por tu navegador', 'error');
        }
    });
}

async function addProvider() {
    // Validación de campos requeridos
    const requiredFields = ['name', 'address', 'phone', 'department', 'municipality'];
    for (const fieldId of requiredFields) {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            field.focus();
            showNotification(`Por favor complete el campo ${field.previousElementSibling.textContent}`, 'error');
            return;
        }
    }
    
    // Validación de contraseña
    const password = await askPassword();
    if (password !== ADMIN_PASSWORD) {
        showNotification("Contraseña incorrecta", 'error');
        return;
    }

    // Obtener valores del formulario
    const provider = {
    id: state.currentId++,
    name: document.getElementById('name').value.trim(),
    address: document.getElementById('address').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    department: document.getElementById('department').value,
    municipality: document.getElementById('municipality').value.trim(),
    zone: document.getElementById('zone').value.trim() || null,
    latitude: parseFloat(document.getElementById('latitude').value) || null,
    longitude: parseFloat(document.getElementById('longitude').value) || null,
    radius: parseInt(document.getElementById('radius').value) || 500,
    color: document.getElementById('markerColor').value || 'azul' // Valor por defecto
};

    state.providers.push(provider);
    renderProviderList();
    updateMap();
    document.getElementById('providerForm').reset();
    showNotification('Proveedor agregado correctamente');
    updateProviderCount();
}

async function editProvider(id) {
    const password = await askPassword();
    if (password !== ADMIN_PASSWORD) {
        showNotification("Contraseña incorrecta", 'error');
        return;
    }

    const provider = state.providers.find(p => p.id === id);
    if (!provider) return;
    
    state.isEditing = true;
    document.getElementById('providerId').value = provider.id;
    document.getElementById('name').value = provider.name;
    document.getElementById('address').value = provider.address;
    document.getElementById('phone').value = provider.phone;
    document.getElementById('department').value = provider.department;
    document.getElementById('municipality').value = provider.municipality;
    document.getElementById('zone').value = provider.zone || '';
    document.getElementById('latitude').value = provider.latitude || '';
    document.getElementById('longitude').value = provider.longitude || '';
    document.getElementById('radius').value = provider.radius || 500;
    document.getElementById('markerColor').value = provider.color || 'azul';
    
    document.getElementById('saveBtn').innerHTML = '<i class="fas fa-save"></i> Actualizar Proveedor';
    document.getElementById('formSection').style.display = 'block';
    document.getElementById('toggleFormBtn').innerHTML = '<i class="fas fa-eye-slash"></i> Ocultar Formulario';
    document.getElementById('formSection').scrollIntoView({ behavior: 'smooth' });
    
    document.getElementById('formSection').style.display = 'block';
    document.getElementById('listSection').style.display = 'none';
}


function updateProvider() {
    const id = parseInt(document.getElementById('providerId').value);
    const providerIndex = state.providers.findIndex(p => p.id === id);
    if (providerIndex === -1) return;

    // Elimina marcador y círculo anteriores
    if (state.markers[providerIndex]) {
        state.map.removeLayer(state.markers[providerIndex]);
    }
    if (state.circles[providerIndex]) {
        state.map.removeLayer(state.circles[providerIndex]);
    }

    state.providers[providerIndex] = {
        id,
        name: document.getElementById('name').value.trim(),
        address: document.getElementById('address').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        department: document.getElementById('department').value,
        municipality: document.getElementById('municipality').value.trim(),
        zone: document.getElementById('zone').value.trim() || null,
        latitude: parseFloat(document.getElementById('latitude').value) || null,
        longitude: parseFloat(document.getElementById('longitude').value) || null,
        radius: parseInt(document.getElementById('radius').value) || 500,
        color: document.getElementById('markerColor').value || 'azul'
    };

    renderProviderList();
    updateMap();
    cancelEdit();
    showNotification('Proveedor actualizado correctamente');
}


function cancelEdit() {
    state.isEditing = false;
    document.getElementById('providerForm').reset();
    document.getElementById('saveBtn').innerHTML = '<i class="fas fa-save"></i> Guardar Proveedor';
    document.getElementById('providerId').value = '';
    document.getElementById('formSection').style.display = 'none';
    document.getElementById('toggleFormBtn').innerHTML = '<i class="fas fa-plus"></i> Agregar Proveedor';

}

async function deleteProvider(id) {
    const password = await askPassword();
    if (password !== ADMIN_PASSWORD) {
        showNotification("Contraseña incorrecta", 'error');
        return;
    }

    const providerIndex = state.providers.findIndex(p => p.id === id);
    if (providerIndex === -1) return;

    const provider = state.providers[providerIndex];

    const confirmDelete = await showConfirmationDialog(
        `¿Estás seguro de eliminar a ${provider.name}?`,
        'Esta acción no se puede deshacer.'
    );

    if (confirmDelete) {
        // Elimina marcador y círculo del mapa
        if (state.markers[providerIndex]) {
            state.map.removeLayer(state.markers[providerIndex]);
        }
        if (state.circles[providerIndex]) {
            state.map.removeLayer(state.circles[providerIndex]);
        }

        state.providers = state.providers.filter(p => p.id !== id);
        renderProviderList();
        updateMap();
        showNotification('Proveedor eliminado correctamente');
        updateProviderCount();
    }
}

function locateProvider(id) {
    // Buscar en la lista correcta según la vista actual
    const providersList = state.showHidden ? state.hiddenProviders : state.providers;
    const provider = providersList.find(p => p.id === id);

    if (!provider || !provider.latitude || !provider.longitude) {
        showNotification('Este proveedor no tiene coordenadas definidas', 'error');
        return;
    }
    
    const coords = ol.proj.fromLonLat([provider.longitude, provider.latitude]);
    state.map.getView().animate({
        center: coords,
        zoom: 15,
        duration: 1000
    });
    
    state.markers.forEach(marker => {
        const feature = marker.getSource().getFeatures()[0];
        if (feature && feature.get('id') === provider.id) {
            // Guardamos el estilo original antes de cambiarlo
            const originalStyle = feature.getStyle();
            
            // Aplicamos el estilo rojo como marcador activo
            feature.setStyle(markerStyles['rojo']);
            
            // Después de 3 segundos, restauramos el estilo original
            setTimeout(() => {
                feature.setStyle(originalStyle);
            }, 3000);
        }
    });
}

/*************************
 * FUNCIONES DE BÚSQUEDA *
 *************************/
function initFilters() {
    const searchInput = document.getElementById('searchInput');
    const filterDepartment = document.getElementById('filterDepartment');
    const filterMunicipality = document.getElementById('filterMunicipality');
    
    filterDepartment.addEventListener('change', function() {
        updateMunicipalityFilter();
        filterProviders();
    });
    
    filterMunicipality.addEventListener('change', filterProviders);
    searchInput.addEventListener('input', filterProviders);
}

function updateMunicipalityFilter() {
    const department = document.getElementById('filterDepartment').value;
    const filterMunicipality = document.getElementById('filterMunicipality');
    
    filterMunicipality.innerHTML = '<option value="">Todos los municipios</option>';
    
    if (department) {
        const municipalities = [...new Set(
            state.providers.filter(p => p.department === department)
            .map(p => p.municipality))
        ].sort();
        
        municipalities.forEach(municipality => {
            const option = document.createElement('option');
            option.value = municipality;
            option.textContent = municipality;
            filterMunicipality.appendChild(option);
        });
    }
}

function filterProviders() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const department = document.getElementById('filterDepartment').value;
    const municipality = document.getElementById('filterMunicipality').value;
    
    let filtered = state.providers;
    
    if (searchTerm) {
        filtered = filtered.filter(provider => 
            provider.name.toLowerCase().includes(searchTerm) || 
            provider.phone.includes(searchTerm) ||
            provider.address.toLowerCase().includes(searchTerm) ||
            provider.municipality.toLowerCase().includes(searchTerm)
        );
    }
    
    if (department) {
        filtered = filtered.filter(provider => provider.department === department);
    }
    
    if (municipality) {
        filtered = filtered.filter(provider => provider.municipality === municipality);
    }
    
    renderProviderList(filtered);
    updateProviderCount(filtered);
    
    state.markers.forEach((marker, index) => {
        const isVisible = filtered.some(p => 
            p.latitude === state.providers[index].latitude && 
            p.longitude === state.providers[index].longitude
        );
        marker.setVisible(isVisible);
    });
    
    state.circles.forEach((circle, index) => {
        const isVisible = filtered.some(p => 
            p.latitude === state.providers[index].latitude && 
            p.longitude === state.providers[index].longitude
        );
        circle.setVisible(isVisible);
    });
}

function initMapSearch() {
    const searchInput = document.getElementById('mapSearchInput');
    const searchBtn = document.getElementById('searchMapBtn');
    
    searchBtn.addEventListener('click', searchLocation);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchLocation();
    });
}

function searchLocation() {
    const query = document.getElementById('mapSearchInput').value.trim();
    
    if (!query) {
        showNotification('Por favor ingrese una ubicación para buscar', 'error');
        return;
    }
    
    if (state.searchLayer) {
        state.map.removeLayer(state.searchLayer);
        state.searchLayer = null;
    }
    
    const searchBtn = document.getElementById('searchMapBtn');
    const originalHtml = searchBtn.innerHTML;
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...';
    searchBtn.disabled = true;
    
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=gt&limit=1`)
        .then(response => response.json())
        .then(data => {
            if (data.length === 0) throw new Error('Ubicación no encontrada');
            
            const result = data[0];
            const coords = ol.proj.fromLonLat([parseFloat(result.lon), parseFloat(result.lat)]);
            
            state.searchLayer = new ol.layer.Vector({
                source: new ol.source.Vector({
                    features: [
                        new ol.Feature({
                            geometry: new ol.geom.Point(coords),
                            name: result.display_name,
                            type: 'search-result'
                        })
                    ]
                }),
                style: markerStyles['busqueda']
            });
            
            state.map.addLayer(state.searchLayer);

            // Eliminar el marcador de búsqueda después de 10 segundos
            setTimeout(() => {
                if (state.searchLayer) {
                    state.map.removeLayer(state.searchLayer);
                    state.searchLayer = null;
                }
             }, 10000);
            
            state.map.getView().animate({
                center: coords,
                zoom: 14,
                duration: 1000
            });
            
            showNotification(`Ubicación encontrada: ${result.display_name.split(',')[0]}`);
        })
        .catch(error => showNotification(`Error: ${error.message}`, 'error'))
        .finally(() => {
            searchBtn.innerHTML = originalHtml;
            searchBtn.disabled = false;
        });
}

/*************************
 * FUNCIONES AUXILIARES *
 *************************/
function updateProviderCount(filteredProviders = null) {
    const count = filteredProviders ? filteredProviders.length : state.providers.length;
    const hiddenCount = state.hiddenProviders.length;
    document.getElementById('providerCount').innerHTML = `
        ${count} visible${count !== 1 ? 's' : ''}
        ${hiddenCount > 0 ? `<span class="hidden-count">(${hiddenCount} oculto${hiddenCount !== 1 ? 's' : ''})</span>` : ''}
    `;
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification show ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

async function askPassword() {
    return new Promise((resolve) => {
        const dialog = document.getElementById('passwordDialog');
        const input = document.getElementById('passwordInput');
        
        input.value = '';
        dialog.style.display = 'flex';
        input.focus();
        
        const confirmBtn = document.getElementById('confirmPassword');
        const cancelBtn = document.getElementById('cancelPassword');
        
        const handleConfirm = () => {
            dialog.style.display = 'none';
            resolve(input.value);
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            input.removeEventListener('keypress', handleEnter);
        };
        
        const handleCancel = () => {
            dialog.style.display = 'none';
            resolve(null);
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            input.removeEventListener('keypress', handleEnter);
        };
        
        const handleEnter = (e) => {
            if (e.key === 'Enter') handleConfirm();
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        input.addEventListener('keypress', handleEnter);
    });
}

function showConfirmationDialog(title, message) {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'modal';
        dialog.innerHTML = `
            <div class="modal-content">
                <h3><i class="fas fa-exclamation-triangle"></i> ${title}</h3>
                <p>${message}</p>
                <div class="modal-actions">
                    <button id="confirmDialogCancel" class="btn btn-outline">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button id="confirmDialogAccept" class="btn btn-danger">
                        <i class="fas fa-trash-alt"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        dialog.style.display = 'flex';
        
        document.getElementById('confirmDialogCancel').addEventListener('click', () => {
            dialog.remove();
            resolve(false);
        });
        
        document.getElementById('confirmDialogAccept').addEventListener('click', () => {
            dialog.remove();
            resolve(true);
        });
    });
}

function initMapControls() {
    document.getElementById('zoomIn').addEventListener('click', function() {
        const view = state.map.getView();
        view.animate({ zoom: view.getZoom() + 1, duration: 200 });
    });
    
    document.getElementById('zoomOut').addEventListener('click', function() {
        const view = state.map.getView();
        view.animate({ zoom: view.getZoom() - 1, duration: 200 });
    });
    
    document.getElementById('resetView').addEventListener('click', function() {
        state.map.getView().animate({
            center: DEFAULT_MAP_CENTER,
            zoom: DEFAULT_MAP_ZOOM,
            duration: 1000
        });
    });
}

/*********************
 * INICIALIZACIÓN *
 *********************/
document.addEventListener('DOMContentLoaded', function() {
    initForm();
    renderProviderList();
    initMap();
    initFilters();
    initMapControls();
    initMapSearch();
    updateProviderCount();
    document.getElementById('toggleHiddenBtn').addEventListener('click', toggleHiddenProviders);
});