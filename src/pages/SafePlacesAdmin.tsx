import { useState, useEffect } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    useMapEvents,
    Popup,
} from "react-leaflet";
import { theme } from "../theme";
import { useAuth } from "../services/useAuth";
import {
    subscribeAdminSafePlaces,
    addAdminSafePlace,
    deleteAdminSafePlace,
    SAFE_PLACE_TYPES,
    type AdminSafePlace,
    type SafePlaceType,
} from "../services/safePlaces";
import L from "leaflet";

const COLOMBO_CENTER: [number, number] = [6.9271, 79.8612];

const PLACE_TYPES: { value: SafePlaceType; label: string; icon: string }[] = [
    { value: "police", label: "Police Station", icon: "🚔" },
    { value: "hospital", label: "Hospital", icon: "🏥" },
    { value: "fire_station", label: "Fire Station", icon: "🚒" },
    { value: "pharmacy", label: "Pharmacy", icon: "💊" },
    { value: "post_office", label: "Post Office", icon: "📮" },
    { value: "shelter", label: "Shelter", icon: "🏠" },
];

function createPlaceIcon(type: SafePlaceType) {
    const icon = SAFE_PLACE_TYPES[type]?.icon || "📍";
    return new L.DivIcon({
        className: "custom-place-icon",
        html: `<div style="background:white;width:36px;height:36px;border-radius:50%;border:3px solid #3b82f6;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:18px;">${icon}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
    });
}

function MapClickHandler({ onMapClick }: { onMapClick: (latlng: { lat: number; lng: number }) => void }) {
    useMapEvents({
        click: (e) => {
            onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
        },
    });
    return null;
}

export default function SafePlacesAdmin() {
    const { user } = useAuth();
    const [places, setPlaces] = useState<AdminSafePlace[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [type, setType] = useState<SafePlaceType>("police");
    const [address, setAddress] = useState("");
    const [phone, setPhone] = useState("");
    const [is24Hours, setIs24Hours] = useState(true);
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsub = subscribeAdminSafePlaces(setPlaces);
        return () => unsub();
    }, []);

    const handleMapClick = (latlng: { lat: number; lng: number }) => {
        if (isAdding) {
            setSelectedLocation(latlng);
        }
    };

    const handleSave = async () => {
        if (!user || !selectedLocation || !name) {
            setError("Please select a location and enter a name.");
            return;
        }

        setSaving(true);
        setError(null);
        try {
            await addAdminSafePlace({
                name,
                type,
                lat: selectedLocation.lat,
                lng: selectedLocation.lng,
                address: address || undefined,
                phone: phone || undefined,
                is24Hours,
                description: description || undefined,
                createdBy: user.uid,
            });
            // Reset
            setSelectedLocation(null);
            setIsAdding(false);
            setName("");
            setType("police");
            setAddress("");
            setPhone("");
            setIs24Hours(true);
            setDescription("");
        } catch (err) {
            console.error(err);
            setError("Failed to save safe place.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this safe place?")) {
            try {
                await deleteAdminSafePlace(id);
            } catch (err) {
                console.error(err);
                alert("Failed to delete safe place.");
            }
        }
    };

    const groupedPlaces = PLACE_TYPES.reduce((acc, pt) => {
        acc[pt.value] = places.filter(p => p.type === pt.value);
        return acc;
    }, {} as Record<SafePlaceType, AdminSafePlace[]>);

    return (
        <div style={theme.layout.pageContainer}>
            {/* Header */}
            <div style={{
                background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                padding: "2rem",
                marginBottom: "1.5rem",
                borderRadius: theme.rounded.xl,
                color: "white",
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h1 style={{ fontSize: theme.typography.sizes["2xl"], fontWeight: 800, margin: 0 }}>
                            🏥 Safe Places Manager
                        </h1>
                        <p style={{ color: "rgba(255,255,255,0.7)", margin: "0.5rem 0 0 0" }}>
                            Add police stations, hospitals, and other emergency locations
                        </p>
                    </div>
                    <div style={{
                        backgroundColor: "rgba(255,255,255,0.1)",
                        padding: "0.75rem 1rem",
                        borderRadius: theme.rounded.lg,
                    }}>
                        <span style={{ fontSize: theme.typography.sizes.lg, fontWeight: 700 }}>{places.length}</span>
                        <span style={{ fontSize: theme.typography.sizes.sm, marginLeft: "0.5rem" }}>Safe Places</span>
                    </div>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "1.5rem", minHeight: "600px" }}>
                {/* Sidebar */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {/* Add Form */}
                    <div style={{ ...theme.card, padding: "1.5rem" }}>
                        <h3 style={{ fontSize: theme.typography.sizes.lg, fontWeight: 700, margin: "0 0 1rem 0" }}>
                            {isAdding ? "📍 Adding Place..." : "➕ Add Safe Place"}
                        </h3>

                        {!isAdding ? (
                            <button
                                onClick={() => setIsAdding(true)}
                                style={{
                                    ...theme.button.base,
                                    ...theme.button.primary,
                                    width: "100%",
                                    padding: "1rem",
                                    backgroundColor: "#059669",
                                }}
                            >
                                🗺️ Click to Add New Location
                            </button>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                <div style={{
                                    backgroundColor: selectedLocation ? "#d1fae5" : "#fef3c7",
                                    padding: "0.75rem",
                                    borderRadius: theme.rounded.md,
                                    fontSize: theme.typography.sizes.sm,
                                }}>
                                    {selectedLocation
                                        ? `📍 Location: ${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`
                                        : "👆 Click on the map to select location"
                                    }
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: theme.typography.sizes.xs, fontWeight: 600, marginBottom: "0.25rem" }}>Name *</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Central Police Station"
                                        style={{ ...theme.input, width: "100%" }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: theme.typography.sizes.xs, fontWeight: 600, marginBottom: "0.25rem" }}>Type</label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value as SafePlaceType)}
                                        style={{ ...theme.input, width: "100%" }}
                                    >
                                        {PLACE_TYPES.map(pt => (
                                            <option key={pt.value} value={pt.value}>{pt.icon} {pt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: theme.typography.sizes.xs, fontWeight: 600, marginBottom: "0.25rem" }}>Address</label>
                                    <input
                                        type="text"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="Street address"
                                        style={{ ...theme.input, width: "100%" }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: theme.typography.sizes.xs, fontWeight: 600, marginBottom: "0.25rem" }}>Phone</label>
                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+94 11 2345678"
                                        style={{ ...theme.input, width: "100%" }}
                                    />
                                </div>

                                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                                    <input
                                        type="checkbox"
                                        checked={is24Hours}
                                        onChange={(e) => setIs24Hours(e.target.checked)}
                                    />
                                    <span style={{ fontSize: theme.typography.sizes.sm }}>Open 24 Hours</span>
                                </label>

                                <div>
                                    <label style={{ display: "block", fontSize: theme.typography.sizes.xs, fontWeight: 600, marginBottom: "0.25rem" }}>Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Additional details..."
                                        style={{ ...theme.input, width: "100%", minHeight: "60px", resize: "vertical" }}
                                    />
                                </div>

                                {error && <div style={{ color: theme.colors.status.danger, fontSize: theme.typography.sizes.sm }}>{error}</div>}

                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving || !selectedLocation}
                                        style={{
                                            ...theme.button.base,
                                            ...theme.button.success,
                                            flex: 1,
                                            opacity: saving || !selectedLocation ? 0.5 : 1,
                                        }}
                                    >
                                        {saving ? "Saving..." : "✓ Save Place"}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsAdding(false);
                                            setSelectedLocation(null);
                                        }}
                                        style={{
                                            ...theme.button.base,
                                            ...theme.button.ghost,
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Places List */}
                    <div style={{ ...theme.card, padding: "1rem", flex: 1, overflowY: "auto", maxHeight: "350px" }}>
                        <h3 style={{ fontSize: theme.typography.sizes.sm, fontWeight: 700, margin: "0 0 0.75rem 0" }}>
                            📋 All Safe Places ({places.length})
                        </h3>

                        {PLACE_TYPES.map(pt => {
                            const typePlaces = groupedPlaces[pt.value] || [];
                            if (typePlaces.length === 0) return null;
                            return (
                                <div key={pt.value} style={{ marginBottom: "1rem" }}>
                                    <div style={{
                                        fontSize: theme.typography.sizes.xs,
                                        fontWeight: 700,
                                        color: theme.colors.text.muted,
                                        marginBottom: "0.5rem"
                                    }}>
                                        {pt.icon} {pt.label} ({typePlaces.length})
                                    </div>
                                    {typePlaces.map(place => (
                                        <div
                                            key={place.id}
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "0.5rem",
                                                backgroundColor: "#f9fafb",
                                                borderRadius: theme.rounded.md,
                                                marginBottom: "0.5rem",
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: theme.typography.sizes.sm }}>{place.name}</div>
                                                {place.address && (
                                                    <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.muted }}>
                                                        {place.address}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleDelete(place.id)}
                                                style={{
                                                    ...theme.button.base,
                                                    padding: "0.25rem 0.5rem",
                                                    fontSize: theme.typography.sizes.xs,
                                                    color: theme.colors.status.danger,
                                                    backgroundColor: "transparent",
                                                }}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}

                        {places.length === 0 && (
                            <div style={{ textAlign: "center", padding: "2rem", color: theme.colors.text.muted }}>
                                No safe places yet. Click "Add New Location" to start.
                            </div>
                        )}
                    </div>
                </div>

                {/* Map */}
                <div style={{ ...theme.card, padding: 0, overflow: "hidden" }}>
                    <MapContainer
                        center={COLOMBO_CENTER}
                        zoom={13}
                        style={{ height: "100%", width: "100%", minHeight: "600px" }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {isAdding && <MapClickHandler onMapClick={handleMapClick} />}

                        {/* Selected location marker */}
                        {selectedLocation && (
                            <Marker
                                position={[selectedLocation.lat, selectedLocation.lng]}
                                icon={createPlaceIcon(type)}
                            />
                        )}

                        {/* Existing places */}
                        {places.map(place => (
                            <Marker
                                key={place.id}
                                position={[place.lat, place.lng]}
                                icon={createPlaceIcon(place.type)}
                            >
                                <Popup>
                                    <strong>{SAFE_PLACE_TYPES[place.type]?.icon} {place.name}</strong><br />
                                    <span style={{ fontSize: "12px", color: "#666" }}>{SAFE_PLACE_TYPES[place.type]?.label}</span>
                                    {place.address && <><br /><span style={{ fontSize: "12px" }}>📍 {place.address}</span></>}
                                    {place.phone && <><br /><span style={{ fontSize: "12px" }}>📞 {place.phone}</span></>}
                                    {place.is24Hours && <><br /><span style={{ fontSize: "12px", color: "#059669" }}>✓ Open 24 Hours</span></>}
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            </div>
        </div>
    );
}
