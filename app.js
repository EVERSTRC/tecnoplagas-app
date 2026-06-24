import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, collection, setDoc, onSnapshot, deleteDoc, doc, enableIndexedDbPersistence 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Credenciales de Fumigadora Tecnoplagas
const firebaseConfig = {
  apiKey: "AIzaSyASSZsMJsi1B2fI7bs8TDhlXTCBqHhGC8E",
  authDomain: "fumigadora-tecnoplagas.firebaseapp.com",
  projectId: "fumigadora-tecnoplagas",
  storageBucket: "fumigadora-tecnoplagas.firebasestorage.app",
  messagingSenderId: "510795344519",
  appId: "1:510795344519:web:9991541f95af051f12a622"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Activar persistencia local offline
enableIndexedDbPersistence(db).catch((err) => {
    console.log("Persistencia sin conexión activa de forma limitada: ", err.code);
});

const form = document.getElementById('cliente-form');
const listaClientes = document.getElementById('lista-clientes');
const btnGps = document.getElementById('btn-capturar-gps');
const inputGps = document.getElementById('gps');

// Captura de GPS mediante la tablet
btnGps.addEventListener('click', () => {
  if (navigator.geolocation) {
    inputGps.value = "Obteniendo coordenadas...";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        inputGps.value = `${position.coords.latitude}, ${position.coords.longitude}`;
      },
      (error) => {
        alert("Error al obtener GPS. Activa la ubicación e intenta de nuevo.");
        inputGps.value = "";
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  } else {
    alert("Tu dispositivo no soporta geolocalización.");
  }
});

// Guardar datos
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const cedula = document.getElementById('cedula').value.trim();
  const nombre = document.getElementById('nombre').value;
  const telephone = document.getElementById('telefono').value;
  const email = document.getElementById('email').value;
  const sucursal = document.getElementById('sucursal').value;
  const frecuencia = document.getElementById('frecuencia').value;
  const gps = document.getElementById('gps').value;
  const direccion = document.getElementById('direccion').value;

  try {
    await setDoc(doc(db, "clientes", cedula), {
      cedula,
      nombre,
      telefono: telephone,
      email,
      sucursal,
      frecuenciaFumigacion: frecuencia,
      gps,
      direccion,
      fechaRegistro: new Date().toISOString()
    });
    
    form.reset();
    alert("¡Cliente guardado correctamente!");
  } catch (error) {
    console.error("Error: ", error);
    alert("Error al conectar con la base de datos.");
  }
});

// Mostrar en pantalla en tiempo real
onSnapshot(collection(db, "clientes"), (snapshot) => {
  listaClientes.innerHTML = '';
  snapshot.forEach((docSnap) => {
    const c = docSnap.data();
    const id = docSnap.id;
    const fecha = new Date(c.fechaRegistro).toLocaleDateString();

    const div = document.createElement('div');
    div.className = 'cliente-card';
    div.innerHTML = `
      <div class="cliente-info">
        <h3>${c.nombre} <span class="badge">${c.frecuenciaFumigacion}</span></h3>
        <p><strong>Cédula:</strong> ${id}</p>
        <p><strong>Sucursal:</strong> ${c.sucursal || 'N/A'} | <strong>Tel:</strong> ${c.telefono || 'N/A'}</p>
        <p><strong>Email:</strong> ${c.email || 'N/A'}</p>
        <p><strong>Dirección:</strong> ${c.direccion || 'No especificada'}</p>
        <p><strong>GPS:</strong> ${c.gps ? `📍 <a href="https://www.google.com/maps/search/?api=1&query=${c.gps}" target="_blank">Ver en Mapa</a>` : 'No capturada'}</p>
        <p style="font-size:12px; color:#94a3b8;">Registrado el: ${fecha}</p>
      </div>
      <button class="btn-delete" data-id="${id}">Eliminar</button>
    `;
    listaClientes.appendChild(div);
  });

  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idCliente = e.target.getAttribute('data-id');
      if(confirm(`¿Deseas eliminar al cliente ID: ${idCliente}?`)) {
        await deleteDoc(doc(db, "clientes", idCliente));
      }
    });
  });
});

