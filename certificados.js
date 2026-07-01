import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, collection, setDoc, onSnapshot, doc, getDoc, Timestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuración de Firebase
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

// Referencias del DOM
const formCert = document.getElementById('certificado-form');
const selectCliente = document.getElementById('select-cliente');
const inputIdCertificado = document.getElementById('id-certificado');
const tablaHistorialBody = document.getElementById('tabla-historial-body');
const inputBuscar = document.getElementById('input-buscar');
const selectProducto = document.getElementById('producto-utilizado');

// Campos de producto químico
const inProdNombre = document.getElementById('form-prod-nombre');
const inProdActivo = document.getElementById('form-prod-activo');
const inProdMs = document.getElementById('form-prod-ms');
const inProdLote = document.getElementById('form-prod-lote');
const inProdDosis = document.getElementById('form-prod-dosis');
const inProdVence = document.getElementById('form-prod-vence');

let totalCertificados = 0;
let listaClientesGlobal = [];
let listaCertificadosGlobal = [];

// Autocompletar datos del producto seleccionado
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

// Cargar Clientes en Tiempo Real
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

// Generar Consecutivo Automático
onSnapshot(collection(db, "certificados"), (snapshot) => {
  totalCertificados = snapshot.size;
  const numeroSiguiente = totalCertificados + 1;
  const formatoNumero = String(numeroSiguiente).padStart(6, '0');
  if(!formCert.dataset.editMode) {
    inputIdCertificado.value = `CERT-${formatoNumero}`;
  }
});

// SOLUCIÓN AL ARREGLO DE CONSULTA: Carga segura y paralela sin bloqueos
onSnapshot(collection(db, "certificados"), async (snapshot) => {
  if(snapshot.empty) {
    tablaHistorialBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No hay certificados registrados.</td></tr>`;
    return;
  }

  // Ejecución controlada con promesas individuales para evitar colgar el bucle
  const promesas = snapshot.docs.map(async (docSnap) => {
    try {
      const cert = docSnap.data();
      let nombreClienteStr = "Cliente no asignado";
      let direccionClienteStr = "---";

      if (cert.Nombre && cert.Nombre.path) {
        const clienteSnap = await getDoc(cert.Nombre).catch(() => null);
        if (clienteSnap && clienteSnap.exists()) {
          nombreClienteStr = clienteSnap.data().nombre || "Sin nombre";
          direccionClienteStr = clienteSnap.data().direccion || "---";
        }
      }

      return {
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
        pVence: cert["Producto vencimiento"] || '---'
      };
    } catch (e) {
      console.error("Certificado dañado ignorado para no romper la lista: ", docSnap.id, e);
      return null;
    }
  });

  const resultados = await Promise.all(promesas);
  listaCertificadosGlobal = resultados.filter(item => item !== null);

  // Ordenar del más nuevo al más viejo
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
      <td><button class="btn-print-old" onclick="ejecutarReimpresionDirecta('${cert.id}')">🖨️ Re-Imprimir</button></td>
    `;
    tablaHistorialBody.appendChild(tr);
  });
}

// Input de búsqueda en tiempo real
inputBuscar.addEventListener('input', (e) => {
  const termino = e.target.value.toLowerCase().trim();
  const filtrados = listaCertificadosGlobal.filter(c => 
    c.id.toLowerCase().includes(termino) || c.cliente.toLowerCase().includes(termino)
  );
  renderTablaHistorial(filtrados);
});

// Disparador del botón de la tabla (Inmune a fallos del DOM)
window.ejecutarReimpresionDirecta = function(idCert) {
  const certEncontrado = listaCertificadosGlobal.find(c => c.id === idCert);
  if (certEncontrado) {
    prepararYDispararImpresion(certEncontrado);
  } else {
    alert("Error: No se localizaron los datos de este certificado.");
  }
};

// Remover acentos para que el QR procese cadenas limpias rápidamente
function limpiarTextoQR(txt) {
  return txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 25);
}

function prepararYDispararImpresion(cert) {
  try {
    document.getElementById('print-num-cert').innerText = cert.id || '---';
    document.getElementById('print-cliente').innerText = cert.cliente || '---';
    document.getElementById('print-fantasia').innerText = cert.fantasia || cert.cliente || '---';
    document.getElementById('print-direccion').innerText = cert.direccion || '---';
    document.getElementById('print-fecha').innerText = cert.fecha || '---';
    document.getElementById('print-vence').innerText = cert.vence || '---';
    document.getElementById('print-inicio').innerText = (cert.horaInicio || '00:00') + " Hrs";
    document.getElementById('print-fin').innerText = (cert.horaFin || '00:00') + " Hrs";
    document.getElementById('print-tipo').innerText = cert.tipo || '---';
    document.getElementById('print-cabezal').innerText = cert.cabezal || 'N/A';
    document.getElementById('print-remolque').innerText = cert.remolque || 'N/A';
    document.getElementById('print-plagas').innerText = cert.plagas || '---';

    document.getElementById('chk-desinsectacion').innerText = (cert.objetivo === "Desinsectación") ? "[X] Desinsectación" : "[ ] Desinsectación";
    document.getElementById('chk-desratizacion').innerText = (cert.objetivo === "Desratización") ? "[X] Desratización" : "[ ] Desratización";
    document.getElementById('chk-sanitizacion').innerText = (cert.objetivo === "Sanitización") ? "[X] Sanitización" : "[ ] Sanitización";

    document.getElementById('chk-aspersion').innerText = (cert.metodo === "Aspersión") ? "[X] Aspersión" : "[ ] Aspersión";
    document.getElementById('chk-cebo').innerText = (cert.metodo === "Cebo Rodenticida") ? "[X] Cebo Rodenticida" : "[ ] Cebo Rodenticida";
    document.getElementById('chk-termonebulizacion').innerText = (cert.metodo === "Termonebulización") ? "[X] Termonebulización" : "[ ] Termonebulización";

    document.getElementById('td-prod-nombre').innerText = cert.pNombre || '---';
    document.getElementById('td-prod-activo').innerText = cert.pActivo || '---';
    document.getElementById('td-prod-ms').innerText = cert.pReg || '---';
    document.getElementById('td-prod-lote').innerText = cert.pLote || '---';
    document.getElementById('td-prod-dosis').innerText = cert.pDosis || '---';
    document.getElementById('td-prod-vence').innerText = cert.pVence || '---';

    // SOLUCIÓN DEFINITIVA AL OVERFLOW DEL QR
    const qrContainer = document.getElementById('qrcode');
    if (qrContainer) {
      qrContainer.innerHTML = ""; 
      
      const clienteQR = limpiarTextoQR(cert.cliente);
      const textoQrPublico = `TECNOPLAGAS\nID:${cert.id}\nCli:${clienteQR}\nCab:${cert.cabezal}\nRem:${cert.remolque}\nFec:${cert.fecha}\nVen:${cert.vence}`;

      const InstanciaQRCode = window.QRCode || QRCode;
      
      if (typeof InstanciaQRCode !== 'undefined') {
        new InstanciaQRCode(qrContainer, {
          text: textoQrPublico,
          width: 115,
          height: 115,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: 0 // Forzado a Nivel L (Bajo) para evitar desbordes de texto
        });
      }
    }

    setTimeout(() => {
      window.print();
    }, 450);

  } catch (error) {
    console.error("Error crítico en la preparación del documento:", error);
    alert("Ocurrió un error al preparar la vista de impresión: " + error.message);
  }
}

window.prepararYDispararImpresion = prepararYDispararImpresion;

// Guardar e Imprimir Formulario Principal
formCert.addEventListener('submit', async (e) => {
  e.preventDefault();

  const idCertificadoValue = inputIdCertificado.value;
  const clienteSeleccionadoId = selectCliente.value;
  const clienteEncontrado = listaClientesGlobal.find(c => c.id === clienteSeleccionadoId);

  const fServicio = new Date(document.getElementById('fecha-servicio').value + "T00:00:00");
  const fValido = new Date(document.getElementById('servicio-valido').value + "T00:00:00");
  
  const hInicioStr = document.getElementById('hora-inicio').value || "00:00";
  const hFinStr = document.getElementById('hora-finalizacion').value || "00:00";
  const hInicio = new Date(document.getElementById('fecha-servicio').value + "T" + hInicioStr);
  const hFin = new Date(document.getElementById('fecha-servicio').value + "T" + hFinStr);

  const payloadCertificado = {
    IdCertificados: idCertificadoValue,
    Cabezal: document.getElementById('cabezal').value.trim(),
    Remolque: document.getElementById('remolque').value.trim(),
    "Nombre de fantasia": document.getElementById('nombre-fantasia').value.trim(),
    "Tipo de servicio": document.getElementById('tipo-servicio').value,
    "Metodo de aplicacion": document.getElementById('metodo-aplicacion').value,
    "Objetivo de Control": document
