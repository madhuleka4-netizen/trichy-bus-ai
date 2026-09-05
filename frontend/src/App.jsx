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
    label: "Central Bus Stand → NIT Trichy", stopIds: ["S1", "S2", "S3", "S4", "S5", "S6"], color: "blue",
    fleet: ["B101", "B102", "B103", "B104"]
  },
  route2: {
    label: "Central Bus Stand → Srirangam", stopIds: ["S1", "S7", "S8", "S9"], color: "red",
    fleet: ["B201", "B202", "B203"]
  }
}

const events = {
  none: { label: "No Special Event", boosts: {} },
  srirangam_festival: { label: "Srirangam Temple Festival", boosts: { S7: 25, S8: 20, S9: 40 } },
  nit_exam: { label: "NIT Trichy Exam Season", boosts: { S5: 15, S6: 30 } },
  market_day: { label: "Chathiram Sunday Market", boosts: { S2: 25, S3: 10 } },
}

// Demo hardcoded event dates (YYYY-MM-DD) so entering these dates auto-triggers an event.
// Change these to any dates you want to demo tomorrow.
const eventDateMap = {
  "2026-09-06": "srirangam_festival",
  "2026-09-10": "nit_exam",
}

const ALERT_THRESHOLD = 70

function toLocalDateTimeInputValue(date) {
  const pad = n => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function App() {
  const [activeRoute, setActiveRoute] = useState("route1")
  const [dateTimeValue, setDateTimeValue] = useState(toLocalDateTimeInputValue(new Date()))
  const [whatIfPercent, setWhatIfPercent] = useState(0)
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(false)
  const [brokenBus, setBrokenBus] = useState(null)
  const [replacementBus, setReplacementBus] = useState(null)

  const parsedDate = new Date(dateTimeValue)
  const hour = parsedDate.getHours()
  const dayOfWeek = parsedDate.getDay() // 0 = Sunday, 6 = Saturday
  const dayType = (dayOfWeek === 0 || dayOfWeek === 6) ? "weekend" : "weekday"
  const dateKey = dateTimeValue.split("T")[0]
  const activeEvent = eventDateMap[dateKey] || (dayOfWeek === 0 ? "market_day" : "none")

  const currentStopIds = routes[activeRoute].stopIds
  const currentStops = currentStopIds.map(id => ({ id, ...allStops[id] }))
  const routeLine = currentStops.map(s => [s.lat, s.lon])
  const eventBoosts = events[activeEvent].boosts
  const fleet = routes[activeRoute].fleet

  useEffect(() => {
    setLoading(true)
    // Our ML model was trained on hours 6-22; clamp outside that range to nearest bound for the demo
    const safeHour = Math.min(22, Math.max(6, hour))
    fetch(`http://127.0.0.1:5000/schedule?stops=${currentStopIds.join(",")}&hour=${safeHour}&day_type=${dayType}`)
      .then(res => res.json())
      .then(data => {
        const adjusted = data.map(s => {
          const boost = eventBoosts[s.stop_id] || 0
          let newDemand = s.predicted_demand + boost
          newDemand = newDemand * (1 + whatIfPercent / 100)
          newDemand = Math.min(100, Math.max(0, newDemand))
          return { ...s, adjusted_demand: Math.round(newDemand * 10) / 10, boost }
        })
        setSchedule(adjusted)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [activeRoute, dateTimeValue, whatIfPercent])

  useEffect(() => {
    setBrokenBus(null)
    setReplacementBus(null)
  }, [activeRoute])

  const demandFor = (stopId) => {
    const entry = schedule.find(s => s.stop_id === stopId)
    return entry ? entry.adjusted_demand : null
  }

  const alerts = schedule.filter(s => s.adjusted_demand >= ALERT_THRESHOLD)

  const simulateBreakdown = () => {
    const randomIndex = Math.floor(Math.random() * fleet.length)
    const broken = fleet[randomIndex]
    const available = fleet.filter(b => b !== broken)
    const replacement = available[Math.floor(Math.random() * available.length)]
    setBrokenBus(broken)
    setReplacementBus(replacement)
  }

  const resetBreakdown = () => {
    setBrokenBus(null)
    setReplacementBus(null)
  }

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "10px" }}>
      <h1 style={{ textAlign: "center", fontSize: "28px", lineHeight: "1.3", margin: "10px 0 8px 0" }}>Trichy Bus Demand Monitor</h1>
      <p style={{ textAlign: "center", color: "#888", fontSize: "13px", margin: "0 0 15px 0" }}>
        ⚠ DEMO / SIMULATED DATA — routes, demand, and fleet data are for demonstration purposes only, not official TNSTC data
      </p>

      {/* Controls */}
      <div style={{ textAlign: "center", marginBottom: "10px" }}>
        {Object.keys(routes).map(key => (
          <button key={key} onClick={() => setActiveRoute(key)}
            style={{
              margin: "0 5px", padding: "8px 16px",
              backgroundColor: activeRoute === key ? "#333" : "#eee",
              color: activeRoute === key ? "#fff" : "#000",
              border: "1px solid #999", borderRadius: "6px", cursor: "pointer"
            }}>
            {routes[key].label}
          </button>
        ))}

        <span style={{ marginLeft: "20px" }}>
          Date &amp; Time:
          <input
            type="datetime-local"
            value={dateTimeValue}
            onChange={e => setDateTimeValue(e.target.value)}
            style={{ marginLeft: "5px", padding: "5px" }}
          />
        </span>
      </div>

      {/* Auto-detected info */}
      <div style={{ textAlign: "center", marginBottom: "15px", color: "#555", fontSize: "14px" }}>
        Detected: <b>{dayType === "weekend" ? "Weekend" : "Weekday"}</b>, Hour <b>{hour}:00</b>
        {" "}— Event: <b>{events[activeEvent].label}</b>
      </div>

      {/* What-if slider */}
      <div style={{ textAlign: "center", marginBottom: "15px", backgroundColor: "#f0f0f0", padding: "10px", borderRadius: "8px" }}>
        <b>What-If Simulation:</b> Increase demand by {whatIfPercent}%
        <br />
        <input
          type="range" min="0" max="100" step="10"
          value={whatIfPercent}
          onChange={e => setWhatIfPercent(Number(e.target.value))}
          style={{ width: "300px", marginTop: "5px" }}
        />
      </div>

      {/* Breakdown simulation */}
      <div style={{ textAlign: "center", marginBottom: "15px" }}>
        <button onClick={simulateBreakdown} style={{
          padding: "8px 16px", backgroundColor: "#dc3545", color: "#fff",
          border: "none", borderRadius: "6px", cursor: "pointer", marginRight: "8px"
        }}>
          🚨 Simulate Bus Breakdown
        </button>
        {brokenBus && (
          <button onClick={resetBreakdown} style={{
            padding: "8px 16px", backgroundColor: "#6c757d", color: "#fff",
            border: "none", borderRadius: "6px", cursor: "pointer"
          }}>
            Reset
          </button>
        )}
        {brokenBus && (
          <div style={{
            marginTop: "10px", backgroundColor: "#f8d7da", border: "2px solid #dc3545",
            borderRadius: "8px", padding: "10px", display: "inline-block", textAlign: "left"
          }}>
            <b>🔧 Bus {brokenBus} — BREAKDOWN on {routes[activeRoute].label}</b><br />
            Status: removed from service<br />
            Available buses on route: {fleet.filter(b => b !== brokenBus).join(", ")}<br />
            <b>Recommended replacement: {replacementBus}</b> (closest available bus, sufficient capacity)<br />
            Schedule recalculated — replacement bus dispatched to cover gap.
          </div>
        )}
      </div>

      {/* Demand alerts */}
      {alerts.length > 0 && (
        <div style={{
          backgroundColor: "#fff3cd", border: "2px solid #e0a800", borderRadius: "8px",
          padding: "12px", marginBottom: "15px"
        }}>
          <b>⚠ High Demand Alert — Dispatch Additional Buses:</b>
          <ul style={{ margin: "8px 0 0 0" }}>
            {alerts.map(a => (
              <li key={a.stop_id}>
                <b>{allStops[a.stop_id].name}</b> — predicted demand {a.adjusted_demand}
                {a.boost > 0 ? ` (includes +${a.boost} from ${events[activeEvent].label})` : ""}
                → recommend buses every {a.dynamic_frequency_min} min
              </li>
            ))}
          </ul>
        </div>
      )}
      {alerts.length === 0 && !loading && (
        <div style={{
          backgroundColor: "#e0ffe0", border: "2px solid #28a745", borderRadius: "8px",
          padding: "12px", marginBottom: "15px", textAlign: "center"
        }}>
          ✓ All stops within normal demand range — no extra buses needed right now
        </div>
      )}

      {/* Map */}
      <MapContainer center={[10.80, 78.74]} zoom={11} style={{ height: "50vh", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
        <Polyline positions={routeLine} color={routes[activeRoute].color} />
        {currentStops.map(stop => {
          const demand = demandFor(stop.id)
          const isAlert = demand >= ALERT_THRESHOLD
          return (
            <Marker key={stop.id} position={[stop.lat, stop.lon]}>
              <Popup>
                <b>{stop.name}</b><br />
                Predicted demand: {demand ?? "loading..."}<br />
                {isAlert ? "⚠ High demand — extra buses recommended" : "Normal demand"}
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}

export default App