async function getDB() {
  const r = await fetch("/api/db");
  return r.json();
}

const rs = (v) => `Rs ${Number(v || 0).toLocaleString("en-IN")}`;

function byId(id) { return document.getElementById(id); }

async function bootTrainPage() {
  if (!byId("add-train-btn")) return;
  byId("add-train-btn").onclick = async () => {
    const payload = {
      num: byId("t-num").value.trim(),
      name: byId("t-name").value.trim(),
      src: byId("t-src").value.trim(),
      dst: byId("t-dst").value.trim(),
      seats: Number(byId("t-seats").value),
      available: Number(byId("t-seats").value),
      type: byId("t-type").value,
      status: byId("t-status").value,
      fares: { SL: Number(byId("t-sl").value), "3A": Number(byId("t-3a").value), "2A": Number(byId("t-2a").value), "1A": Number(byId("t-1a").value), GN: Number(byId("t-gn").value) }
    };
    const r = await fetch("/api/train", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) {
      const out = await r.json();
      return alert(out.message || "Failed to add train");
    }
    location.reload();
  };
  const db = await getDB();
  byId("train-table").innerHTML = db.trains.map((t) => `<tr><td>${t.num}</td><td>${t.name}</td><td>${t.src}</td><td>${t.dst}</td><td>${t.seats}</td><td>${t.available}</td><td><button style="background:var(--rail-red, red);color:white;padding:4px 8px" onclick="deleteTrain('${t.num}')">Remove</button></td></tr>`).join("");
}

async function bootStationPage() {
  if (!byId("add-station-btn")) return;
  byId("add-station-btn").onclick = async () => {
    const payload = { code: byId("st-code").value.trim().toUpperCase(), name: byId("st-name").value.trim(), city: byId("st-city").value.trim(), state: byId("st-state").value.trim(), platforms: Number(byId("st-plat").value), zone: byId("st-zone").value };
    const r = await fetch("/api/station", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) {
      const out = await r.json();
      return alert(out.message || "Failed to add station");
    }
    location.reload();
  };
  const db = await getDB();
  byId("station-table").innerHTML = db.stations.map((s) => `<tr><td>${s.code}</td><td>${s.name}</td><td>${s.city}</td><td>${s.state}</td><td>${s.platforms}</td><td><button style="background:var(--rail-red, red);color:white;padding:4px 8px" onclick="deleteStation('${s.code}')">Remove</button></td></tr>`).join("");
}

async function bootBookingPage() {
  if (!byId("book-btn")) return;
  const db = await getDB();
  byId("b-train").innerHTML = '<option value="">-- Select Train --</option>' + db.trains.map((t) => `<option value="${t.num}">${t.num} - ${t.name}</option>`).join("");
  byId("book-btn").onclick = async () => {
    const payload = { name: byId("b-name").value.trim(), email: byId("b-email").value.trim(), phone: byId("b-phone").value.trim(), age: Number(byId("b-age").value), trainNum: byId("b-train").value, date: byId("b-date").value, seatClass: byId("b-class").value, qty: Number(byId("b-qty").value) };
    const r = await fetch("/api/booking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const out = await r.json();
    if (!r.ok) return alert(out.message || "Booking failed");
    alert(`Booked ${out.pnr} | ${rs(out.fare)}`);
    location.reload();
  };
  byId("booking-table").innerHTML = db.bookings.map((b) => `<tr><td>${b.pnr}</td><td>${b.name}</td><td>${b.trainName}</td><td>${b.seatClass}</td><td>${b.seatNumber || 'TBD'}</td><td>${b.qty}</td><td>${rs(b.fare)}</td><td>${b.status}</td><td>${b.status === "Confirmed" ? `<button onclick="cancelBooking('${b.pnr}')">Cancel</button>` : "-"}</td></tr>`).join("");
  byId("b-search").oninput = () => {
    const q = byId("b-search").value.toLowerCase();
    byId("booking-table").innerHTML = db.bookings.filter((b) => b.pnr.toLowerCase().includes(q) || b.name.toLowerCase().includes(q)).map((b) => `<tr><td>${b.pnr}</td><td>${b.name}</td><td>${b.trainName}</td><td>${b.seatClass}</td><td>${b.seatNumber || 'TBD'}</td><td>${b.qty}</td><td>${rs(b.fare)}</td><td>${b.status}</td><td>${b.status === "Confirmed" ? `<button onclick="cancelBooking('${b.pnr}')">Cancel</button>` : "-"}</td></tr>`).join("");
  };
}

async function bootSchedulePage() {
  if (!byId("add-schedule-btn")) return;
  const db = await getDB();
  byId("sc-train").innerHTML = '<option value="">-- Select Train --</option>' + db.trains.map((t) => `<option value="${t.num}">${t.num} - ${t.name}</option>`).join("");
  byId("sc-station").innerHTML = '<option value="">-- Select Station --</option>' + db.stations.map((s) => `<option value="${s.code}">${s.code} - ${s.name}</option>`).join("");
  byId("add-schedule-btn").onclick = async () => {
    const selectedTrain = db.trains.find((t) => t.num === byId("sc-train").value);
    const selectedStation = db.stations.find((s) => s.code === byId("sc-station").value);
    const payload = { trainNum: byId("sc-train").value, stationCode: byId("sc-station").value, arr: byId("sc-arr").value, dep: byId("sc-dep").value, stop: Number(byId("sc-stop").value), day: byId("sc-day").value, trainName: selectedTrain ? selectedTrain.name : "", stationName: selectedStation ? selectedStation.name : "" };
    const r = await fetch("/api/schedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) {
      const out = await r.json();
      return alert(out.message || "Failed to add schedule");
    }
    location.reload();
  };
  byId("schedule-view").innerHTML = db.schedules.map((s) => `<div>${s.trainNum} | ${s.stationCode} | ${s.arr}-${s.dep} | Stop ${s.stop} | ${s.day} <button style="background:var(--rail-red, red);color:white;padding:2px 5px;margin-left:8px" onclick="deleteSchedule(${s.id})">x</button></div>`).join("");
}

async function cancelBooking(pnr) {
  const reason = prompt("Please enter a reason for cancellation:");
  if (reason === null) return;
  await fetch(`/api/cancel/${pnr}`, { 
    method: "POST", 
    headers: { "Content-Type": "application/json" }, 
    body: JSON.stringify({ reason }) 
  });
  location.reload();
}
window.cancelBooking = cancelBooking;

window.deleteTrain = async function(num) {
  if(!confirm(`Delete train ${num}?`)) return;
  const r = await fetch(`/api/train/${num}`, {method: "DELETE"});
  if(!r.ok) { const out = await r.json(); alert(out.message || "Failed"); return; }
  location.reload();
};

window.deleteStation = async function(code) {
  if(!confirm(`Delete station ${code}?`)) return;
  const r = await fetch(`/api/station/${code}`, {method: "DELETE"});
  if(!r.ok) { const out = await r.json(); alert(out.message || "Failed"); return; }
  location.reload();
};

window.deleteSchedule = async function(id) {
  if(!confirm(`Delete schedule stop?`)) return;
  const r = await fetch(`/api/schedule/${id}`, {method: "DELETE"});
  if(!r.ok) { const out = await r.json(); alert(out.message || "Failed"); return; }
  location.reload();
};

bootTrainPage();
bootStationPage();
bootBookingPage();
bootSchedulePage();
