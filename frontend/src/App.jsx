import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useState, useEffect } from 'react'
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

const allStops = {
  S1: { name: "Central Bus Stand", lat: 10.7986, lon: 78.6804 },
  S2: { name: "Chathiram Bus Stand", lat: 10.8330, lon: 78.6925 },
  S3: { name: "Thillai Nagar", lat: 10.8227, lon: 78.6834 },
  S4: { name: "Cantonment", lat: 10.8013, lon: 78.6810 },
  S5: { name: "BHEL Township", lat: 10.7789, lon: 78.7844 },
  S6: { name: "NIT Trichy", lat: 10.7589, lon: 78.8132 },
  S7: { name: "Trichy Junction Railway Station", lat: 10.7944, lon: 78.6856 },
  S8: { name: "Bishop Heber College", lat: 10.8147, lon: 78.6731 },
  S9: { name: "Srirangam", lat: 10.8503, lon: 78.6998 },
}

const routes = {
  route1: {
    label: "Central Bus Stand → NIT Trichy",
    stopIds: ["S1", "S2", "S3", "S4", "S5", "S6"],
    color: "blue"
  },
  route2: {
    label: "Central Bus Stand → Srirangam",
    stopIds: ["S1", "S7", "S8", "S9"],
    color: "red"
  }
}

function App() {
  const [activeRoute, setActiveRoute] = useState("route1")
  const [demandData, setDemandData] = useState({})

  const currentStopIds = routes[activeRoute].stopIds
  const currentStops = currentStopIds.map(id => ({ id, ...allStops[id] }))
  const routeLine = currentStops.map(s => [s.lat, s.lon])

  useEffect(() => {
    currentStopIds.forEach(id => {
      fetch(`http://127.0.0.1:5000/demand?stop=${id}&hour=8&day_type=weekday`)
        .then(res => res.json())
        .then(data => {
          setDemandData(prev => ({ ...prev, [id]: data.predicted_demand }))
        })
        .catch(() => {})
    })
  }, [activeRoute])

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <h2 style={{ textAlign: "center", margin: "10px" }}>
        Trichy Bus Route: {routes[activeRoute].label}
      </h2>
      <div style={{ textAlign: "center", marginBottom: "10px" }}>
        {Object.keys(routes).map(key => (
          <button
            key={key}
            onClick={() => setActiveRoute(key)}
            style={{
              margin: "0 5px",
              padding: "8px 16px",
              backgroundColor: activeRoute === key ? "#333" : "#eee",
              color: activeRoute === key ? "#fff" : "#000",
              border: "1px solid #999",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            {routes[key].label}
          </button>
        ))}
      </div>
      <MapContainer center={[10.80, 78.74]} zoom={11} style={{ height: "80vh", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <Polyline positions={routeLine} color={routes[activeRoute].color} />
        {currentStops.map(stop => (
          <Marker key={stop.id} position={[stop.lat, stop.lon]}>
            <Popup>
              <b>{stop.name}</b><br />
              Predicted demand (8am weekday): {demandData[stop.id] ?? "loading..."}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

export default App