import React from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

// react-leaflet ne trouve pas automatiquement les icônes par défaut une fois
// packagées par Vite — on les redéclare explicitement, sinon les marqueurs
// n'apparaissent pas du tout.
const iconParDefaut = new L.Icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Carte du Module 10 (Suivi GPS). Utilise OpenStreetMap (gratuit, sans clé
// API) — contrairement à Google Maps, pas besoin de compte développeur ni de
// facturation pour l'afficher.
const CarteSuiviGPS = ({ positionActuelle, itineraire, adresseDepart, adresseArrivee, arrets }) => {
  const points = (itineraire || []).map((p) => [p.lat, p.lng]);
  const centre = positionActuelle
    ? [positionActuelle.lat, positionActuelle.lng]
    : adresseDepart?.lat
    ? [adresseDepart.lat, adresseDepart.lng]
    : [12.6392, -8.0029]; // Bamako par défaut si aucune coordonnée connue

  return (
    <MapContainer center={centre} zoom={12} style={{ height: 320, width: "100%", borderRadius: 8 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {adresseDepart?.lat && adresseDepart?.lng && (
        <Marker position={[adresseDepart.lat, adresseDepart.lng]} icon={iconParDefaut}>
          <Popup>Départ : {adresseDepart.label}</Popup>
        </Marker>
      )}

      {adresseArrivee?.lat && adresseArrivee?.lng && (
        <Marker position={[adresseArrivee.lat, adresseArrivee.lng]} icon={iconParDefaut}>
          <Popup>Arrivée : {adresseArrivee.label}</Popup>
        </Marker>
      )}

      {points.length > 1 && <Polyline positions={points} color="#f4661b" />}

      {positionActuelle && (
        <Marker position={[positionActuelle.lat, positionActuelle.lng]} icon={iconParDefaut}>
          <Popup>Position actuelle du transporteur</Popup>
        </Marker>
      )}

      {(arrets || []).map((a, i) => (
        <Marker key={i} position={[a.lat, a.lng]} icon={iconParDefaut}>
          <Popup>Arrêt de {a.dureeMinutes} min</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default CarteSuiviGPS;
