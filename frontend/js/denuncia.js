const form = document.getElementById("denunciaForm");
const lista = document.getElementById("listaDenuncias");
const logoutBtn = document.getElementById("logoutBtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const res = await fetch("http://127.0.0.1:5000/denuncias/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      titulo: form.titulo.value,
      endereco: form.endereco.value,
      descricao: form.descricao.value,
    }),
  });

  const data = await res.json();

  if (res.ok) {
    alert(data.message);
    form.reset();
    carregarDenuncias();
  } else {
    alert(data.message);
  }
});

logoutBtn.addEventListener("click", async () => {
  await fetch("http://127.0.0.1:5000/auth/logout", {
    method: "POST",
    credentials: "include",
  });
  window.location.href = "login.html";
});

async function carregarDenuncias() {
  const res = await fetch("http://127.0.0.1:5000/denuncias/", {
    credentials: "include",
  });

  const denuncias = await res.json();
  lista.innerHTML = "";

  denuncias.forEach((d) => {
    const li = document.createElement("li");
    li.className = "list-group-item";
    li.innerText = `${d.titulo} - ${d.endereco} - ${d.status}`;
    lista.appendChild(li);
  });
}

carregarDenuncias();
