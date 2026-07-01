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
const selectProducto = document.getElementById('producto-utilizado');

const inProdNombre = document.getElementById('form-prod-nombre');
const inProdActivo = document.getElementById('form-prod-activo');
const inProdMs = document.getElementById('form-prod-ms');
const inProdLote = document.getElementById('form-prod-lote');
const inProdDosis = document.getElementById('form-prod-dosis');
const inProdVence = document.getElementById('form-prod-vence');

let totalCertificados = 0;
let listaClientesGlobal = [];
let listaCertificadosGlobal = [];

selectProducto.addEventListener('change', () => {
  const valor = selectProducto.value;
  if (valor === "Finigen") {
    inProdNombre.value = "Finigen"; inProdActivo.value = "Cipermetrina + Acetamiprid"; inProdMs.value = "4113-P-902"; inProdDosis.value = "5-10 ml/L"; inProdLote.value = ""; inProdVence.value = "25/02/28";
  } else if (valor === "Ekoset") {
    inProdNombre.value = "EKOSET EC"; inProdActivo.value = "Permetrina + Tetrametrina"; inProdMs.value = "4122-P-698"; inProdDosis.value = "10 a 20 ml/L"; inProdLote.value = ""; inProdVence.value = "01/28";
  } else if (valor === "Cybor") {
    inProdNombre.value = "Cybor"; inProdActivo.value = "Cipermetrina"; inProdMs.value = "1007-P-335"; inProdDosis.value = "10-20 ml/L"; inProdLote.value = ""; inProdVence.value = "02/28";
  } else if (valor === "Cynoff") {
    inProdNombre.value = "Cynoff CE"; inProdActivo.value = "Cipermetrina"; inProdMs.value = "MV-3382"; inProdDosis.value = "5-10 ml/L"; inProdLote.value = ""; inProdVence.value = "02/28";
  } else {
    inProdNombre.value = ""; inProdActivo.value = ""; inProdMs.value = ""; inProdDosis.value = ""; inProdLote.value = ""; inProdVence.value = "";
  }
});

onSnapshot(collection(db, "clientes"), (snapshot) => {
  selectCliente.innerHTML = '<option value="">Seleccione un cliente...</option>';
  listaClientesGlobal = [];
  snapshot.forEach((docSnap) => {
    const cliente = docSnap.data();
    listaClientesGlobal.push({ id: docSnap.id, ...cliente });
    const option = document.createElement('option');
    option.value = docSnap.id; 
    option.textContent = `[${cliente.consecutivo || docSnap.id}] ${cliente.nombre}`;
    selectCliente.appendChild(option);
  });
});

onSnapshot(collection(db, "certificados"), (snapshot) => {
  totalCertificados = snapshot.size;
  const numeroSiguiente = totalCertificados + 1;
  const formatoNumero = String(numeroSiguiente).padStart(6, '0');
  if(!formCert.dataset.editMode) {
    inputIdCertificado.value = `CERT-${formatoNumero}`;
  }
});

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
      horaFin: cert["Hora Finalizacion"] ? cert["Hora Finalizacion"].toDate().toLocaleTimeString('es-CR', {hour: '2-digit', minute:'2-digit'}) : '00:00',
      
      pNombre: cert["Nombre del producto"] || '---',
      pActivo: cert["Ingrediente Activo"] || '---',
      pReg: cert["Registro M.S."] || '---',
      pLote: cert["Lote del producto"] || '---',
      pDosis: cert["Dosis recomendada"] || '---',
      pVence: cert["Producto vencimiento"] || '---',
      barcode: cert["Codigo de barras"] || docSnap.id
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
      <td><span style="background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:4px; font-size:12px; font-weight:bold;">${cert.pNombre}</span></td>
      <td><button class="btn-print-old" data-id="${cert.id}">🖨️ Re-Imprimir</button></td>
    `;
    tablaHistorialBody.appendChild(tr);
  });
}

inputBuscar.addEventListener('input', (e) => {
  const termino = e.target.value.toLowerCase().trim();
  const filtrados = listaCertificadosGlobal.filter(c => 
    c.id.toLowerCase().includes(termino) || c.cliente.toLowerCase().includes(termino)
  );
  renderTablaHistorial(filtrados);
});

tablaHistorialBody.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-print-old')) {
    const idCert = e.target.getAttribute('data-id');
    const cert = listaCertificadosGlobal.find(c => c.id === idCert);
    if (cert) prepararYDispararImpresion(cert);
  }
});

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

  document.getElementById('chk-desinsectacion').innerText = (cert.objetivo === "Desinsectación") ? "[X] Desinsectación" : "[ ] Desinsectación";
  document.getElementById('chk-desratizacion').innerText = (cert.objetivo === "Desratización") ? "[X] Desratización" : "[ ] Desratización";
  document.getElementById('chk-sanitizacion').innerText = (cert.objetivo === "Sanitización") ? "[X] Sanitización" : "[ ] Sanitización";

  document.getElementById('chk-aspersion').innerText = (cert.metodo === "Aspersión") ? "[X] Aspersión" : "[ ] Aspersión";
  document.getElementById('chk-cebo').innerText = (cert.metodo === "Cebo Rodenticida") ? "[X] Cebo Rodenticida" : "[ ] Cebo Rodenticida";
  document.getElementById('chk-termonebulizacion').innerText = (cert.metodo === "Termonebulización") ? "[X] Termonebulización" : "[ ] Termonebulización";

  document.getElementById('td-prod-nombre').innerText = cert.pNombre;
  document.getElementById('td-prod-activo').innerText = cert.pActivo;
  document.getElementById('td-prod-ms').innerText = cert.pReg;
  document.getElementById('td-prod-lote').innerText = cert.pLote;
  document.getElementById('td-prod-dosis').innerText = cert.pDosis;
  document.getElementById('td-prod-vence').innerText = cert.pVence;

  // GENERADOR DINÁMICO DEL CÓDIGO QR ANTICLONACIÓN
  const qrContainer = document.getElementById('qrcode');
  qrContainer.innerHTML = ""; // Limpia el QR del certificado anterior
  
  // URL que visitará el cliente/inspector con los datos incrustados de forma segura
  const urlValidacion = `https://consultas.tecnoplagas.com/validar?id=${encodeURIComponent(cert.id)}&cabezal=${encodeURIComponent(cert.cabezal)}&remolque=${encodeURIComponent(cert.remolque)}&fumigado=${encodeURIComponent(cert.fecha)}&vence=${encodeURIComponent(cert.vence)}`;

  new QRCode(qrContainer, {
    text: urlValidacion,
    width: 90,
    height: 90,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M
  });

  window.print();
}

formCert.addEventListener('submit', async (e) => {
  e.preventDefault();

  const idCertificadoValue = inputIdCertificado.value;
  const clienteSeleccionadoId = selectCliente.value;
  const clienteEncontrado = listaClientesGlobal.find(c => c.id === clienteSeleccionadoId);

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
    "Producto utilizado": selectProducto.value,
    "Fecha del Servicio": Timestamp.fromDate(fServicio),
    "Servicio valido": Timestamp.fromDate(fValido),
    "Hora de Inicio": Timestamp.fromDate(hInicio),
    "Hora Finalizacion": Timestamp.fromDate(hFin),
    Nombre: doc(db, "clientes", clienteSeleccionadoId),
    
    "Nombre del producto": inProdNombre.value.trim(),
    "Ingrediente Activo": inProdActivo.value.trim(),
    "Registro M.S.": inProdMs.value.trim(),
    "Lote del producto": inProdLote.value.trim(),
    "Dosis recomendada": inProdDosis.value.trim(),
    "Producto vencimiento": inProdVence.value.trim(),
    "Codigo de barras": idCertificadoValue
  };

  try {
    await setDoc(doc(db, "certificados", idCertificadoValue), payloadCertificado);
    
    const certMock = {
      id: idCertificadoValue,
      cliente: clienteEncontrado ? clienteEncontrado.nombre : 'N/A',
      direccion: clienteEncontrado ? (clienteEncontrado.direccion || '---') : '---',
      fecha: fServicio.toLocaleDateString('es-CR'),
      vence: fValido.toLocaleDateString('es-CR'),
      producto: selectProducto.value,
      cabezal: payloadCertificado.Cabezal,
      remolque: payloadCertificado.Remolque,
      fantasia: payloadCertificado["Nombre de fantasia"],
      tipo: payloadCertificado["Tipo de servicio"],
      metodo: payloadCertificado["Metodo de aplicacion"],
      objetivo: payloadCertificado["Objetivo de Control"],
      plagas: payloadCertificado["Plagas que controla"],
      horaInicio: document.getElementById('hora-inicio').value,
      horaFin: document.getElementById('hora-finalizacion').value,
      pNombre: payloadCertificado["Nombre del producto"],
      pActivo: payloadCertificado["Ingrediente Activo"],
      pReg: payloadCertificado["Registro M.S."],
      pLote: payloadCertificado["Lote del producto"],
      pDosis: payloadCertificado["Dosis recomendada"],
      pVence: payloadCertificado["Producto vencimiento"],
      barcode: idCertificadoValue
    };

    alert("¡Certificado guardado con éxito!");
    prepararYDispararImpresion(certMock);
    
    formCert.reset();
    window.location.href = "index.html";
  } catch (error) {
    console.error("Error en Firebase: ", error);
    alert("Error al guardar el certificado.");
  }
});
