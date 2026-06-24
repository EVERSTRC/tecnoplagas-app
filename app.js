import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, collection, setDoc, onSnapshot, deleteDoc, doc, enableIndexedDbPersistence 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

enableIndexedDbPersistence(db).catch((err) => {
    console.log("Persistencia offline activa con límites: ", err.code);
});

// Referencias del DOM
const form = document.getElementById('cliente-form');
const listaClientes = document.getElementById('lista-clientes');
const btnGps = document.getElementById('btn-capturar-gps');
const inputGps = document.getElementById('gps');
const buscador = document.getElementById('buscador');

// Elementos de control de edición
const modoEdicionHidden = document.getElementById('modo-edicion');
const tituloFormulario = document.getElementById('titulo-formulario');
const btnGuardar = document.getElementById('btn-guardar');
const btnCancelar = document.getElementById('btn-cancelar');
const inputCedula = document.getElementById('cedula');

let clientesArray = []; 

// Captura de GPS
btnGps.addEventListener('click', () => {
  if (navigator.geolocation) {
    inputGps.value = "Obteniendo coordenadas...";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        inputGps.value = `${position.coords.latitude}, ${position.coords.longitude}`;
      },
      (error) => {
        alert("Error al obtener GPS. Activa la ubicación.");
        inputGps.value = "";
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }
});

// Guardar o Editar datos
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const cedula = inputCedula.value.trim();
  const nombre = document.getElementById('nombre').value;
  const telefono = document.getElementById('telefono').value;
  const email = document.getElementById('email').value;
  const sucursal = document.getElementById('sucursal').value;
  const frecuencia = document.getElementById('frecuencia').value;
  const gps = document.getElementById('gps').value;
  const direccion = document.getElementById('direccion').value;

  const esEdicion = modoEdicionHidden.value !== "";

  try {
    const datosCliente = {
      cedula,
      nombre,
      telefono,
      email,
      sucursal,
      frecuenciaFumigacion: frecuencia,
      gps,
      direccion
    };

    // Si es nuevo registro, guardamos la fecha de creación
    if (!esEdicion) {
      datosCliente.fechaRegistro = new Date().toISOString();
    } else {
      // Si estamos editando, mantenemos la fecha original que ya tenía
      const clienteOriginal = clientesArray.find(c => c.cedula === cedula);
      datosCliente.fechaRegistro = clienteOriginal ? clienteOriginal.fechaRegistro : new Date().toISOString();
    }

    await setDoc(doc(db, "clientes", cedula), datosCliente);
    
    alert(esEdicion ? "¡Cliente actualizado con éxito!" : "¡Cliente guardado correctamente!");
    resetearFormulario();
    window.cambiarPestaña('consulta'); // Te regresa a la lista automáticamente
  } catch (error) {
    alert("Error al conectar con la base de datos.");
  }
});

// Cancelar edición manualmente
btnCancelar.addEventListener('click', resetearFormulario);

function resetearFormulario() {
  form.reset();
  modoEdicionHidden.value = "";
  inputCedula.disabled = false; // Desbloquear cédula
  tituloFormulario.innerText = "Fumigadora Tecnoplagas - Nuevo Registro";
  btnGuardar.innerText = "Guardar Cliente en Sistema";
  btnGuardar.style.background = "#10b981";
  btnCancelar.style.display = "none";
}

// Función para pintar la lista de clientes
function renderizarClientes(arregloClientes) {
  listaClientes.innerHTML = '';
  if (arregloClientes.length === 0) {
    listaClientes.innerHTML = '<p style="text-align:center; color:#94a3b8;">No se encontraron clientes.</p>';
    return;
  }

  arregloClientes.forEach((c) => {
    const fecha = new Date(c.fechaRegistro).toLocaleDateString();
    const div = document.createElement('div');
    div.className = 'cliente-card';
    div.innerHTML = `
      <div class="cliente-info">
        <h3>${c.nombre} <span class="badge">${c.frecuenciaFumigacion}</span></h3>
        <p><strong>Cédula:</strong> ${c.cedula}</p>
        <p><strong>Sucursal:</strong> ${c.sucursal || 'N/A'} | <strong>Tel:</strong> ${c.telefono || 'N/A'}</p>
        <p><strong>Email:</strong> ${c.email || 'N/A'}</p>
        <p><strong>Dirección:</strong> ${c.direccion || 'No especificada'}</p>
        <p><strong>GPS:</strong> ${c.gps ? `📍 <a href="https://www.google.com/maps/search/?api=1&query=${c.gps}" target="_blank">Ver en Mapa</a>` : 'No capturada'}</p>
        <p style="font-size:12px; color:#94a3b8;">Registrado el: ${fecha}</p>
      </div>
      <div class="acciones-card">
        <button class="btn-edit" data-id="${c.cedula}">✏️ Editar</button>
        <button class="btn-delete" data-id="${c.cedula}">❌ Eliminar</button>
      </div>
    `;
    listaClientes.appendChild(div);
  });

  // Evento Editar
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idCliente = e.target.getAttribute('data-id');
      const cliente = clientesArray.find(c => c.cedula === idCliente);
      
      if(cliente) {
        // Rellenar formulario con datos actuales
        inputCedula.value = cliente.cedula;
        inputCedula.disabled = true; // Bloqueamos la cédula para que no cambie el ID exclusivo
        document.getElementById('nombre').value = cliente.nombre;
        document.getElementById('telefono').value = cliente.telefono || '';
        document.getElementById('email').value = cliente.email || '';
        document.getElementById('sucursal').value = cliente.sucursal || '';
        document.getElementById('frecuencia').value = cliente.frecuenciaFumigacion;
        document.getElementById('gps').value = cliente.gps || '';
        document.getElementById('direccion').value = cliente.direccion || '';

        // Cambiar estados visuales
        modoEdicionHidden.value = cliente.cedula;
        tituloFormulario.innerText = `✏️ Editando Cliente: ${cliente.nombre}`;
        btnGuardar.innerText = "Actualizar Datos del Cliente";
        btnGuardar.style.background = "#f59e0b"; // Naranja de edición
        btnCancelar.style.display = "block";

        // Mover al usuario a la pestaña de edición
        window.cambiarPestaña('registro');
      }
    });
  });

  // Evento Eliminar
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idCliente = e.target.getAttribute('data-id');
      if(confirm(`¿Deseas eliminar al cliente ID: ${idCliente}?`)) {
        await deleteDoc(doc(db, "clientes", idCliente));
      }
    });
  });
}

// Escuchar Firestore en tiempo real
onSnapshot(collection(db, "clientes"), (snapshot) => {
  clientesArray = [];
  snapshot.forEach((docSnap) => {
    clientesArray.push(docSnap.data());
  });
  renderizarClientes(clientesArray);
});

// Lógica del buscador rápido
buscador.addEventListener('input', (e) => {
  const texto = e.target.value.toLowerCase().trim();
  const clientesFiltrados = clientesArray.filter(c => {
    return c.nombre.toLowerCase().includes(texto) || c.cedula.toLowerCase().includes(texto);
  });
  renderizarClientes(clientesFiltrados);
});
