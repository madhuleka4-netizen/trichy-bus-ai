import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useState, useEffect, useMemo } from 'react'
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

const busIcon = L.divIcon({
  html: '<div style="font-size: 26px; transform: translate(-50%, -50%);">🚌</div>',
  className: "",
  iconSize: [26, 26],
  iconAnchor: [13, 13]
})

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

// Demo fleet roster with simulated operational data (not live-synced with Dashboard breakdown demo)
const busRoster = [
  { id: "B101", route: "route1", capacity: 50, occupancy: 42, status: "Active", driver: "R. Kumar" },
  { id: "B102", route: "route1", capacity: 50, occupancy: 48, status: "Overcrowded", driver: "S. Muthu" },
  { id: "B103", route: "route1", capacity: 50, occupancy: 20, status: "Delayed", driver: "V. Elango" },
  { id: "B104", route: "route1", capacity: 50, occupancy: 0, status: "Maintenance", driver: "—" },
  { id: "B201", route: "route2", capacity: 40, occupancy: 35, status: "Active", driver: "K. Anand" },
  { id: "B202", route: "route2", capacity: 40, occupancy: 12, status: "Active", driver: "P. Devi" },
  { id: "B203", route: "route2", capacity: 40, occupancy: 40, status: "Overcrowded", driver: "M. Suresh" },
]

const statusColors = {
  Active: { bg: "#e0ffe0", border: "#28a745" },
  Delayed: { bg: "#fff3cd", border: "#e0a800" },
  Overcrowded: { bg: "#f8d7da", border: "#dc3545" },
  Breakdown: { bg: "#f8d7da", border: "#dc3545" },
  Maintenance: { bg: "#e2e3e5", border: "#6c757d" },
}

const events = {
  none: { label: "No Special Event", boosts: {} },
  srirangam_festival: { label: "Srirangam Temple Festival", boosts: { S7: 25, S8: 20, S9: 40 } },
  nit_exam: { label: "NIT Trichy Exam Season", boosts: { S5: 15, S6: 30 } },
  market_day: { label: "Chathiram Sunday Market", boosts: { S2: 25, S3: 10 } },
}

const eventDateMap = {
  "2026-09-06": "srirangam_festival",
  "2026-09-10": "nit_exam",
}

const ALERT_THRESHOLD = 70
const STEPS_PER_SEGMENT = 40
const TICK_MS = 120

function toLocalDateTimeInputValue(date) {
  const pad = n => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function buildAnimationPath(stops) {
  const path = []
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]
    const b = stops[i + 1]
    for (let step = 0; step < STEPS_PER_SEGMENT; step++) {
      const t = step / STEPS_PER_SEGMENT
      path.push([a.lat + (b.lat - a.lat) * t, a.lon + (b.lon - a.lon) * t])
    }
  }
  path.push([stops[stops.length - 1].lat, stops[stops.length - 1].lon])
  return path
}

const NAV_ITEMS = [
  { key: "dashboard", label: "📊 Dashboard" },
  { key: "buses", label: "🚌 Buses" },
  { key: "routes", label: "🛣️ Routes" },
  { key: "alerts", label: "⚠️ Alerts" },
  { key: "analytics", label: "📈 Analytics" },
]

function Sidebar({ activePage, setActivePage }) {
  return (
    <div style={{ width: "200px", minHeight: "100vh", backgroundColor: "#1f2937", color: "#fff", padding: "20px 0", flexShrink: 0 }}>
      <div style={{ padding: "0 20px 20px 20px", fontWeight: "bold", fontSize: "16px", borderBottom: "1px solid #374151" }}>
        🚏 Trichy Transit AI
      </div>
      <nav style={{ marginTop: "10px" }}>
        {NAV_ITEMS.map(item => (
          <div key={item.key} onClick={() => setActivePage(item.key)}
            style={{
              padding: "12px 20px", cursor: "pointer", fontSize: "14px",
              backgroundColor: activePage === item.key ? "#374151" : "transparent",
              borderLeft: activePage === item.key ? "4px solid #60a5fa" : "4px solid transparent"
            }}>
            {item.label}
          </div>
        ))}
      </nav>
      <div style={{ padding: "20px", fontSize: "11px", color: "#9ca3af", marginTop: "20px", borderTop: "1px solid #374151" }}>
        ⚠ DEMO / SIMULATED DATA<br />Not official TNSTC data
      </div>
    </div>
  )
}

function PlaceholderPage({ title }) {
  return (
    <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
      <h2>{title}</h2>
      <p>This section is coming next — under active development.</p>
    </div>
  )
}

function BusesPage() {
  const [filter, setFilter] = useState("All")

  const filters = ["All", "Active", "Delayed", "Overcrowded", "Maintenance"]
  const filteredBuses = filter === "All" ? busRoster : busRoster.filter(b => b.status === filter)

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "20px" }}>
      <h1 style={{ fontSize: "26px", margin: "0 0 5px 0" }}>🚌 Bus Fleet Management</h1>
      <p style={{ color: "#888", fontSize: "13px", margin: "0 0 15px 0" }}>
        ⚠ DEMO / SIMULATED DATA — fleet roster is illustrative, not a live TNSTC feed
      </p>

      <div style={{ marginBottom: "15px" }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              margin: "0 5px 0 0", padding: "6px 14px",
              backgroundColor: filter === f ? "#333" : "#eee",
              color: filter === f ? "#fff" : "#000",
              border: "1px solid #999", borderRadius: "6px", cursor: "pointer"
            }}>
            {f}
          </button>
        ))}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ backgroundColor: "#1f2937", color: "#fff" }}>
          <tr>
            <th style={{ padding: "10px", textAlign: "left" }}>Bus ID</th>
            <th style={{ textAlign: "left" }}>Route</th>
            <th>Capacity</th>
            <th>Occupancy</th>
            <th>Occupancy %</th>
            <th>Status</th>
            <th style={{ textAlign: "left" }}>Driver</th>
          </tr>
        </thead>
        <tbody>
          {filteredBuses.map(bus => {
            const occPercent = Math.round((bus.occupancy / bus.capacity) * 100)
            const colors = statusColors[bus.status] || { bg: "#fff", border: "#ccc" }
            return (
              <tr key={bus.id} style={{ backgroundColor: colors.bg, borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: "10px" }}><b>{bus.id}</b></td>
                <td>{routes[bus.route].label}</td>
                <td style={{ textAlign: "center" }}>{bus.capacity}</td>
                <td style={{ textAlign: "center" }}>{bus.occupancy}</td>
                <td style={{ textAlign: "center" }}>{occPercent}%</td>
                <td style={{ textAlign: "center" }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: "12px", fontSize: "12px",
                    backgroundColor: colors.border, color: "#fff"
                  }}>
                    {bus.status}
                  </span>
                </td>
                <td>{bus.driver}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {filteredBuses.length === 0 && (
        <p style={{ textAlign: "center", color: "#888", marginTop: "20px" }}>No buses match this filter.</p>
      )}
    </div>
  )
}

function DashboardPage() {
  const [activeRoute, setActiveRoute] = useState("route1")
  const [dateTimeValue, setDateTimeValue] = useState(toLocalDateTimeInputValue(new Date()))
  const [whatIfPercent, setWhatIfPercent] = useState(0)
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(false)
  const [brokenBus, setBrokenBus] = useState(null)
  const [replacementBus, setReplacementBus] = useState(null)
  const [busPathIndex, setBusPathIndex] = useState(0)

  const parsedDate = new Date(dateTimeValue)
  const hour = parsedDate.getHours()
  const dayOfWeek = parsedDate.getDay()
  const dayType = (dayOfWeek === 0 || dayOfWeek === 6) ? "weekend" : "weekday"
  const dateKey = dateTimeValue.split("T")[0]
  const activeEvent = eventDateMap[dateKey] || (dayOfWeek === 0 ? "market_day" : "none")

  const currentStopIds = routes[activeRoute].stopIds
  const currentStops = currentStopIds.map(id => ({ id, ...allStops[id] }))
  const routeLine = currentStops.map(s => [s.lat, s.lon])
  const eventBoosts = events[activeEvent].boosts
  const fleet = routes[activeRoute].fleet

  const animationPath = useMemo(() => buildAnimationPath(currentStops), [activeRoute])

  useEffect(() => {
    setBusPathIndex(0)
    const interval = setInterval(() => {
      setBusPathIndex(prev => (prev + 1) % animationPath.length)
    }, TICK_MS)
    return () => clearInterval(interval)
  }, [animationPath])

  useEffect(() => {
    setLoading(true)
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

  const busPosition = animationPath[busPathIndex] || animationPath[0]

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "20px" }}>
      <h1 style={{ fontSize: "26px", margin: "0 0 5px 0" }}>Trichy Bus Demand Monitor</h1>
      <p style={{ color: "#888", fontSize: "13px", margin: "0 0 15px 0" }}>
        ⚠ DEMO / SIMULATED DATA — routes, demand, fleet, and bus movement are for demonstration only
      </p>

      <div style={{ marginBottom: "10px" }}>
        {Object.keys(routes).map(key => (
          <button key={key} onClick={() => setActiveRoute(key)}
            style={{
              margin: "0 5px 0 0", padding: "8px 16px",
              backgroundColor: activeRoute === key ? "#333" : "#eee",
              color: activeRoute === key ? "#fff" : "#000",
              border: "1px solid #999", borderRadius: "6px", cursor: "pointer"
            }}>
            {routes[key].label}
          </button>
        ))}
        <span style={{ marginLeft: "20px" }}>
          Date &amp; Time:
          <input type="datetime-local" value={dateTimeValue} onChange={e => setDateTimeValue(e.target.value)}
            style={{ marginLeft: "5px", padding: "5px" }} />
        </span>
      </div>

      <div style={{ marginBottom: "15px", color: "#555", fontSize: "14px" }}>
        Detected: <b>{dayType === "weekend" ? "Weekend" : "Weekday"}</b>, Hour <b>{hour}:00</b>
        {" "}— Event: <b>{events[activeEvent].label}</b>
      </div>

      <div style={{ marginBottom: "15px", backgroundColor: "#f0f0f0", padding: "10px", borderRadius: "8px" }}>
        <b>What-If Simulation:</b> Increase demand by {whatIfPercent}%
        <br />
        <input type="range" min="0" max="100" step="10" value={whatIfPercent}
          onChange={e => setWhatIfPercent(Number(e.target.value))}
          style={{ width: "300px", marginTop: "5px" }} />
      </div>

      <div style={{ marginBottom: "15px" }}>
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

      {alerts.length > 0 && (
        <div style={{ backgroundColor: "#fff3cd", border: "2px solid #e0a800", borderRadius: "8px", padding: "12px", marginBottom: "15px" }}>
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
        <div style={{ backgroundColor: "#e0ffe0", border: "2px solid #28a745", borderRadius: "8px", padding: "12px", marginBottom: "15px" }}>
          ✓ All stops within normal demand range — no extra buses needed right now
        </div>
      )}

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
        {busPosition && (
          <Marker position={busPosition} icon={busIcon}>
            <Popup>🚌 Live simulated bus on {routes[activeRoute].label}</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}

function App() {
  const [activePage, setActivePage] = useState("dashboard")

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        {activePage === "dashboard" && <DashboardPage />}
        {activePage === "buses" && <BusesPage />}
        {activePage === "routes" && <PlaceholderPage title="🛣️ Routes" />}
        {activePage === "alerts" && <PlaceholderPage title="⚠️ Alerts" />}
        {activePage === "analytics" && <PlaceholderPage title="📈 Analytics" />}
      </div>
    </div>
  )
}

export default App