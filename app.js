import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, collection, setDoc, onSnapshot, deleteDoc, doc, enableIndexedDbPersistence 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Credenciales de tu proyecto "Fumigadora Tecnoplagas"
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

// 2. Activar persistencia de datos local (Modo Offline para la tablet)
enableIndexedDbPersistence(db).catch((err) => {
    console.log("Persistencia sin conexión activa de forma limitada: ", err.code);
});

// 3. Referencias de los elementos en el HTML
const form = document.getElementById('cliente-form');
const listaClientes = document.getElementById('lista-clientes');
const btnGps = document.getElementById('btn-capturar-gps');
const inputGps = document.getElementById('gps');
const buscador = document.getElementById('buscador');

// Elementos exclusivos para controlar la Edición
const modoEdicionHidden = document.getElementById('modo-edicion');
const tituloFormulario = document.getElementById('titulo-formulario');
const btnGuardar = document.getElementById('btn-guardar');
const btnCancelar = document.getElementById('btn-cancelar');
const inputCedula = document.getElementById('cedula');

let clientesArray = []; // Guarda la copia de la base de datos para el buscador rápido

// 4. Captura de Ubicación GPS por la Tablet
btnGps.addEventListener('click', () => {
  if (navigator.geolocation) {
    inputGps.value = "Obteniendo coordenadas...";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        inputGps.value = `${position.coords.latitude}, ${position.coords.longitude}`;
      },
      (error) => {
        alert("Error al obtener GPS. Activa la ubicación de tu tablet.");
        inputGps.value = "";
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }
});

// 5. Enviar el Formulario (Decide automáticamente si REGISTRA o EDITA)
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

    if (!esEdicion) {
      // Si es un cliente nuevo, grabamos la fecha de hoy
      datosCliente.fechaRegistro = new Date().toISOString();
    } else {
      // Si es edición, buscamos y mantenemos la fecha exacta que ya tenía antes
      const clienteOriginal = clientesArray.find(c => c.cedula === cedula);
      datosCliente.fechaRegistro = clienteOriginal ? clienteOriginal.fechaRegistro : new Date().toISOString();
    }

    // Guarda en Firestore usando la Cédula como ID único del documento
    await setDoc(doc(db, "clientes", cedula), datosCliente);
    
    alert(esEdicion ? "¡Cliente modificado con éxito!" : "¡Cliente guardado correctamente!");
    resetearFormulario();
    window.cambiarPestaña('consulta'); // Te devuelve automáticamente a la pestaña de búsqueda
  } catch (error) {
    console.error(error);
    alert("Error al conectar con Firestore.");
  }
});

// 6. Botón para cancelar la edición y limpiar todo
btnCancelar.addEventListener('click', resetearFormulario);

function resetearFormulario() {
  form.reset();
  modoEdicionHidden.value = "";
  inputCedula.disabled = false; // Desbloquea el campo Cédula para nuevos registros
  tituloFormulario.innerText = "Fumigadora Tecnoplagas - Nuevo Registro";
  btnGuardar.innerText = "Guardar Cliente en Sistema";
  btnGuardar.style.background = "#10b981"; // Vuelve a verde normal
  btnCancelar.style.display = "none";
}

// 7. Mostrar Clientes en Pantalla (Dibuja las tarjetas con botones Editar y Eliminar)
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

  // --- ESCUCHAR CLIC EN EL BOTÓN EDITAR ---
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idCliente = e.target.getAttribute('data-id');
      const cliente = clientesArray.find(c => c.cedula === idCliente);
      
      if(cliente) {
        // Pasa los datos del cliente seleccionado a las casillas del formulario
        inputCedula.value = cliente.cedula;
        inputCedula.disabled = true; // Bloquea la cédula para que no cambie la llave primaria
        document.getElementById('nombre').value = cliente.nombre;
        document.getElementById('telefono').value = cliente.telefono || '';
        document.getElementById('email').value = cliente.email || '';
        document.getElementById('sucursal').value = cliente.sucursal || '';
        document.getElementById('frecuencia').value = cliente.frecuenciaFumigacion;
        document.getElementById('gps').value = cliente.gps || '';
        document.getElementById('direccion').value = cliente.direccion || '';

        // Transforma visualmente el formulario al "Modo Edición"
        modoEdicionHidden.value = cliente.cedula;
        tituloFormulario.innerText = `✏️ Modificando Cliente: ${cliente.nombre}`;
        btnGuardar.innerText = "Actualizar Datos del Cliente";
        btnGuardar.style.background = "#f59e0b"; // Color naranja de alerta/edición
        btnCancelar.style.display = "block";

        // Mueve al usuario automáticamente a la pestaña del Formulario
        window.cambiarPestaña('registro');
      }
    });
  });

  // --- ESCUCHAR CLIC EN EL BOTÓN ELIMINAR ---
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idCliente = e.target.getAttribute('data-id');
      if(confirm(`¿Estás seguro que deseas eliminar permanentemente al cliente con ID: ${idCliente}?`)) {
        await deleteDoc(doc(db, "clientes", idCliente));
      }
    });
  });
}

// 8. Oír la Base de Datos de Firestore en Tiempo Real
onSnapshot(collection(db, "clientes"), (snapshot) => {
  clientesArray = [];
  snapshot.forEach((docSnap) => {
    clientesArray.push(docSnap.data());
  });
  renderizarClientes(clientesArray);
});

// 9. Lógica de Filtrado del Buscador en tiempo real
buscador.addEventListener('input', (e) => {
  const texto = e.target.value.toLowerCase().trim();
  const clientesFiltrados = clientesArray.filter(c => {
    return c.nombre.toLowerCase().includes(texto) || c.cedula.toLowerCase().includes(texto);
  });
  renderizarClientes(clientesFiltrados);
});
