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

onSnapshot(collection(db, "certificados"), (snapshot) => {
  totalCertificados = snapshot.size;
  const numeroSiguiente = totalCertificados + 1;
  const formatoNumero = String(numeroSiguiente).padStart(6, '0');
  inputIdCertificado.value = `CERT-${formatoNumero}`;
});

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
    "Tipo de servicio": document.getElementById('tipo-servicio').value.trim(),
    "Metodo de aplicacion": document.getElementById('metodo-aplicacion').value.trim(),
    "Objetivo de Control": document.getElementById('objetivo-control').value.trim(),
    "Plagas que controla": document.getElementById('plagas-controla').value.trim(),
    "Producto utilizado": document.getElementById('producto-utilizado').value.trim(),
    
    "Fecha del Servicio": Timestamp.fromDate(fServicio),
    "Servicio valido": Timestamp.fromDate(fValido),
    "Hora de Inicio": Timestamp.fromDate(hInicio),
    "Hora Finalizacion": Timestamp.fromDate(hFin),

    Nombre: doc(db, "clientes", clienteSeleccionadoId)
  };

  try {
    await setDoc(doc(db, "certificados", idCertificadoValue), payloadCertificado);

    document.getElementById('print-num-cert').innerText = idCertificadoValue;
    document.getElementById('print-cliente').innerText = clienteEncontrado ? clienteEncontrado.nombre : 'N/A';
    document.getElementById('print-fantasia').innerText = payloadCertificado["Nombre de fantasia"] || 'Ninguno';
    document.getElementById('print-fecha').innerText = fServicio.toLocaleDateString();
    document.getElementById('print-vence').innerText = fValido.toLocaleDateString();
    document.getElementById('print-inicio').innerText = document.getElementById('hora-inicio').value;
    document.getElementById('print-fin').innerText = document.getElementById('hora-finalizacion').value;
    document.getElementById('print-cabezal').innerText = payloadCertificado.Cabezal || 'N/A';
    document.getElementById('print-remolque').innerText = payloadCertificado.Remolque || 'N/A';
    document.getElementById('print-tipo').innerText = payloadCertificado["Tipo de servicio"] || 'General';
    document.getElementById('print-metodo').innerText = payloadCertificado["Metodo de aplicacion"] || 'N/A';
    document.getElementById('print-objetivo').innerText = payloadCertificado["Objetivo de Control"] || 'N/A';
    document.getElementById('print-plagas').innerText = payloadCertificado["Plagas que controla"] || 'N/A';
    document.getElementById('print-producto').innerText = payloadCertificado["Producto utilizado"] || 'N/A';

    alert("¡Certificado guardado con éxito! Preparando impresión...");
    window.print();
    formCert.reset();
    window.location.href = "index.html";

  } catch (error) {
    console.error(error);
    alert("Error crítico al emitir el certificado.");
  }
});
