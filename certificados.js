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

// Referencias de los campos de detalles químicos (Inputs del Formulario)
const inProdNombre = document.getElementById('form-prod-nombre');
const inProdActivo = document.getElementById('form-prod-activo');
const inProdMs = document.getElementById('form-prod-ms');
const inProdLote = document.getElementById('form-prod-lote');
const inProdDosis = document.getElementById('form-prod-dosis');
const inProdVence = document.getElementById('form-prod-vence');

// FUNCIÓN DE BÚSQUEDA TRIPLE MULTI-ID (Evita el problema de que devuelva NULL)
const obtenerInputPlagas = () => {
  return document.getElementById('plagas-controla') || 
         document.getElementById('form-plagas-controla') || 
         document.querySelector('input[placeholder*="Cargado automáticamente"]');
};

let listaClientesGlobal = [];
let listaCertificadosGlobal = [];
let listaProductosGlobal = []; 

// Sincronización de Productos en tiempo real desde Firebase (Colección: "Productos")
onSnapshot(collection(db, "Productos"), (snapshot) => {
  if (selectProducto) selectProducto.innerHTML = '<option value="">Seleccione el producto químico...</option>';
  listaProductosGlobal = [];
  
  snapshot.forEach((docSnap) => {
    const producto = docSnap.data();
    listaProductosGlobal.push({ id: docSnap.id, ...producto });
    
    if (selectProducto) {
      const option = document.createElement('option');
      option.value = docSnap.id; 
      option.textContent = producto["Nombre Comercial"] || producto.nombre || docSnap.id;
      selectProducto.appendChild(option);
    }
  });

  if (selectProducto) {
    const optionOtro = document.createElement('option');
    optionOtro.value = "Otro";
    optionOtro.textContent = "Otro (Manual)";
    selectProducto.appendChild(optionOtro);
  }
});

// Autocompletado dinámico mapeado con los nombres exactos de tus campos en Firestore
if (selectProducto) {
  selectProducto.addEventListener('change', () => {
    const valorSeleccionado = selectProducto.value;

    if (!valorSeleccionado || valorSeleccionado === "Otro") {
      limpiarCamposProducto();
      return;
    }

    const prodEncontrado = listaProductosGlobal.find(p => p.id === valorSeleccionado);

    if (prodEncontrado) {
      if (inProdNombre) inProdNombre.value = prodEncontrado["Nombre Comercial"] || "";
      if (inProdActivo) inProdActivo.value = prodEncontrado["Ingrediente Activo"] || "";
      if (inProdMs) inProdMs.value = prodEncontrado["Registro M.S."] || "";
      if (inProdDosis) inProdDosis.value = prodEncontrado["Dosis Recomendada"] || ""; 
      if (inProdLote) inProdLote.value = prodEncontrado["Lote"] || "";
      if (inProdVence) inProdVence.value = prodEncontrado["Vencimiento del Producto"] || "";
      
      const inputPlagasDinamico = obtenerInputPlagas();
      if (inputPlagasDinamico) {
        inputPlagasDinamico.value = prodEncontrado["Plagas que Controla"] || "";
      }
    } else {
      limpiarCamposProducto();
    }
  });
}

function limpiarCamposProducto() {
  if (inProdNombre) inProdNombre.value = "";
  if (inProdActivo) inProdActivo.value = "";
  if (inProdMs) inProdMs.value = "";
  if (inProdDosis) inProdDosis.value = "";
  if (inProdLote) inProdLote.value = "";
  if (inProdVence) inProdVence.value = "";
  
  const inputPlagasDinamico = obtenerInputPlagas();
  if (inputPlagasDinamico) {
    inputPlagasDinamico.value = "";
  }
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

// Sincronización e Historial de Certificados
onSnapshot(collection(db, "certificados"), (snapshot) => {
  listaCertificadosGlobal = [];
  
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

    const objTexto = cert.objetivo || "";
    if(document.getElementById('chk-desinsectacion')) document.getElementById('chk-desinsectacion').innerText = objTexto.includes("Desinsectación") ? "[X] Desinsectación" : "[ ] Desinsectación";
    if(document.getElementById('chk-desratizacion')) document.getElementById('chk-desratizacion').innerText = objTexto.includes("Desratización") ? "[X] Desratización" : "[ ] Desratización";
    if(document.getElementById('chk-sanitizacion')) document.getElementById('chk-sanitizacion').innerText = objTexto.includes("Sanitización") ? "[X] Sanitización" : "[ ] Sanitización";

    const metTexto = cert.metodo || "";
    if(document.getElementById('m-aspersion')) document.getElementById('m-aspersion').innerText = metTexto.includes("Aspersión") ? "[X] Aspersión" : "[ ] Aspersión";
    if(document.getElementById('m-termonebulizacion')) document.getElementById('m-termonebulizacion').innerText = metTexto.includes("Termonebulización") ? "[X] Termonebulización" : "[ ] Termonebulización";
    if(document.getElementById('m-nebulizacion-frio')) document.getElementById('m-nebulizacion-frio').innerText = metTexto.includes("Nebulización en frío") ? "[X] Nebulización en frío" : "[ ] Nebulización en frío";
    if(document.getElementById('m-lami-gomosa')) document.getElementById('m-lami-gomosa').innerText = metTexto.includes("Lami gomosa") ? "[X] Lami gomosa" : "[ ] Lami gomosa";
    if(document.getElementById('m-prod-granulado')) document.getElementById('m-prod-granulado').innerText = metTexto.includes("Prod granulado") ? "[X] Prod granulado" : "[ ] Prod granulado";
    if(document.getElementById('m-cebo-roedores')) document.getElementById('m-cebo-roedores').innerText = metTexto.includes("Cebo para roedores") ? "[X] Cebo para roedores" : "[ ] Cebo para roedores";
    if(document.getElementById('m-trampa-mecanica')) document.getElementById('m-trampa-mecanica').innerText = metTexto.includes("Trampa mecánica") ? "[X] Trampa mecánica" : "[ ] Trampa mecánica";
    if(document.getElementById('m-prod-gel')) document.getElementById('m-prod-gel').innerText = metTexto.includes("Aplic de prod en gel") ? "[X] Aplic de prod en gel" : "[ ] Aplic de prod en gel";
    if(document.getElementById('m-gas-fumigeno')) document.getElementById('m-gas-fumigeno').innerText = metTexto.includes("Aplic de Gas Fumígeno") ? "[X] Aplic de Gas Fumígeno" : "[ ] Aplic de Gas Fumígeno";
    if(document.getElementById('m-prod-polvo')) document.getElementById('m-prod-polvo').innerText = metTexto.includes("Aplic de prod en Polvo") ? "[X] Aplic de prod en Polvo" : "[ ] Aplic de prod en Polvo";

    if(document.getElementById('td-prod-nombre')) document.getElementById('td-prod-nombre').innerText = cert.pNombre || '---';
    if(document.getElementById('td-prod-activo')) document.getElementById('td-prod-activo').innerText = cert.pActivo || '---';
    if(document.getElementById('td-prod-ms')) document.getElementById('td-prod-ms').innerText = cert.pReg || '---';
    if(document.getElementById('td-prod-lote')) document.getElementById('td-prod-lote').innerText = cert.pLote || '---';
    if(document.getElementById('td-prod-dosis')) document.getElementById('td-prod-dosis').innerText = cert.pDosis || '---';
    if(document.getElementById('td-prod-vence')) document.getElementById('td-prod-vence').innerText = cert.pVence || '---';

    const qrContainer = document.getElementById('qrcode');
    if (qrContainer) {
      qrContainer.innerHTML = ""; 
      const cliLimpio = (cert.clienteNombre || "Cliente").normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 25);
      const urlBaseValidador = "https://everstrc.github.io/tecnoplagas-app/validar.html";
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

    setTimeout(() => { window.print(); }, 400);
  } catch (error) {
    console.error("Error al preparar la impresión:", error);
  }
}

window.prepararYDispararImpresion = prepararYDispararImpresion;

// Guardado del formulario - TOTALMENTE BLINDADO CONTRA ERRORES
if (formCert) {
  formCert.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      const idCertificadoValue = inputIdCertificado.value;
      const clienteSeleccionadoId = selectCliente.value;
      const clienteEncontrado = listaClientesGlobal.find(c => c.id === clienteSeleccionadoId);

      if(!clienteSeleccionadoId) {
        alert("⚠️ Por favor seleccione un cliente válido de la lista.");
        return;
      }

      // CAPTURA MÚLTIPLE: TIPO DE SERVICIO
      const checkboxesTipo = document.querySelectorAll('input[name="tipo-servicio"]:checked');
      const tiposSeleccionados = Array.from(checkboxesTipo).map(cb => cb.value);
      if(tiposSeleccionados.length === 0) {
        alert("⚠️ Por favor seleccione al menos un Tipo de Servicio.");
        return;
      }
      const tipoServicioString = tiposSeleccionados.join(', ');

      // CAPTURA MÚLTIPLE: OBJETIVOS DE CONTROL
      const checkboxesObjetivo = document.querySelectorAll('input[name="objetivo-control"]:checked');
      const objetivosSeleccionados = Array.from(checkboxesObjetivo).map(cb => cb.value);
      if(objetivosSeleccionados.length === 0) {
        alert("⚠️ Por favor seleccione al menos un Objetivo de Control.");
        return;
      }
      const objetivoControlString = objetivosSeleccionados.join(', ');

      // CAPTURA MÚLTIPLE: MÉTODOS DE APLICACIÓN
      const checkboxesMetodo = document.querySelectorAll('input[name="metodo-aplicacion"]:checked');
      const metodosSeleccionados = Array.from(checkboxesMetodo).map(cb => cb.value);
      if(metodosSeleccionados.length === 0) {
        alert("⚠️ Por favor seleccione al menos un Método de Aplicación.");
        return;
      }
      const metodoAplicacionString = metodosSeleccionados.join(', ');

      // Validar Fechas
      const fechaServicioRaw = document.getElementById('fecha-servicio').value;
      const servicioValidoRaw = document.getElementById('servicio-valido').value;
      if (!fechaServicioRaw || !servicioValidoRaw) {
        alert("⚠️ Por favor especifique la Fecha de Aplicación y Vencimiento.");
        return;
      }

      const fServicio = new Date(fechaServicioRaw + "T00:00:00");
      const fValido = new Date(servicioValidoRaw + "T00:00:00");
      
      const hInicioStr = document.getElementById('hora-inicio').value || "00:00";
      const hFinStr = document.getElementById('hora-finalizacion').value || "00:00";
      const hInicio = new Date(fechaServicioRaw + "T" + hInicioStr);
      const hFin = new Date(fechaServicioRaw + "T" + hFinStr);

      const inputPlagasDinamico = obtenerInputPlagas();

      const payloadCertificado = {
        IdCertificados: idCertificadoValue,
        Cabezal: (document.getElementById('cabezal').value || "N/A").trim(),
        Remolque: (document.getElementById('remolque').value || "N/A").trim(),
        "Nombre de fantasia": (document.getElementById('nombre-fantasia').value || "").trim(),
        "Tipo de servicio": tipoServicioString,
        "Metodo de aplicacion": metodoAplicacionString,
        "Objetivo de Control": objetivoControlString,
        "Plagas que controla": inputPlagasDinamico ? inputPlagasDinamico.value.trim() : "",
        "Producto utilizado": selectProducto.value || "Otro", 
        "Fecha del Servicio": Timestamp.fromDate(fServicio),
        "Servicio valido": Timestamp.fromDate(fValido),
        "Hora de Inicio": Timestamp.fromDate(hInicio),
        "Hora Finalizacion": Timestamp.fromDate(hFin),
        Nombre: doc(db, "clientes", clienteSeleccionadoId), 
        
        "Nombre del producto": inProdNombre ? inProdNombre.value.trim() : "",
        "Ingrediente Activo": inProdActivo ? inProdActivo.value.trim() : "",
        "Registro M.S.": inProdMs ? inProdMs.value.trim() : "",
        "Lote del producto": inProdLote ? inProdLote.value.trim() : "",
        "Dosis recomendada": inProdDosis ? inProdDosis.value.trim() : "",
        "Producto vencimiento": inProdVence ? inProdVence.value.trim() : "",
        "Codigo de barras": idCertificadoValue
      };

      await setDoc(doc(db, "certificados", idCertificadoValue), payloadCertificado);
      
      const certMock = {
        id: idCertificadoValue,
        clienteNombre: clienteEncontrado ? (clienteEncontrado.nombre || clienteEncontrado.razonSocial) : 'N/A',
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
      document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

    } catch (error) {
      console.error("Error crítico al intentar guardar:", error);
      alert("❌ Error al procesar o guardar el certificado:\n" + error.message);
    }
  });
}
