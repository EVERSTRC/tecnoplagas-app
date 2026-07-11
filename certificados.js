import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, collection, setDoc, onSnapshot, doc, getDoc, Timestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuración de tu base de datos Firebase
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

// Referencias de los elementos del formulario en HTML
const formCert = document.getElementById('certificado-form');
const selectCliente = document.getElementById('select-cliente');
const inputIdCertificado = document.getElementById('id-certificado');
const tablaHistorialBody = document.getElementById('tabla-historial-body');
const inputBuscar = document.getElementById('input-buscar');
const selectProducto = document.getElementById('producto-utilizado');

// Referencias de los campos de detalles químicos
const inProdNombre = document.getElementById('form-prod-nombre');
const inProdActivo = document.getElementById('form-prod-activo');
const inProdMs = document.getElementById('form-prod-ms');
const inProdLote = document.getElementById('form-prod-lote');
const inProdDosis = document.getElementById('form-prod-dosis');
const inProdVence = document.getElementById('form-prod-vence');

let listaClientesGlobal = [];
let listaCertificadosGlobal = [];
let listaProductosGlobal = []; // Colección en memoria de productos de Firestore

// Sincronización de Productos desde la base de datos en tiempo real[span_2](start_span)[span_2](end_span)
onSnapshot(collection(db, "productos"), (snapshot) => {
  if (selectProducto) selectProducto.innerHTML = '<option value="">Seleccione el producto químico...</option>';
  listaProductosGlobal = [];
  
  snapshot.forEach((docSnap) => {
    const prod = docSnap.data();
    listaProductosGlobal.push({ id: docSnap.id, ...prod });
    
    if (selectProducto) {
      const option = document.createElement('option');
      option.value = docSnap.id; 
      option.textContent = prod["Nombre Comercial"] || docSnap.id;[span_3](start_span)[span_3](end_span)
      selectProducto.appendChild(option);
    }
  });
});

// Autocompletado reactivo al seleccionar un Producto de la lista[span_4](start_span)[span_4](end_span)
if (selectProducto) {
  selectProducto.addEventListener('change', () => {
    const idProductoSeleccionado = selectProducto.value;
    const productoEncontrado = listaProductosGlobal.find(p => p.id === idProductoSeleccionado);

    if (productoEncontrado) {
      // Mapeo preciso a los elementos correspondientes de la vista[span_5](start_span)[span_5](end_span)
      if(inProdNombre) inProdNombre.value = productoEncontrado["Nombre Comercial"] || "";[span_6](start_span)[span_6](end_span)
      if(inProdActivo) inProdActivo.value = productoEncontrado["Ingrediente Activo"] || "";[span_7](start_span)[span_7](end_span)
      if(inProdMs)     inProdMs.value     = productoEncontrado["Registro M.S."] || "";[span_8](start_span)[span_8](end_span)
      if(inProdDosis)  inProdDosis.value  = productoEncontrado["Dosis Recomendada"] || "";[span_9](start_span)[span_9](end_span)
      if(inProdLote)   inProdLote.value   = productoEncontrado["Lote"] || "";[span_10](start_span)[span_10](end_span)
      if(inProdVence)  inProdVence.value  = productoEncontrado["Vencimiento del Producto"] || "";[span_11](start_span)[span_11](end_span)
    } else {
      // Limpieza segura en caso de deselección
      if(inProdNombre) inProdNombre.value = "";
      if(inProdActivo) inProdActivo.value = "";
      if(inProdMs)     inProdMs.value     = "";
      if(inProdDosis)  inProdDosis.value  = "";
      if(inProdLote)   inProdLote.value   = "";
      if(inProdVence)  inProdVence.value  = "";
    }
  });
}

// Sincronización de Clientes en tiempo real
onSnapshot(collection(db, "clientes"), (snapshot) => {
  if (selectCliente) selectCliente.innerHTML = '<option value="">Seleccione un cliente...</option>';
  listaClientesGlobal = [];
  snapshot.forEach((docSnap) => {
    const cliente = docSnap.data();
    listaClientesGlobal.push({ id: docSnap.id, ...cliente });
    if (selectCliente) {
      const option = document.createElement('option');
      option.value = docSnap.id; 
      option.textContent = `[${cliente.consecutivo || docSnap.id}] ${cliente.nombre || cliente.razonSocial || "Cliente"}`;
      selectCliente.appendChild(option);
    }
  });
  
  if(listaCertificadosGlobal.length > 0) {
    renderTablaHistorial(listaCertificadosGlobal);
  }
});

// Sincronización e Historial de Certificados mapeado con tus campos exactos de base de datos
onSnapshot(collection(db, "certificados"), (snapshot) => {
  listaCertificadosGlobal = [];
  
  // Calcular número siguiente de forma segura e independiente para evitar que falle el consecutivo
  const totalCertificados = snapshot.size;
  const numeroSiguiente = totalCertificados + 1;
  const formatoNumero = String(numeroSiguiente).padStart(6, '0');
  if(formCert && !formCert.dataset.editMode && inputIdCertificado) {
    inputIdCertificado.value = `CERT-${formatoNumero}`;
  }

  if(snapshot.empty) {
    if (tablaHistorialBody) tablaHistorialBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No hay certificados registrados.</td></tr>`;
    return;
  }

  snapshot.forEach((docSnap) => {
    try {
      const cert = docSnap.data();
      if (!cert) return;

      // Extracción del ID del cliente desde la referencia exacta "Nombre"
      let idClienteRelacionado = "";
      if (cert.Nombre && typeof cert.Nombre === 'object' && cert.Nombre.id) {
        idClienteRelacionado = cert.Nombre.id;
      } else if (cert.Nombre && typeof cert.Nombre === 'string') {
        idClienteRelacionado = cert.Nombre.split('/').pop();
      }

      listaCertificadosGlobal.push({
        id: cert.IdCertificados || docSnap.id,
        clienteId: idClienteRelacionado,
        clienteNombre: "Cargando datos...", 
        direccion: cert.Direccion || "---", 
        fecha: cert["Fecha del Servicio"] ? cert["Fecha del Servicio"].toDate().toLocaleDateString('es-CR') : '---',
        vence: cert["Servicio valido"] ? cert["Servicio valido"].toDate().toLocaleDateString('es-CR') : '---',
        producto: cert["Producto utilizado"] || cert["Nombre del producto"] || '---',
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
      });
    } catch (e) {
      console.warn("Fila omitida por inconsistencia en los campos:", docSnap.id, e);
    }
  });

  listaCertificadosGlobal.sort((a, b) => b.id.localeCompare(a.id));
  renderTablaHistorial(listaCertificadosGlobal);
});

// Pinta las filas de la tabla de consultas
function renderTablaHistorial(lista) {
  if (!tablaHistorialBody) return;
  tablaHistorialBody.innerHTML = "";
  
  if(lista.length === 0) {
    tablaHistorialBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No se encontraron registros coincidentes.</td></tr>`;
    return;
  }

  lista.forEach(cert => {
    if (cert.clienteId) {
      const match = listaClientesGlobal.find(c => c.id === cert.clienteId);
      if (match) {
        cert.clienteNombre = match.nombre || match.razonSocial || "Sin nombre";
        cert.direccion = match.direccion || "---";
      } else {
        cert.clienteNombre = "Cliente: " + cert.clienteId;
      }
    } else {
      cert.clienteNombre = "No especificado";
    }

    let badgeStyle = "background:#e0f2fe; color:#0369a1; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:bold;";

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${cert.id}</strong></td>
      <td>${cert.clienteNombre}</td>
      <td>${cert.fecha}</td>
      <td><span style="${badgeStyle}">${cert.pNombre}</span></td>
      <td><button class="btn-reimprimir" style="background-color:#10b981; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold;" onclick="ejecutarReimpresionDirecta('${cert.id}')">🖨️ Re-Imprimir</button></td>
    `;
    tablaHistorialBody.appendChild(tr);
  });
}

// Filtro de búsqueda en tiempo real
if (inputBuscar) {
  inputBuscar.addEventListener('input', (e) => {
    const termino = e.target.value.toLowerCase().trim();
    const filtrados = listaCertificadosGlobal.filter(c => 
      c.id.toLowerCase().includes(termino) || 
      c.clienteNombre.toLowerCase().includes(termino)
    );
    renderTablaHistorial(filtrados);
  });
}

// Acción de re-impresión directa
window.ejecutarReimpresionDirecta = async function(idCert) {
  const cert = listaCertificadosGlobal.find(c => c.id === idCert);
  if (!cert) {
    alert("Certificado no localizado.");
    return;
  }

  if (cert.direccion === "---" && cert.clienteId) {
    try {
      const snap = await getDoc(doc(db, "clientes", cert.clienteId));
      if(snap.exists()) {
        cert.direccion = snap.data().direccion || "---";
      }
    } catch(err) {
      console.error(err);
    }
  }

  prepararYDispararImpresion(cert);
};

// Envía la información a los elementos contenedores de la impresión y genera el QR
function prepararYDispararImpresion(cert) {
  try {
    if(document.getElementById('print-num-cert')) document.getElementById('print-num-cert').innerText = cert.id || '---';
    if(document.getElementById('print-cliente')) document.getElementById('print-cliente').innerText = cert.clienteNombre || '---';
    if(document.getElementById('print-fantasia')) document.getElementById('print-fantasia').innerText = cert.fantasia || cert.clienteNombre || '---';
    if(document.getElementById('print-direccion')) document.getElementById('print-direccion').innerText = cert.direccion || '---';
    if(document.getElementById('print-fecha')) document.getElementById('print-fecha').innerText = cert.fecha || '---';
    if(document.getElementById('print-vence')) document.getElementById('print-vence').innerText = cert.vence || '---';
    if(document.getElementById('print-inicio')) document.getElementById('print-inicio').innerText = (cert.horaInicio || '00:00');
    if(document.getElementById('print-fin')) document.getElementById('print-fin').innerText = (cert.horaFin || '00:00');
    if(document.getElementById('print-tipo')) document.getElementById('print-tipo').innerText = cert.tipo || '---';
    if(document.getElementById('print-cabezal')) document.getElementById('print-cabezal').innerText = cert.cabezal || 'N/A';
    if(document.getElementById('print-remolque')) document.getElementById('print-remolque').innerText = cert.remolque || 'N/A';
    if(document.getElementById('print-plagas')) document.getElementById('print-plagas').innerText = cert.plagas || '---';

    if(document.getElementById('chk-desinsectacion')) document.getElementById('chk-desinsectacion').innerText = (cert.objetivo === "Desinsectación") ? "[X] Desinsectación" : "[ ] Desinsectación";
    if(document.getElementById('chk-desratizacion')) document.getElementById('chk-desratizacion').innerText = (cert.objetivo === "Desratización") ? "[X] Desratización" : "[ ] Desratización";
    if(document.getElementById('chk-sanitizacion')) document.getElementById('chk-sanitizacion').innerText = (cert.objetivo === "Sanitización") ? "[X] Sanitización" : "[ ] Sanitización";

    if(document.getElementById('chk-aspersion')) document.getElementById('chk-aspersion').innerText = (cert.metodo === "Aspersión") ? "[X] Aspersión" : "[ ] Aspersión";
    if(document.getElementById('chk-cebo')) document.getElementById('chk-cebo').innerText = (cert.metodo === "Cebo Rodenticida") ? "[X] Cebo Rodenticida" : "[ ] Cebo Rodenticida";
    if(document.getElementById('chk-termonebulizacion')) document.getElementById('chk-termonebulizacion').innerText = (cert.metodo === "Termonebulización") ? "[X] Termonebulización" : "[ ] Termonebulización";

    if(document.getElementById('td-prod-nombre')) document.getElementById('td-prod-nombre').innerText = cert.pNombre || '---';
    if(document.getElementById('td-prod-activo')) document.getElementById('td-prod-activo').innerText = cert.pActivo || '---';
    if(document.getElementById('td-prod-ms')) document.getElementById('td-prod-ms').innerText = cert.pReg || '---';
    if(document.getElementById('td-prod-lote')) document.getElementById('td-prod-lote').innerText = cert.pLote || '---';
    if(document.getElementById('td-prod-dosis')) document.getElementById('td-prod-dosis').innerText = cert.pDosis || '---';
    if(document.getElementById('td-prod-vence')) document.getElementById('td-prod-vence').innerText = cert.pVence || '---';

    // === SOLUCIÓN DEFINITIVA DEL QR: ENLACE APUNTANDO A TU GITHUB PAGES ===
    const qrContainer = document.getElementById('qrcode');
    if (qrContainer) {
      qrContainer.innerHTML = ""; // Limpieza estricta de instancias anteriores
      
      // Remover acentos para asegurar compatibilidad total con navegadores móviles
      const cliLimpio = (cert.clienteNombre || "Cliente").normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 25);
      
      // Dirección base del validador alojado en tu cuenta de GitHub Pages
      const urlBaseValidador = "https://everstrc.github.io/tecnoplagas-app/validar.html";
      
      // Construimos el enlace codificado pasando todas las variables
      const textoQrPublico = `${urlBaseValidador}?id=${encodeURIComponent(cert.id)}&cli=${encodeURIComponent(cliLimpio)}&cab=${encodeURIComponent(cert.cabezal)}&rem=${encodeURIComponent(cert.remolque)}&emi=${encodeURIComponent(cert.fecha)}&ven=${encodeURIComponent(cert.vence)}`;

      const InstanciaQRCode = window.QRCode || QRCode;
      if (typeof InstanciaQRCode !== 'undefined') {
        new InstanciaQRCode(qrContainer, {
          text: textoQrPublico,
          width: 115,
          height: 115,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: InstanciaQRCode.CorrectLevel ? InstanciaQRCode.CorrectLevel.M : 1
        });
      }
    }

    setTimeout(() => {
      window.print();
    }, 400);

  } catch (error) {
    console.error("Error al preparar la impresión:", error);
  }
}

window.prepararYDispararImpresion = prepararYDispararImpresion;

// Guardado del formulario usando tus campos exactos
if (formCert) {
  formCert.addEventListener('submit', async (e) => {
    e.preventDefault();

    const idCertificadoValue = inputIdCertificado.value;
    const clienteSeleccionadoId = selectCliente.value;
    const clienteEncontrado = listaClientesGlobal.find(c => c.id === clienteSeleccionadoId);

    if(!clienteSeleccionadoId) {
      alert("Por favor seleccione un cliente válido antes de guardar.");
      return;
    }

    const fServicio = new Date(document.getElementById('fecha-servicio').value + "T00:00:00");
    const fValido = new Date(document.getElementById('servicio-valido').value + "T00:00:00");
    
    const hInicioStr = document.getElementById('hora-inicio').value || "00:00";
    const hFinStr = document.getElementById('hora-finalizacion').value || "00:00";
    const hInicio = new Date(document.getElementById('fecha-servicio').value + "T" + hInicioStr);
    const hFin = new Date(document.getElementById('fecha-servicio').value + "T" + hFinStr);

    // Buscamos el objeto producto completo para guardar su Nombre Comercial de manera consistente
    const productoId = selectProducto.value;
    const prodSeleccionado = listaProductosGlobal.find(p => p.id === productoId);
    const nombreProductoGuardar = prodSeleccionado ? (prodSeleccionado["Nombre Comercial"] || productoId) : productoId;[span_12](start_span)[span_12](end_span)

    // Payload exacto estructurado según tus campos de Firestore
    const payloadCertificado = {
      IdCertificados: idCertificadoValue,
      Cabezal: document.getElementById('cabezal').value.trim(),
      Remolque: document.getElementById('remolque').value.trim(),
      "Nombre de fantasia": document.getElementById('nombre-fantasia').value.trim(),
      "Tipo de servicio": document.getElementById('tipo-servicio').value,
      "Metodo de aplicacion": document.getElementById('metodo-aplicacion').value,
      "Objetivo de Control": document.getElementById('objetivo-control').value,
      "Plagas que controla": document.getElementById('plagas-controla').value.trim(),
      "Producto utilizado": nombreProductoGuardar,
      "Fecha del Servicio": Timestamp.fromDate(fServicio),
      "Servicio valido": Timestamp.fromDate(fValido),
      "Hora de Inicio": Timestamp.fromDate(hInicio),
      "Hora Finalizacion": Timestamp.fromDate(hFin),
      Nombre: doc(db, "clientes", clienteSeleccionadoId), // Guarda como Reference nativo
      
      "Nombre del producto": inProdNombre ? inProdNombre.value.trim() : "",
      "Ingrediente Activo": inProdActivo ? inProdActivo.value.trim() : "",
      "Registro M.S.": inProdMs ? inProdMs.value.trim() : "",
      "Lote del producto": inProdLote ? inProdLote.value.trim() : "",
      "Dosis recomendada": inProdDosis ? inProdDosis.value.trim() : "",
      "Producto vencimiento": inProdVence ? inProdVence.value.trim() : "",
      "Codigo de barras": idCertificadoValue
    };

    try {
      await setDoc(doc(db, "certificados", idCertificadoValue), payloadCertificado);
      
      const certMock = {
        id: idCertificadoValue,
        clienteNombre: clienteEncontrado ? (clienteEncontrado.nombre || clienteEncontrado.razonSocial) : 'N/A',
        direccion: clienteEncontrado ? (clienteEncontrado.direccion || '---') : '---',
        fecha: fServicio.toLocaleDateString('es-CR'),
        vence: fValido.toLocaleDateString('es-CR'),
        producto: nombreProductoGuardar,
        cabezal: payloadCertificado.Cabezal,
        remolque: payloadCertificado.Remolque,
        fantasia: payloadCertificado["Nombre de fantasia"],
        tipo: payloadCertificado["Tipo de servicio"],
        metodo: payloadCertificado["Metodo de aplicacion"],
        objetivo: payloadCertificado["Objetivo de Control"],
        plagas: payloadCertificado["Plagas que controla"],
        horaInicio: hInicioStr,
        horaFin: hFinStr,
        pNombre: payloadCertificado["Nombre del producto"],
        pActivo: payloadCertificado["Ingrediente Activo"],
        pReg: payloadCertificado["Registro M.S."],
        pLote: payloadCertificado["Lote del producto"],
        pDosis: payloadCertificado["Dosis recomendada"],
        pVence: payloadCertificado["Producto vencimiento"]
      };

      prepararYDispararImpresion(certMock);
      formCert.reset();
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar el certificado en la base de datos.");
    }
  });
}
