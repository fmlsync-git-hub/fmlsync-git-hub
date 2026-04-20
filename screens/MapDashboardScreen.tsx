
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { listenToAccessiblePassengers, listenToAccessiblePassengersRtdb, listenToUsersAndSettings, listenToUsersAndSettingsRtdb } from '../services/firebase';
import { Passenger, User, UserSettings, Company, PassengerCategory } from '../types';
import { useCompanies } from '../context/CompanyContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { UserIcon, UsersIcon, ChevronDownIcon } from '../components/icons';

// Type definition for Google Maps
declare var google: any;

interface MapDashboardScreenProps {
    onSelectPassenger: (passenger: Passenger) => void;
    currentUser: User & UserSettings;
}

// Main component
const MapDashboardScreen: React.FC<MapDashboardScreenProps> = ({ onSelectPassenger, currentUser }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const geocoder = useRef<any>(null);
    const geocodeCache = useRef<Map<string, any>>(new Map());
    
    const [isLoading, setIsLoading] = useState(true);
    const [mapError, setMapError] = useState<string | null>(null);
    const [isMapInitialized, setIsMapInitialized] = useState(false);

    const [allPassengers, setAllPassengers] = useState<Passenger[]>([]);
    const [allUsers, setAllUsers] = useState<(User & UserSettings)[]>([]);
    
    const [filters, setFilters] = useState({
        showPersonnel: true,
        showUsers: true,
        companyIds: [] as string[],
    });

    const markersRef = useRef<{ [key: string]: any }>({});

    const { companies } = useCompanies();

    // 1. Initialize Map
    useEffect(() => {
        const initMap = async () => {
            if (isMapInitialized || !mapRef.current) return;
            try {
                const { Map } = await (window as any).google.maps.importLibrary("maps");
                const { Geocoder } = await (window as any).google.maps.importLibrary("geocoding");
                
                geocoder.current = new Geocoder();

                mapInstance.current = new Map(mapRef.current, {
                    center: { lat: 7.9465, lng: -1.0232 }, // Center of Ghana
                    zoom: 7,
                    mapId: 'a36151e52bb4399e', // A modern dark map style
                    disableDefaultUI: true,
                    zoomControl: true,
                    mapTypeControl: false,
                    streetViewControl: false,
                });
                
                setIsMapInitialized(true);

                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            mapInstance.current.setCenter({
                                lat: position.coords.latitude,
                                lng: position.coords.longitude,
                            });
                             mapInstance.current.setZoom(10);
                        },
                        () => { /* Fails gracefully, stays centered on Ghana */ }
                    );
                }
                setIsLoading(false);
            } catch (error) {
                console.error("Error initializing Google Maps:", error);
                setMapError("Could not initialize map. A page refresh might be needed.");
                setIsLoading(false);
            }
        };

        const handleScriptLoad = () => initMap();

        if ((window as any).google?.maps) {
            initMap();
            return;
        }

        window.addEventListener('google-maps-loaded', handleScriptLoad, { once: true });
        
        const scriptId = 'google-maps-script';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.API_KEY}&libraries=places,geocoding`;
            script.async = true;
            
            script.onload = () => {
                window.dispatchEvent(new Event('google-maps-loaded'));
            };

            script.onerror = () => {
                setMapError("Failed to load Google Maps script. Please check API key and network.");
                setIsLoading(false);
            };

            document.head.appendChild(script);
        }

        return () => {
            window.removeEventListener('google-maps-loaded', handleScriptLoad);
        };

    }, [isMapInitialized]);

    // 2. Fetch Data
    useEffect(() => {
        // 1. Primary Firestore Listeners
        const unsubPassengersFirestore = listenToAccessiblePassengers(currentUser, setAllPassengers);
        
        let unsubUsersFirestore = () => {};
        if (['admin', 'developer', 'app_manager'].includes(currentUser.role)) {
            unsubUsersFirestore = listenToUsersAndSettings(setAllUsers);
        }

        // 2. Realtime Database Fallback/Fast Listeners
        const unsubPassengersRtdb = listenToAccessiblePassengersRtdb(currentUser, (data) => {
            if (data && data.length > 0) setAllPassengers(data);
        });

        let unsubUsersRtdb = () => {};
        if (['admin', 'developer', 'app_manager'].includes(currentUser.role)) {
            unsubUsersRtdb = listenToUsersAndSettingsRtdb((data) => {
                if (data && data.length > 0) setAllUsers(data);
            });
        }

        return () => {
            unsubPassengersFirestore();
            unsubUsersFirestore();
            unsubPassengersRtdb();
            unsubUsersRtdb();
        };
    }, [currentUser]);

    // Helper to geocode city
    const getCoordsForCity = useCallback(async (city: string) => {
        const sanitizedCity = city.toLowerCase().trim();
        if (!sanitizedCity || !geocoder.current) return null;
        if (geocodeCache.current.has(sanitizedCity)) return geocodeCache.current.get(sanitizedCity);

        try {
            const response = await geocoder.current.geocode({ address: sanitizedCity, region: 'GH' });
            if (response.results[0]) {
                const location = response.results[0].geometry.location;
                const coords = { lat: location.lat(), lng: location.lng() };
                geocodeCache.current.set(sanitizedCity, coords);
                return coords;
            }
        } catch (error) {
            console.warn(`Geocoding failed for ${sanitizedCity}:`, error);
        }
        geocodeCache.current.set(sanitizedCity, null); // Cache failures too
        return null;
    }, []);

    // 3. Update Markers
    useEffect(() => {
        if (!mapInstance.current || !isMapInitialized) return;
        
        const currentMarkerIds = new Set<string>();

        const processMarkers = async () => {
             // Passengers
            if (filters.showPersonnel) {
                for (const p of allPassengers) {
                    if (filters.companyIds.length > 0 && !filters.companyIds.includes(p.companyId)) continue;
                    
                    const lastFlight = p.tickets
                        .filter(t => t.travelDate && new Date(t.travelDate) < new Date())
                        .sort((a, b) => new Date(b.travelDate).getTime() - new Date(a.travelDate).getTime())[0];
                    
                    const locationCity = lastFlight?.arrivalCity;
                    if (!locationCity) continue;

                    const coords = await getCoordsForCity(locationCity);
                    if (!coords) continue;
                    
                    const markerId = `p-${p.id}`;
                    currentMarkerIds.add(markerId);

                    const color = p.category === PassengerCategory.Expatriate ? '#4f46e5' : '#10b981';

                    const passport = p.passports?.[0];
                    const name = passport ? `${passport.firstNames} ${passport.surname}` : (p.ghanaCardData ? `${p.ghanaCardData.firstNames} ${p.ghanaCardData.surname}` : 'Unknown');

                    if (markersRef.current[markerId]) {
                        markersRef.current[markerId].setPosition(coords);
                    } else {
                         const marker = new google.maps.Marker({
                            position: coords,
                            map: mapInstance.current,
                            title: name,
                            icon: {
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 8,
                                fillColor: color,
                                fillOpacity: 0.9,
                                strokeWeight: 2,
                                strokeColor: 'white',
                            },
                        });

                        marker.addListener('click', () => onSelectPassenger(p));
                        markersRef.current[markerId] = marker;
                    }
                }
            }

             // Users
            if (filters.showUsers) {
                for (const u of allUsers) {
                    if (u.lastLocation && typeof u.lastLocation === 'object' && u.lastLocation.lat) {
                        const markerId = `u-${u.id}`;
                        currentMarkerIds.add(markerId);
                        
                        const coords = { lat: u.lastLocation.lat, lng: u.lastLocation.lng };
                        
                         if (markersRef.current[markerId]) {
                            markersRef.current[markerId].setPosition(coords);
                        } else {
                             const marker = new google.maps.Marker({
                                position: coords,
                                map: mapInstance.current,
                                title: u.username,
                                icon: {
                                    path: 'M10,2c-4.4,0-8,3.6-8,8c0,5.6,8,13,8,13s8-7.4,8-13C18,5.6,14.4,2,10,2z M10,12c-1.1,0-2-0.9-2-2s0.9-2,2-2s2,0.9,2,2S11.1,12,10,12z',
                                    fillColor: '#f59e0b',
                                    fillOpacity: 1,
                                    strokeWeight: 1,
                                    strokeColor: 'white',
                                    scale: 1.2,
                                    anchor: new google.maps.Point(10, 22),
                                },
                            });
                             markersRef.current[markerId] = marker;
                        }
                    }
                }
            }
             // Cleanup old/filtered markers
            Object.keys(markersRef.current).forEach(id => {
                if (!currentMarkerIds.has(id)) {
                    markersRef.current[id].setMap(null);
                    delete markersRef.current[id];
                }
            });
        };

        processMarkers();
    }, [allPassengers, allUsers, filters, getCoordsForCity, onSelectPassenger, isMapInitialized]);


    if (mapError) {
        return <div className="p-8 text-center text-danger bg-danger/10">{mapError}</div>;
    }

    return (
        <div className="h-full w-full relative -m-4 sm:-m-6 lg:-m-8">
            {isLoading && <LoadingSpinner fullScreen />}
            <div ref={mapRef} className="h-full w-full" />
            <FilterPanel filters={filters} setFilters={setFilters} companies={companies} />
        </div>
    );
};

// Filter Panel Component
const FilterPanel: React.FC<{ filters: any, setFilters: any, companies: Company[] }> = ({ filters, setFilters, companies }) => {
    const [isOpen, setIsOpen] = useState(true);

    const handleToggle = (key: string) => {
        setFilters((prev: any) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleCompanyToggle = (companyId: string) => {
        setFilters((prev: any) => {
            const newCompanyIds = prev.companyIds.includes(companyId)
                ? prev.companyIds.filter((id: string) => id !== companyId)
                : [...prev.companyIds, companyId];
            return { ...prev, companyIds: newCompanyIds };
        });
    };

    const allCompaniesSelected = filters.companyIds.length === 0;

    const toggleAllCompanies = () => {
        if (allCompaniesSelected) {
            setFilters((prev: any) => ({ ...prev, companyIds: companies.map(c => c.id) }));
        } else {
            setFilters((prev: any) => ({ ...prev, companyIds: [] }));
        }
    }


    return (
        <div className="absolute top-4 left-4 bg-surface/90 backdrop-blur-sm rounded-lg shadow-lg border border-border-default max-w-sm w-full z-10">
            <button onClick={() => setIsOpen(!isOpen)} className="flex justify-between items-center w-full p-3 font-semibold text-text-primary">
                <span>Map Filters</span>
                <ChevronDownIcon className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="p-3 border-t border-border-default space-y-4">
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-text-secondary">Layers</h4>
                        <FilterCheckbox icon={UsersIcon} label="Personnel" checked={filters.showPersonnel} onToggle={() => handleToggle('showPersonnel')} />
                        <FilterCheckbox icon={UserIcon} label="App Users" checked={filters.showUsers} onToggle={() => handleToggle('showUsers')} />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-text-secondary">Filter by Company</h4>
                        <div className="max-h-40 overflow-y-auto space-y-1 pr-2">
                            <FilterCheckbox label={allCompaniesSelected ? "Deselect All" : "Select All"} checked={allCompaniesSelected} onToggle={toggleAllCompanies} />
                            {companies.map(c => (
                                <FilterCheckbox key={c.id} label={c.name} checked={allCompaniesSelected || filters.companyIds.includes(c.id)} onToggle={() => handleCompanyToggle(c.id)} />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

const FilterCheckbox: React.FC<{ label: string, checked: boolean, onToggle: () => void, icon?: React.ElementType }> = ({ label, checked, onToggle, icon: Icon }) => (
    <label className="flex items-center gap-2 p-1.5 rounded-md hover:bg-surface-soft cursor-pointer">
        <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            className="h-4 w-4 rounded bg-surface border-border-default text-primary focus:ring-primary"
        />
        {Icon && <Icon className="h-5 w-5 text-text-secondary" />}
        <span className="text-sm text-text-primary">{label}</span>
    </label>
)

export default MapDashboardScreen;
