import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, collection, setDoc, onSnapshot, doc, getDoc, Timestamp 
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

const formCert = document.getElementById('certificado-form');
const selectCliente = document.getElementById('select-cliente');
const inputIdCertificado = document.getElementById('id-certificado');
const tablaHistorialBody = document.getElementById('tabla-historial-body');
const inputBuscar = document.getElementById('input-buscar');

let totalCertificados = 0;
let listaClientesGlobal = [];
let listaCertificadosGlobal = [];

// 1. CARGAR CLIENTES EN TIEMPO REAL
onSnapshot(collection(db, "clientes"), (snapshot) => {
  selectCliente.innerHTML = '<option value="">Seleccione un cliente...</option>';
  listaClientesGlobal = [];
  snapshot.forEach((docSnap) => {
    const cliente = docSnap.data();
    listaClientesGlobal.push(cliente);
    const option = document.createElement('option');
    option.value = cliente.consecutivo; 
    option.textContent = `[${cliente.consecutivo}] ${cliente.nombre}`;
    selectCliente.appendChild(option);
  });
});

// 2. CONSECUTIVO AUTOMÁTICO
onSnapshot(collection(db, "certificados"), (snapshot) => {
  totalCertificados = snapshot.size;
  const numeroSiguiente = totalCertificados + 1;
  const formatoNumero = String(numeroSiguiente).padStart(6, '0');
  if(!formCert.dataset.editMode) {
    inputIdCertificado.value = `CERT-${formatoNumero}`;
  }
});

// 3. CONSULTA HISTÓRICA EN TIEMPO REAL
onSnapshot(collection(db, "certificados"), async (snapshot) => {
  listaCertificadosGlobal = [];
  tablaHistorialBody.innerHTML = "";

  if(snapshot.empty) {
    tablaHistorialBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No hay certificados registrados.</td></tr>`;
    return;
  }

  for (const docSnap of snapshot.docs) {
    const cert = docSnap.data();
    let nombreClienteStr = "Cargando...";
    let direccionClienteStr = "---";

    if (cert.Nombre && cert.Nombre.path) {
      const clienteSnap = await getDoc(cert.Nombre);
      if (clienteSnap.exists()) {
        nombreClienteStr = clienteSnap.data().nombre;
        direccionClienteStr = clienteSnap.data().direccion || "---";
      } else {
        nombreClienteStr = "Cliente no encontrado";
      }
    }

    listaCertificadosGlobal.push({
      id: docSnap.id,
      cliente: nombreClienteStr,
      direccion: direccionClienteStr,
      fecha: cert["Fecha del Servicio"] ? cert["Fecha del Servicio"].toDate().toLocaleDateString('es-CR') : '---',
      vence: cert["Servicio valido"] ? cert["Servicio valido"].toDate().toLocaleDateString('es-CR') : '---',
      producto: cert["Producto utilizado"] || '---',
      cabezal: cert.Cabezal || 'N/A',
      remolque: cert.Remolque || 'N/A',
      fantasia: cert["Nombre de fantasia"] || '---',
      tipo: cert["Tipo de servicio"] || '---',
      metodo: cert["Metodo de aplicacion"] || '---',
      objetivo: cert["Objetivo de Control"] || '---',
      plagas: cert["Plagas que controla"] || '---',
      horaInicio: cert["Hora de Inicio"] ? cert["Hora de Inicio"].toDate().toLocaleTimeString('es-CR', {hour: '2-digit', minute:'2-digit'}) : '00:00',
      horaFin: cert["Hora Finalizacion"] ? cert["Hora Finalizacion"].toDate().toLocaleTimeString('es-CR', {hour: '2-digit', minute:'2-digit'}) : '00:00'
    });
  }

  listaCertificadosGlobal.sort((a, b) => b.id.localeCompare(a.id));
  renderTablaHistorial(listaCertificadosGlobal);
});

function renderTablaHistorial(lista) {
  tablaHistorialBody.innerHTML = "";
  lista.forEach(cert => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${cert.id}</strong></td>
      <td>${cert.cliente}</td>
      <td>${cert.fecha}</td>
      <td><span style="background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:4px; font-size:12px; font-weight:bold;">${cert.producto}</span></td>
      <td><button class="btn-print-old" data-id="${cert.id}">🖨️ Re-Imprimir</button></td>
    `;
    tablaHistorialBody.appendChild(tr);
  });
}

// 4. BUSCADOR
inputBuscar.addEventListener('input', (e) => {
  const termino = e.target.value.toLowerCase().trim();
  const filtrados = listaCertificadosGlobal.filter(c => 
    c.id.toLowerCase().includes(termino) || c.cliente.toLowerCase().includes(termino)
  );
  renderTablaHistorial(filtrados);
});

// 5. EVENTO RE-IMPRIMIR
tablaHistorialBody.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-print-old')) {
    const idCert = e.target.getAttribute('data-id');
    const cert = listaCertificadosGlobal.find(c => c.id === idCert);
    if (cert) prepararYDispararImpresion(cert);
  }
});

// DESGLOSE TÉCNICO DE LA TABLA DE FICHA QUÍMICA
function prepararYDispararImpresion(cert) {
  document.getElementById('print-num-cert').innerText = cert.id;
  document.getElementById('print-cliente').innerText = cert.cliente;
  document.getElementById('print-fantasia').innerText = cert.fantasia || cert.cliente;
  document.getElementById('print-direccion').innerText = cert.direccion;
  document.getElementById('print-fecha').innerText = cert.fecha;
  document.getElementById('print-vence').innerText = cert.vence;
  document.getElementById('print-inicio').innerText = cert.horaInicio + " Hrs";
  document.getElementById('print-fin').innerText = cert.horaFin + " Hrs";
  document.getElementById('print-tipo').innerText = cert.tipo;
  document.getElementById('print-cabezal').innerText = cert.cabezal;
  document.getElementById('print-remolque').innerText = cert.remolque;
  document.getElementById('print-plagas').innerText = cert.plagas;

  // Casillas [X]
  document.getElementById('chk-desinsectacion').innerText = (cert.objetivo === "Desinsectación") ? "[X] Desinsectación" : "[ ] Desinsectación";
  document.getElementById('chk-desratizacion').innerText = (cert.objetivo === "Desratización") ? "[X] Desratización" : "[ ] Desratización";
  document.getElementById('chk-sanitizacion').innerText = (cert.objetivo === "Sanitización") ? "[X] Sanitización" : "[ ] Sanitización";

  document.getElementById('chk-aspersion').innerText = (cert.metodo === "Aspersión") ? "[X] Aspersión" : "[ ] Aspersión";
  document.getElementById('chk-cebo').innerText = (cert.metodo === "Cebo Rodenticida") ? "[X] Cebo Rodenticida" : "[ ] Cebo Rodenticida";
  document.getElementById('chk-termonebulizacion').innerText = (cert.metodo === "Termonebulización") ? "[X] Termonebulización" : "[ ] Termonebulización";

  // MAPEO DINÁMICO DE LOS PRODUCTOS SOLICITADOS
  let pNombre = "---", pActivo = "---", pReg = "---", pLote = "2301234", pDosis = "---", pVence = "25/02/2028";

  switch (cert.producto) {
    case "Finigen":
      pNombre = "Finigen"; pActivo = "Cipermetrina + Acetamiprid"; pReg = "4113-P-902"; pDosis = "5-10 ml/L"; break;
    case "Cypermethrin":
      pNombre = "Cypermethrin 25% EC"; pActivo = "Cypermethrin"; pReg = "4113-P-902"; pDosis = "10 ml/L"; break;
    case "Deltamethrin":
      pNombre = "Deltamethrin 2.5% WP"; pActivo = "Deltamethrin"; pReg = "5012-P-901"; pDosis = "15 g/L"; break;
    case "Fipronil":
      pNombre = "Fipronil 5% SC"; pActivo = "Fipronil"; pReg = "3991-P-880"; pDosis = "5 ml/L"; break;
    case "Brodifacoum":
      pNombre = "Brodifacoum 0.005%"; pActivo = "Brodifacoum"; pReg = "3211-P-720"; pDosis = "Baits (Cebo)"; break;
    case "Chlorpyrifos20E":
      pNombre = "Chlorpyrifos 20% E"; pActivo = "Chlorpyrifos"; pReg = "2899-P-610"; pDosis = "Segun Ficha"; break;
    case "Chlorpyrifos20EC":
      pNombre = "Chlorpyrifos 20% EC"; pActivo = "Chlorpyrifos"; pReg = "2899-P-611"; pDosis = "Segun Ficha"; break;
    case "Permethrin":
      pNombre = "Permethrin 10% WP"; pActivo = "Permethrin"; pReg = "4512-P-890"; pDosis = "Segun Ficha"; break;
    case "ZincPhosphide":
      pNombre = "Zinc Phosphide 80%"; pActivo = "Zinc Phosphide"; pReg = "1204-P-310"; pDosis = "Polvo / Cebo"; break;
    case "Hydramethylnon":
      pNombre = "Hydramethylnon 2%"; pActivo = "Hydramethylnon"; pReg = "5112-P-915"; pDosis = "Gel / Atractivo"; break;
  }

  document.getElementById('td-prod-nombre').innerText = pNombre;
  document.getElementById('td-prod-activo').innerText = pActivo;
  document.getElementById('td-prod-ms').innerText = pReg;
  document.getElementById('td-prod-lote').innerText = pLote;
  document.getElementById('td-prod-dosis').innerText = pDosis;
  document.getElementById('td-prod-vence').innerText = pVence;

  window.print();
}

// 6. EVENTO SUBMIT NUEVO
formCert.addEventListener('submit', async (e) => {
  e.preventDefault();

  const idCertificadoValue = inputIdCertificado.value;
  const clienteSeleccionadoId = selectCliente.value;
  const clienteEncontrado = listaClientesGlobal.find(c => c.consecutivo === clienteSeleccionadoId);

  const fServicio = new Date(document.getElementById('fecha-servicio').value + "T00:00:00");
  const fValido = new Date(document.getElementById('servicio-valido').value + "T00:00:00");
  const hInicio = new Date(document.getElementById('fecha-servicio').value + "T" + document.getElementById('hora-inicio').value);
  const hFin = new Date(document.getElementById('fecha-servicio').value + "T" + document.getElementById('hora-finalizacion').value);

  const payloadCertificado = {
    IdCertificados: idCertificadoValue,
    Cabezal: document.getElementById('cabezal').value.trim(),
    Remolque: document.getElementById('remolque').value.trim(),
    "Nombre de fantasia": document.getElementById('nombre-fantasia').value.trim(),
    "Tipo de servicio": document.getElementById('tipo-servicio').value,
    "Metodo de aplicacion": document.getElementById('metodo-aplicacion').value,
    "Objetivo de Control": document.getElementById('objetivo-control').value,
    "Plagas que controla": document.getElementById('plagas-controla').value.trim(),
    "Producto utilizado": document.getElementById('producto-utilizado').value,
    "Fecha del Servicio": Timestamp.fromDate(fServicio),
    "Servicio valido": Timestamp.fromDate(fValido),
    "Hora de Inicio": Timestamp.fromDate(hInicio),
    "Hora Finalizacion": Timestamp.fromDate(hFin),
    Nombre: doc(db, "clientes", clienteSeleccionadoId)
  };

  try {
    await setDoc(doc(db, "certificados", idCertificadoValue), payloadCertificado);
    
    const certMock = {
      id: idCertificadoValue,
      cliente: clienteEncontrado ? clienteEncontrado.nombre : 'N/A',
      direccion: clienteEncontrado ? (clienteEncontrado.direccion || '---') : '---',
      fecha: fServicio.toLocaleDateString('es-CR'),
      vence: fValido.toLocaleDateString('es-CR'),
      producto: payloadCertificado["Producto utilizado"],
      cabezal: payloadCertificado.Cabezal,
      remolque: payloadCertificado.Remolque,
      fantasia: payloadCertificado["Nombre de fantasia"],
      tipo: payloadCertificado["Tipo de servicio"],
      metodo: payloadCertificado["Metodo de aplicacion"],
      objetivo: payloadCertificado["Objetivo de Control"],
      plagas: payloadCertificado["Plagas que controla"],
      horaInicio: document.getElementById('hora-inicio').value,
      horaFin: document.getElementById('hora-finalizacion').value
    };

    alert("¡Certificado guardado con éxito!");
    prepararYDispararImpresion(certMock);
    
    formCert.reset();
    window.location.href = "index.html";
  } catch (error) {
    console.error(error);
    alert("Error al guardar el certificado.");
  }
});
