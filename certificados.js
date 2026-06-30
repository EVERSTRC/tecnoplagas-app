import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, collection, setDoc, onSnapshot, doc, Timestamp 
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

let totalCertificados = 0;
let listaClientesGlobal = [];

// 1. Cargar clientes en tiempo real en el formulario
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

// 2. Controlar el consecutivo automático de certificados
onSnapshot(collection(db, "certificados"), (snapshot) => {
  totalCertificados = snapshot.size;
  const numeroSiguiente = totalCertificados + 1;
  const formatoNumero = String(numeroSiguiente).padStart(6, '0');
  inputIdCertificado.value = `CERT-${formatoNumero}`;
});

// 3. Procesar formulario, guardar en Firebase y rellenar plantilla de impresión
formCert.addEventListener('submit', async (e) => {
  e.preventDefault();

  const idCertificadoValue = inputIdCertificado.value;
  const clienteSeleccionadoId = selectCliente.value;
  const clienteEncontrado = listaClientesGlobal.find(c => c.consecutivo === clienteSeleccionadoId);

  // Fechas y horas formateadas
  const fServicio = new Date(document.getElementById('fecha-servicio').value + "T00:00:00");
  const fValido = new Date(document.getElementById('servicio-valido').value + "T00:00:00");
  const hInicio = document.getElementById('hora-inicio').value;
  const hFin = document.getElementById('hora-finalizacion').value;

  // Valores capturados de los selectores
  const tipoServicio = document.getElementById('tipo-servicio').value;
  const objetivoControl = document.getElementById('objetivo-control').value;
  const metodoAplicacion = document.getElementById('metodo-aplicacion').value;
  const productoSeleccionado = document.getElementById('producto-utilizado').value;
  const plagasControla = document.getElementById('plagas-controla').value.trim();
  const nombreFantasia = document.getElementById('nombre-fantasia').value.trim();
  const cabezal = document.getElementById('cabezal').value.trim();
  const remolque = document.getElementById('remolque').value.trim();

  // Guardar en la base de datos de Firebase
  const payloadCertificado = {
    IdCertificados: idCertificadoValue,
    Cabezal: cabezal,
    Remolque: remolque,
    "Nombre de fantasia": nombreFantasia,
    "Tipo de servicio": tipoServicio,
    "Metodo de aplicacion": metodoAplicacion,
    "Objetivo de Control": objetivoControl,
    "Plagas que controla": plagasControla,
    "Producto utilizado": productoSeleccionado,
    "Fecha del Servicio": Timestamp.fromDate(fServicio),
    "Servicio valido": Timestamp.fromDate(fValido),
    Nombre: doc(db, "clientes", clienteSeleccionadoId)
  };

  try {
    await setDoc(doc(db, "certificados", idCertificadoValue), payloadCertificado);

    // --- ENLAZAR VALORES DINÁMICOS AL ÁREA DE IMPRESIÓN ---
    document.getElementById('print-num-cert').innerText = idCertificadoValue;
    document.getElementById('print-cliente').innerText = clienteEncontrado ? clienteEncontrado.nombre : 'N/A';
    document.getElementById('print-fantasia').innerText = nombreFantasia || (clienteEncontrado ? clienteEncontrado.nombre : '---');
    document.getElementById('print-direccion').innerText = clienteEncontrado ? (clienteEncontrado.direccion || 'Dirección no especificada') : '---';
    
    document.getElementById('print-fecha').innerText = fServicio.toLocaleDateString('es-CR');
    document.getElementById('print-vence').innerText = fValido.toLocaleDateString('es-CR');
    document.getElementById('print-inicio').innerText = hInicio + " Hrs";
    document.getElementById('print-fin').innerText = hFin + " Hrs";
    
    document.getElementById('print-tipo').innerText = tipoServicio;
    document.getElementById('print-cabezal').innerText = cabezal || 'N/A';
    document.getElementById('print-remolque').innerText = remolque || 'N/A';
    document.getElementById('print-plagas').innerText = plagasControla;

    // --- CÁLCULO DINÁMICO DE CASILLAS [ X ] ---
    // Objetivos
    document.getElementById('chk-desinsectacion').innerText = (objetivoControl === "Desinsectación") ? "[X] Desinsectación" : "[ ] Desinsectación";
    document.getElementById('chk-desratizacion').innerText = (objetivoControl === "Desratización") ? "[X] Desratización" : "[ ] Desratización";
    document.getElementById('chk-sanitizacion').innerText = (objetivoControl === "Sanitización") ? "[X] Sanitización" : "[ ] Sanitización";

    // Métodos
    document.getElementById('chk-aspersion').innerText = (metodoAplicacion === "Aspersión") ? "[X] Aspersión" : "[ ] Aspersión";
    document.getElementById('chk-cebo').innerText = (metodoAplicacion === "Cebo Rodenticida") ? "[X] Cebo Rodenticida" : "[ ] Cebo Rodenticida";
    document.getElementById('chk-termonebulizacion').innerText = (metodoAplicacion === "Termonebulización") ? "[X] Termonebulización" : "[ ] Termonebulización";

    // --- MAPEO DE FICHA QUÍMICA A LA TABLA ---
    let pNombre = "---", pActivo = "---", pReg = "---", pDosis = "---";

    if (productoSeleccionado === "Finigen") {
      pNombre = "Finigen"; pActivo = "Cipermetrina + Acetamiprid"; pReg = "4113-P-902"; pDosis = "5-10 ml/L";
    } else if (productoSeleccionado === "Cypermethrin") {
      pNombre = "Cypermethrin 25% EC"; pActivo = "Cipermetrina"; pReg = "N/A"; pDosis = "10 ml/L";
    } else if (productoSeleccionado === "Deltamethrin") {
      pNombre = "Deltamethrin 2.5% WP"; pActivo = "Deltametrina"; pReg = "N/A"; pDosis = "15 g/L";
    } else if (productoSeleccionado === "Fipronil") {
      pNombre = "Fipronil 5% SC"; pActivo = "Fipronil"; pReg = "N/A"; pDosis = "5 ml/L";
    } else if (productoSeleccionado === "Brodifacoum") {
      pNombre = "Brodifacoum 0.005%"; pActivo = "Brodifacoum"; pReg = "N/A"; pDosis = "Bloques / Cebo";
    }

    document.getElementById('td-prod-nombre').innerText = pNombre;
    document.getElementById('td-prod-activo').innerText = pActivo;
    document.getElementById('td-prod-ms').innerText = pReg;
    document.getElementById('td-prod-dosis').innerText = pDosis;

    // --- DISPARAR IMPRESIÓN ---
    alert("¡Certificado guardado con éxito en Firebase! Preparando vista de impresión...");
    window.print();
    
    // Limpiar formulario y retornar al menú
    formCert.reset();
    window.location.href = "index.html";

  } catch (error) {
    console.error(error);
    alert("Error al procesar y enlazar la información del certificado.");
  }
});
