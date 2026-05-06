if (location.pathname.endsWith("login.html")) {
  document.getElementById("loginBtn").addEventListener("click", () => {
    const u = document.getElementById("username").value.trim();
    const p = document.getElementById("password").value.trim();
    if (u === "admin" && p === "admin123") {
      localStorage.setItem("railway_logged_in", "1");
      location.href = "./index.html";
    } else {
      alert("Invalid credentials");
    }
  });
}
