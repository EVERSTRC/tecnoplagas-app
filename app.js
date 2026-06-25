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

enableIndexedDbPersistence(db).catch((err) => {
    console.log("Persistencia offline activa con límites: ", err.code);
});

// Referencias del DOM básico
const form = document.getElementById('cliente-form');
const listaClientes = document.getElementById('lista-clientes');
const btnGps = document.getElementById('btn-capturar-gps');
const inputGps = document.getElementById('gps');
const buscador = document.getElementById('buscador');

// Edición
const modoEdicionHidden = document.getElementById('modo-edicion');
const tituloFormulario = document.getElementById('titulo-formulario');
const btnGuardar = document.getElementById('btn-guardar');
const btnCancelar = document.getElementById('btn-cancelar');
const inputCedula = document.getElementById('cedula');

// Google Calendar DOM
const calendarModal = document.getElementById('calendar-modal');
const calendarForm = document.getElementById('calendar-form');
const calNombreCliente = document.getElementById('cal-nombre-cliente');
const calFecha = document.getElementById('cal-fecha');
const calTipoVisita = document.getElementById('cal-tipo-visita');
const calMonto = document.getElementById('cal-monto');
const calDetalles = document.getElementById('cal-detalles');

// Enlace de tu puente de Google Apps Script
const URL_WEB_APP_GOOGLE = "https://script.google.com/macros/s/AKfycbzV-y6bvTwK8ZqKSfhh9zbgbzon9Lzf384nKlO_UFDrxFXBCu5lL7UyhMACuWBDcfj6/exec";

let clientesArray = []; 
let datosClienteAgendado = { telefono: '', gps: '', direccion: '' };

// Captura GPS
btnGps.addEventListener('click', () => {
  if (navigator.geolocation) {
    inputGps.value = "Obteniendo coordenadas...";
    navigator.geolocation.getCurrentPosition(
      (position) => { inputGps.value = `${position.coords.latitude}, ${position.coords.longitude}`; },
      () => { alert("Error al obtener GPS."); inputGps.value = ""; },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }
});

// Guardar / Editar Cliente
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
    const datosCliente = { cedula, nombre, telefono, email, sucursal, frecuenciaFumigacion: frecuencia, gps, direccion };
    if (!esEdicion) {
      datosCliente.fechaRegistro = new Date().toISOString();
    } else {
      const original = clientesArray.find(c => c.cedula === cedula);
      datosCliente.fechaRegistro = original ? original.fechaRegistro : new Date().toISOString();
    }
    await setDoc(doc(db, "clientes", cedula), datosCliente);
    alert(esEdicion ? "¡Cliente modificado con éxito!" : "¡Cliente guardado correctamente!");
    resetearFormulario();
    window.cambiarPestaña('consulta');
  } catch (error) {
    alert("Error al conectar con la base de datos.");
  }
});

btnCancelar.addEventListener('click', resetearFormulario);

function resetearFormulario() {
  form.reset();
  modoEdicionHidden.value = "";
  inputCedula.disabled = false;
  tituloFormulario.innerText = "Fumigadora Tecnoplagas - Nuevo Registro";
  btnGuardar.innerText = "Guardar Cliente en Sistema";
  btnGuardar.style.background = "#10b981";
  btnCancelar.style.display = "none";
}

// Pintar Clientes
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
        <button class="btn-calendar" data-cedula="${c.cedula}" data-nombre="${c.nombre}">📅 Agendar</button>
        <button class="btn-edit" data-id="${c.cedula}">✏️ Editar</button>
        <button class="btn-delete" data-id="${c.cedula}">❌ Eliminar</button>
      </div>
    `;
    listaClientes.appendChild(div);
  });

  // Evento Agendar
  document.querySelectorAll('.btn-calendar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cedulaCliente = e.target.getAttribute('data-cedula');
      const nombreCliente = e.target.getAttribute('data-nombre');
      const cliente = clientesArray.find(c => c.cedula === cedulaCliente);
      
      if(cliente) {
        datosClienteAgendado.telefono = cliente.telefono || 'No especificado';
        datosClienteAgendado.direccion = cliente.direccion || 'No especificada';
        datosClienteAgendado.gps = cliente.gps || 'No capturado';
        
        calNombreCliente.value = nombreCliente;
        calendarModal.style.display = 'flex';
      }
    });
  });

  // Evento Editar
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idCliente = e.target.getAttribute('data-id');
      const cliente = clientesArray.find(c => c.cedula === idCliente);
      if(cliente) {
        inputCedula.value = cliente.cedula; inputCedula.disabled = true;
        document.getElementById('nombre').value = cliente.nombre;
        document.getElementById('telefono').value = cliente.telefono || '';
        document.getElementById('email').value = cliente.email || '';
        document.getElementById('sucursal').value = cliente.sucursal || '';
        document.getElementById('frecuencia').value = cliente.frecuenciaFumigacion;
        document.getElementById('gps').value = cliente.gps || '';
        document.getElementById('direccion').value = cliente.direccion || '';
        modoEdicionHidden.value = cliente.cedula;
        tituloFormulario.innerText = `✏️ Modificando Cliente: ${cliente.nombre}`;
        btnGuardar.innerText = "Actualizar Datos del Cliente";
        btnGuardar.style.background = "#f59e0b"; btnCancelar.style.display = "block";
        window.cambiarPestaña('registro');
      }
    });
  });

  // Evento Eliminar
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idCliente = e.target.getAttribute('data-id');
      if(confirm(`¿Deseas eliminar al cliente ID: ${idCliente}?`)) { await deleteDoc(doc(db, "clientes", idCliente)); }
    });
  });
}

// Envío de evento a Google Calendar (Combina los nuevos campos con los de contacto)
calendarForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const enlaceMaps = datosClienteAgendado.gps !== 'No capturado' 
    ? `https://www.google.com/maps/search/?api=1&query=${datosClienteAgendado.gps}` 
    : 'No disponible';

  const montoFactura = calMonto.value ? `₡${calMonto.value}` : 'Por definir';
  const notasAdicionales = calDetalles.value || 'Ninguna';

  // Construcción de la descripción final exacta que verás en tu Google Calendar
  const descripcionCompleta = `📋 Tipo de Visita: ${calTipoVisita.value}
💰 Monto a Facturar: ${montoFactura}
📝 Notas: ${notasAdicionales}

---------------------------------------
📞 Teléfono: ${datosClienteAgendado.telefono}
📍 Dirección: ${datosClienteAgendado.direccion}
🗺️ Coordenadas GPS: ${datosClienteAgendado.gps}
🚗 Ruta Maps: ${enlaceMaps}
---------------------------------------`;

  const payload = {
    title: `${calTipoVisita.value} - ${calNombreCliente.value}`,
    startTime: calFecha.value,
    description: descripcionCompleta
  };

  alert("Enviando cita a Google Calendar...");

  try {
    await fetch(URL_WEB_APP_GOOGLE, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    
    alert("¡Cita agendada correctamente en tu Google Calendar!");
    calendarForm.reset();
    calendarModal.style.display = 'none';
  } catch (error) {
    alert("¡Acción enviada! Revisa tu calendario de Google en unos segundos.");
    calendarForm.reset();
    calendarModal.style.display = 'none';
  }
});

// Escuchar Firestore
onSnapshot(collection(db, "clientes"), (snapshot) => {
  clientesArray = [];
  snapshot.forEach((docSnap) => { clientesArray.push(docSnap.data()); });
  renderizarClientes(clientesArray);
});

// Buscador rápido
buscador.addEventListener('input', (e) => {
  const texto = e.target.value.toLowerCase().trim();
  const clientesFiltrados = clientesArray.filter(c => c.nombre.toLowerCase().includes(texto) || c.cedula.toLowerCase().includes(texto));
  renderizarClientes(clientesFiltrados);
});
