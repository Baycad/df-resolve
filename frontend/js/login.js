const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const res = await fetch("http://127.0.0.1:5000/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: form.username.value,
      password: form.password.value,
    }),
  });

  const data = await res.json();

  if (res.ok) {
    alert(data.message);
    window.location.href = "denuncia.html";
  } else {
    alert(data.message);
  }
});
