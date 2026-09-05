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

const stops = [
  { id: "S1", name: "Central Bus Stand", lat: 10.7986, lon: 78.6804 },
  { id: "S2", name: "Chathiram Bus Stand", lat: 10.8330, lon: 78.6925 },
  { id: "S3", name: "Thillai Nagar", lat: 10.8227, lon: 78.6834 },
  { id: "S4", name: "Cantonment", lat: 10.8013, lon: 78.6810 },
  { id: "S5", name: "BHEL Township", lat: 10.7789, lon: 78.7844 },
  { id: "S6", name: "NIT Trichy", lat: 10.7589, lon: 78.8132 },
]

function App() {
  const [demandData, setDemandData] = useState({})

  useEffect(() => {
    stops.forEach(stop => {
      fetch(`http://127.0.0.1:5000/demand?stop=${stop.id}&hour=8&day_type=weekday`)
        .then(res => res.json())
        .then(data => {
          setDemandData(prev => ({ ...prev, [stop.id]: data.predicted_demand }))
        })
    })
  }, [])

  const routeLine = stops.map(s => [s.lat, s.lon])

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <h2 style={{ textAlign: "center", margin: "10px" }}>
        Trichy Bus Route: Central Bus Stand → NIT Trichy
      </h2>
      <MapContainer center={[10.80, 78.74]} zoom={11} style={{ height: "85vh", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <Polyline positions={routeLine} color="blue" />
        {stops.map(stop => (
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