async function getDB() {
  const r = await fetch("/api/db");
  return r.json();
}

const rs = (v) => `Rs ${Number(v || 0).toLocaleString("en-IN")}`;

async function bootSearchPage() {
  const table = document.getElementById("result-table");
  if (!table) return;
  const db = await getDB();
  const render = (rows) => {
    table.innerHTML = rows.map((b) => `<tr><td>${b.pnr}</td><td>${b.name}</td><td>${b.email}</td><td>${b.trainName}</td><td>${b.seatNumber || 'TBD'}</td><td>${b.status}</td></tr>`).join("");
  };
  render(db.bookings);
  document.getElementById("searchBtn").onclick = () => {
    const q = document.getElementById("q").value.trim().toLowerCase();
    render(db.bookings.filter((b) => b.pnr.toLowerCase().includes(q) || b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q)));
  };
}

async function bootReportsPage() {
  const summary = document.getElementById("report-summary");
  if (!summary) return;
  const db = await getDB();
  const confirmed = db.bookings.filter((b) => b.status === "Confirmed");
  const canceled = db.bookings.filter((b) => b.status === "Cancelled");
  const revenue = confirmed.reduce((s, b) => s + b.fare, 0);
  summary.innerHTML = `<p>Total Revenue: <b>${rs(revenue)}</b></p><p>Confirmed: <b>${confirmed.length}</b> | Cancelled: <b>${canceled.length}</b> | Passengers: <b>${db.passengers.length}</b></p>`;
  document.getElementById("report-table").innerHTML = db.bookings.map((b) => `<tr><td>${b.pnr}</td><td>${b.name}</td><td>${b.trainName}</td><td>${rs(b.fare)}</td><td><span class="badge ${b.status==='Confirmed'?'badge-green':'badge-red'}">${b.status}</span></td></tr>`).join("");
  
  const cTable = document.getElementById("cancellation-table");
  if (cTable && db.cancellations) {
    if (!db.cancellations.length) {
      cTable.innerHTML = `<tr><td colspan="6" style="color:var(--rail-muted);text-align:center;padding:2rem">No cancellations yet</td></tr>`;
    } else {
      cTable.innerHTML = db.cancellations.map((c) => `<tr><td>${c.cancellationId}</td><td>${c.pnr}</td><td>${c.name}</td><td>${rs(c.refundAmount)}</td><td>${c.reason}</td><td><span class="badge badge-yellow">${c.status}</span></td></tr>`).join("");
    }
  }
}

bootSearchPage();
bootReportsPage();
