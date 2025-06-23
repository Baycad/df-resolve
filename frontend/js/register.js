const form = document.getElementById("registerForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const res = await fetch("http://127.0.0.1:5000/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: form.username.value,
      password: form.password.value,
    }),
  });

  const data = await res.json();

  if (res.ok) {
    alert(data.message);
    window.location.href = "login.html";
  } else {
    alert(data.message);
  }
});
