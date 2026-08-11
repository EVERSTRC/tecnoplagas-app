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
const btnSubmit = document.getElementById('btn-submit-certificado');
const tituloPantalla = document.getElementById('titulo-pantalla');
const labelConsecutivo = document.getElementById('label-consecutivo');
const contenedorProductos = document.getElementById('contenedor-productos-lista');

let listaClientesGlobal = [];
let listaCertificadosGlobal = [];
let listaProductosGlobal = []; 

let isEditMode = false;
let currentEditingId = null;
let contadorProductos = 0;

// Sincronización de Productos desde Firestore
onSnapshot(collection(db, "Productos"), (snapshot) => {
  listaProductosGlobal = [];
  snapshot.forEach((docSnap) => {
    const producto = docSnap.data();
    listaProductosGlobal.push({ id: docSnap.id, ...producto });
  });

  document.querySelectorAll('.prod-select').forEach(sel => {
    const valActual = sel.value;
    actualizarOpcionesSelectProducto(sel);
    sel.value = valActual;
  });
});

function actualizarOpcionesSelectProducto(selectElem) {
  selectElem.innerHTML = '<option value="">Seleccione el producto químico...</option>';
  listaProductosGlobal.forEach(p => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = p["Nombre Comercial"] || p.nombre || p.id;
    selectElem.appendChild(option);
  });
  const optionOtro = document.createElement('option');
  optionOtro.value = "Otro";
  optionOtro.textContent = "Otro (Manual)";
  selectElem.appendChild(optionOtro);
}

// Agregar fila de producto
function agregarFilaProducto(datosProd = null) {
  contadorProductos++;
  const idIndex = contadorProductos;

  const divProd = document.createElement('div');
  divProd.className = 'card-producto-item';
  divProd.dataset.id = idIndex;
  divProd.style.cssText = "background: #f9fafb; border: 1px solid #d1d5db; border-radius: 6px; padding: 15px; margin-bottom: 15px; position: relative;";

  divProd.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
      <strong style="color:var(--primary-dark);">Producto Químico #${idIndex}</strong>
      ${contenedorProductos.children.length > 0 ? `<button type="button" onclick="eliminarFilaProducto(${idIndex})" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">🗑️ Eliminar</button>` : ''}
    </div>

    <div class="form-group">
      <label>Seleccionar Producto Base</label>
      <select class="prod-select" id="prod-select-${idIndex}"></select>
    </div>

    <div class="grid-2">
      <div class="form-group"><label>Plaguicida / Nombre Comercial</label><input type="text" class="prod-nombre"></div>
      <div class="form-group"><label>Ingrediente Activo</label><input type="text" class="prod-activo"></div>
    </div>

    <div class="grid-3">
      <div class="form-group"><label>Registro M.S.</label><input type="text" class="prod-ms"></div>
      <div class="form-group"><label>N° Lote</label><input type="text" class="prod-lote"></div>
      <div class="form-group"><label>Dosis / Conc.</label><input type="text" class="prod-dosis"></div>
    </div>

    <div class="grid-2">
      <div class="form-group"><label>Vencimiento Producto</label><input type="text" class="prod-vence" placeholder="MM/AA"></div>
      <div class="form-group"><label>Plagas que Controla</label><input type="text" class="prod-plagas"></div>
    </div>
  `;

  contenedorProductos.appendChild(divProd);

  const selectElem = divProd.querySelector('.prod-select');
  actualizarOpcionesSelectProducto(selectElem);

  selectElem.addEventListener('change', () => {
    const val = selectElem.value;
    if (!val || val === "Otro") {
      limpiarCamposFila(divProd);
      return;
    }
    const match = listaProductosGlobal.find(p => p.id === val);
    if (match) {
      divProd.querySelector('.prod-nombre').value = match["Nombre Comercial"] || "";
      divProd.querySelector('.prod-activo').value = match["Ingrediente Activo"] || "";
      divProd.querySelector('.prod-ms').value = match["Registro M.S."] || "";
      divProd.querySelector('.prod-lote').value = match["Lote"] || "";
      divProd.querySelector('.prod-dosis').value = match["Dosis Recomendada"] || "";
      divProd.querySelector('.prod-vence').value = match["Vencimiento del Producto"] || "";
      divProd.querySelector('.prod-plagas').value = match["Plagas que Controla"] || "";
    }
  });

  if (datosProd) {
    selectElem.value = datosProd.productoId || "";
    divProd.querySelector('.prod-nombre').value = datosProd.pNombre || "";
    divProd.querySelector('.prod-activo').value = datosProd.pActivo || "";
    divProd.querySelector('.prod-ms').value = datosProd.pReg || "";
    divProd.querySelector('.prod-lote').value = datosProd.pLote || "";
    divProd.querySelector('.prod-dosis').value = datosProd.pDosis || "";
    divProd.querySelector('.prod-vence').value = datosProd.pVence || "";
    divProd.querySelector('.prod-plagas').value = datosProd.plagas || "";
  }
}

window.eliminarFilaProducto = function(index) {
  const elem = document.querySelector(`.card-producto-item[data-id="${index}"]`);
  if (elem) elem.remove();
};

function limpiarCamposFila(container) {
  container.querySelector('.prod-nombre').value = "";
  container.querySelector('.prod-activo').value = "";
  container.querySelector('.prod-ms').value = "";
  container.querySelector('.prod-lote').value = "";
  container.querySelector('.prod-dosis').value = "";
  container.querySelector('.prod-vence').value = "";
  container.querySelector('.prod-plagas').value = "";
}

document.getElementById('btn-agregar-producto')?.addEventListener('click', () => {
  agregarFilaProducto();
});

// Sincronización de Clientes
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

// Sincronización del Historial
onSnapshot(collection(db, "certificados_comerciales"), (snapshot) => {
  listaCertificadosGlobal = [];
  
  const totalCertificados = snapshot.size;
  const numeroSiguiente = totalCertificados + 1;
  const formatoNumero = String(numeroSiguiente).padStart(6, '0');
  
  if(!isEditMode && formCert && inputIdCertificado) {
    inputIdCertificado.value = `CERT-${formatoNumero}`;
  }

  if(snapshot.empty) {
    if (tablaHistorialBody) tablaHistorialBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No hay certificados comerciales registrados.</td></tr>`;
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

      let listaProds = [];
      if (Array.isArray(cert.productos) && cert.productos.length > 0) {
        listaProds = cert.productos;
      } else {
        listaProds = [{
          productoId: cert["Producto utilizado"] || "Otro",
          pNombre: cert["Nombre del producto"] || '---',
          pActivo: cert["Ingrediente Activo"] || '---',
          pReg: cert["Registro M.S."] || '---',
          pLote: cert["Lote del producto"] || '---',
          pDosis: cert["Dosis recomendada"] || '---',
          pVence: cert["Producto vencimiento"] || '---',
          plagas: cert["Plagas que controla"] || '---'
        }];
      }

      const hInicioRaw = cert["Hora de Inicio"] ? cert["Hora de Inicio"].toDate() : null;
      const hFinRaw = cert["Hora Finalizacion"] ? cert["Hora Finalizacion"].toDate() : null;

      const formatearHora12h = (dateObj, fallbackStr) => {
        if (!dateObj) return fallbackStr;
        return dateObj.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', hour12: true });
      };

      listaCertificadosGlobal.push({
        id: cert.IdCertificados || docSnap.id,
        clienteId: idClienteRelacionado,
        clienteNombre: "Cargando datos...", 
        direccion: cert.Direccion || "---", 
        fecha: cert["Fecha del Servicio"] ? cert["Fecha del Servicio"].toDate().toLocaleDateString('es-CR') : '---',
        vence: cert["Servicio valido"] ? cert["Servicio valido"].toDate().toLocaleDateString('es-CR') : '---',
        fechaRaw: cert["Fecha del Servicio"] ? cert["Fecha del Servicio"].toDate().toISOString().split('T')[0] : '',
        venceRaw: cert["Servicio valido"] ? cert["Servicio valido"].toDate().toISOString().split('T')[0] : '',
        fantasia: cert["Nombre de fantasia"] || '---',
        tipo: cert["Tipo de servicio"] || 'Control de Plagas',
        metodo: cert["Metodo de aplicacion"] || '---',
        objetivo: cert["Objetivo de Control"] || '---',
        plagas: cert["Plagas que controla"] || (listaProds[0]?.plagas || 'ácaros, arañas, cucarachas, alacranes, tijerillas y más'),
        tecnico: cert["Tecnico Responsable"] || "Everst Rojas Camacho",
        recibido: cert["Recibido por"] || "---",
        
        horaInicioInput: hInicioRaw ? hInicioRaw.toTimeString().substring(0, 5) : '16:00',
        horaFinInput: hFinRaw ? hFinRaw.toTimeString().substring(0, 5) : '18:00',
        
        horarioFormatted: `${formatearHora12h(hInicioRaw, '04:00 p. m.')} a ${formatearHora12h(hFinRaw, '06:00 p. m.')}`,
        
        productos: listaProds
      });
    } catch (e) {
      console.warn("Inconsistencia en documento omitida:", docSnap.id);
    }
  });

  listaCertificadosGlobal.sort((a, b) => b.id.localeCompare(a.id));
  renderTablaHistorial(listaCertificadosGlobal);
});

function renderTablaHistorial(lista) {
  if (!tablaHistorialBody) return;
  tablaHistorialBody.innerHTML = "";
  
  if(lista.length === 0) {
    tablaHistorialBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No se encontraron registros.</td></tr>`;
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

    const nombresProductos = cert.productos.map(p => p.pNombre).filter(n => n && n !== '---').join(', ') || '---';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${cert.id}</strong></td>
      <td>${cert.clienteNombre}</td>
      <td>${cert.fecha}</td>
      <td>${nombresProductos}</td>
      <td>
        <div style="display: flex; gap: 8px;">
          <button style="background-color:#10b981; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold;" onclick="ejecutarReimpresionDirecta('${cert.id}')">🖨️ Imprimir</button>
          <button style="background-color:#2563eb; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold;" onclick="cargarEnEditor('${cert.id}')">✏️ Editar</button>
        </div>
      </td>
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

window.cargarEnEditor = function(idCert) {
  const cert = listaCertificadosGlobal.find(c => c.id === idCert);
  if (!cert) {
    alert("Certificado no localizado.");
    return;
  }

  isEditMode = true;
  currentEditingId = cert.id;

  if (tituloPantalla) tituloPantalla.innerText = `⚠️ EDITANDO CERTIFICADO COMERCIAL: ${cert.id}`;
  if (labelConsecutivo) labelConsecutivo.innerText = "Consecutivo / N° de Certificado (Modo Edición)";
  if (btnSubmit) {
    btnSubmit.classList.add('modo-edicion');
    btnSubmit.innerHTML = "⚠️ Actualizar y Reimprimir Certificado Comercial";
  }

  if (inputIdCertificado) inputIdCertificado.value = cert.id;
  if (selectCliente) selectCliente.value = cert.clienteId;
  
  const fantasiaLimpia = (cert.fantasia && cert.fantasia !== "---") ? cert.fantasia.replace(/^\[.*?\]\s*/, '') : "";
  if (document.getElementById('nombre-fantasia')) document.getElementById('nombre-fantasia').value = fantasiaLimpia;
  
  if (document.getElementById('fecha-servicio')) document.getElementById('fecha-servicio').value = cert.fechaRaw;
  if (document.getElementById('servicio-valido')) document.getElementById('servicio-valido').value = cert.venceRaw;
  if (document.getElementById('hora-inicio')) document.getElementById('hora-inicio').value = cert.horaInicioInput;
  if (document.getElementById('hora-finalizacion')) document.getElementById('hora-finalizacion').value = cert.horaFinInput;
  if (document.getElementById('tecnico-responsable')) document.getElementById('tecnico-responsable').value = cert.tecnico;
  if (document.getElementById('recibido-por')) document.getElementById('recibido-por').value = cert.recibido !== "---" ? cert.recibido : "";

  document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

  if (cert.tipo && cert.tipo !== "---") {
    cert.tipo.split(',').forEach(val => {
      const cb = document.querySelector(`input[name="tipo-servicio"][value="${val.trim()}"]`);
      if (cb) cb.checked = true;
    });
  }

  if (cert.objetivo && cert.objetivo !== "---") {
    cert.objetivo.split(',').forEach(val => {
      const cb = document.querySelector(`input[name="objetivo-control"][value="${val.trim()}"]`);
      if (cb) cb.checked = true;
    });
  }

  if (cert.metodo && cert.metodo !== "---") {
    cert.metodo.split(',').forEach(val => {
      const cb = document.querySelector(`input[name="metodo-aplicacion"][value="${val.trim()}"]`);
      if (cb) cb.checked = true;
    });
  }

  contenedorProductos.innerHTML = "";
  contadorProductos = 0;
  if (cert.productos && cert.productos.length > 0) {
    cert.productos.forEach(prod => agregarFilaProducto(prod));
  } else {
    agregarFilaProducto();
  }

  if (typeof window.cambiarVista === "function") {
    window.cambiarVista('emitir');
  }
};

window.ejecutarReimpresionDirecta = async function(idCert) {
  const cert = listaCertificadosGlobal.find(c => c.id === idCert);
  if (!cert) {
    alert("Certificado no localizado.");
    return;
  }
  if (cert.direccion === "---" && cert.clienteId) {
    try {
      const snap = await getDoc(doc(db, "clientes", cert.clienteId));
      if(snap.exists()) cert.direccion = snap.data().direccion || "---";
    } catch(err) {
      console.error(err);
    }
  }
  prepararYDispararImpresion(cert);
};

// PREPARACIÓN DE IMPRESIÓN (PDF IDÉNTICO A IMAGEN 309.PNG)
function prepararYDispararImpresion(cert) {
  try {
    const fantasiaLimpia = (cert.fantasia || '---').replace(/^\[.*?\]\s*/, '');

    if(document.getElementById('print-cert-id')) document.getElementById('print-cert-id').innerText = cert.id || 'CERT-000000';
    if(document.getElementById('print-cliente')) document.getElementById('print-cliente').innerText = cert.clienteNombre || '---';
    if(document.getElementById('print-fantasia')) document.getElementById('print-fantasia').innerText = fantasiaLimpia || '---';
    if(document.getElementById('print-direccion')) document.getElementById('print-direccion').innerText = cert.direccion || '---';
    if(document.getElementById('print-fecha')) document.getElementById('print-fecha').innerText = cert.fecha || '---';
    if(document.getElementById('print-vence')) document.getElementById('print-vence').innerText = cert.vence || '---';
    if(document.getElementById('print-horario')) document.getElementById('print-horario').innerText = cert.horarioFormatted || '02:00 p. m. a 08:00 p. m.';
    if(document.getElementById('print-tipo')) document.getElementById('print-tipo').innerText = cert.tipo || 'Control de Plagas';
    if(document.getElementById('print-plagas')) document.getElementById('print-plagas').innerText = cert.plagas || 'ácaros, arañas, cucarachas, alacranes, tijerillas y más';
    if(document.getElementById('print-tecnico')) document.getElementById('print-tecnico').innerText = cert.tecnico || 'Everst Rojas Camacho';
    if(document.getElementById('print-recibido')) document.getElementById('print-recibido').innerText = cert.recibido || '---';

    // Lista viñetada de Objetivos de Control
    const ulObjetivos = document.getElementById('print-objetivos-list');
    if (ulObjetivos) {
      ulObjetivos.innerHTML = "";
      const listaObjs = (cert.objetivo && cert.objetivo !== "---") ? cert.objetivo.split(',') : ["Desinsectación", "Sanitización"];
      listaObjs.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.trim();
        ulObjetivos.appendChild(li);
      });
    }

    // Lista viñetada de Métodos de Aplicación
    const ulMetodos = document.getElementById('print-metodos-list');
    if (ulMetodos) {
      ulMetodos.innerHTML = "";
      const listaMets = (cert.metodo && cert.metodo !== "---") ? cert.metodo.split(',') : ["Aspersión"];
      listaMets.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.trim();
        ulMetodos.appendChild(li);
      });
    }

    // Rellenar Productos en la tabla PDF
    const tbodyPDF = document.getElementById('tbody-print-productos');
    if (tbodyPDF) {
      tbodyPDF.innerHTML = "";
      if (cert.productos && cert.productos.length > 0) {
        cert.productos.forEach(p => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${p.pNombre || '---'}</strong></td>
            <td>${p.pActivo || '---'}</td>
            <td>${p.pReg || '---'}</td>
            <td>${p.pLote || '---'}</td>
            <td>${p.pDosis || '---'}</td>
            <td>${p.pVence || '---'}</td>
          `;
          tbodyPDF.appendChild(tr);
        });
      } else {
        tbodyPDF.innerHTML = `<tr><td colspan="6" style="text-align:center;">No se registraron productos.</td></tr>`;
      }
    }

    // Generar Código QR
    const qrContainer = document.getElementById('qrcode');
    if (qrContainer) {
      qrContainer.innerHTML = ""; 
      const cliLimpio = (cert.clienteNombre || "Cliente").normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 25);
      const urlBaseValidador = "https://everstrc.github.io/tecnoplagas-app/validar.html";
      const textoQrPublico = `${urlBaseValidador}?id=${encodeURIComponent(cert.id)}&cli=${encodeURIComponent(cliLimpio)}&emi=${encodeURIComponent(cert.fecha)}&ven=${encodeURIComponent(cert.vence)}`;

      const InstanciaQRCode = window.QRCode || QRCode;
      if (typeof InstanciaQRCode !== 'undefined') {
        new InstanciaQRCode(qrContainer, {
          text: textoQrPublico,
          width: 80,
          height: 80,
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

document.addEventListener('DOMContentLoaded', () => {
  if (contenedorProductos && contenedorProductos.children.length === 0) {
    agregarFilaProducto();
  }
});

if (formCert) {
  formCert.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      const idCertificadoValue = inputIdCertificado.value;
      const clienteSeleccionadoId = selectCliente.value;
      const clienteEncontrado = listaClientesGlobal.find(c => c.id === clienteSeleccionadoId);

      if(!clienteSeleccionadoId) {
        alert("⚠️ Por favor seleccione un cliente de la lista.");
        return;
      }

      const tiposSeleccionados = Array.from(document.querySelectorAll('input[name="tipo-servicio"]:checked')).map(cb => cb.value);
      const objetivosSeleccionados = Array.from(document.querySelectorAll('input[name="objetivo-control"]:checked')).map(cb => cb.value);
      const metodosSeleccionados = Array.from(document.querySelectorAll('input[name="metodo-aplicacion"]:checked')).map(cb => cb.value);

      const tipoServicioString = tiposSeleccionados.join(', ') || "Control de Plagas";
      const objetivoControlString = objetivosSeleccionados.join(', ') || "Sanitización, Desinsectación";
      const metodoAplicacionString = metodosSeleccionados.join(', ') || "Aspersión";

      const fechaServicioRaw = document.getElementById('fecha-servicio').value;
      const servicioValidoRaw = document.getElementById('servicio-valido').value;
      if (!fechaServicioRaw || !servicioValidoRaw) {
        alert("⚠️ Por favor asigne la Fecha del Servicio y su vencimiento.");
        return;
      }

      const fServicio = new Date(fechaServicioRaw + "T00:00:00");
      const fValido = new Date(servicioValidoRaw + "T00:00:00");
      
      const hInicioStr = document.getElementById('hora-inicio').value || "16:00";
      const hFinStr = document.getElementById('hora-finalizacion').value || "18:00";
      const hInicio = new Date(fechaServicioRaw + "T" + hInicioStr);
      const hFin = new Date(fechaServicioRaw + "T" + hFinStr);

      const formatearHora12hObj = (dateObj) => {
        return dateObj.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', hour12: true });
      };

      const rawFantasia = (document.getElementById('nombre-fantasia').value || "").trim();
      const fantasiaFinal = rawFantasia.replace(/^\[.*?\]\s*/, '');

      const listaProductosGuardar = [];
      document.querySelectorAll('.card-producto-item').forEach(card => {
        listaProductosGuardar.push({
          productoId: card.querySelector('.prod-select').value || "Otro",
          pNombre: card.querySelector('.prod-nombre').value.trim(),
          pActivo: card.querySelector('.prod-activo').value.trim(),
          pReg: card.querySelector('.prod-ms').value.trim(),
          pLote: card.querySelector('.prod-lote').value.trim(),
          pDosis: card.querySelector('.prod-dosis').value.trim(),
          pVence: card.querySelector('.prod-vence').value.trim(),
          plagas: card.querySelector('.prod-plagas').value.trim()
        });
      });

      const plagasCombinadas = Array.from(new Set(listaProductosGuardar.map(p => p.plagas).filter(p => p))).join(', ') || "ácaros, arañas, cucarachas, alacranes, tijerillas y más";

      const payloadCertificado = {
        IdCertificados: idCertificadoValue,
        "Nombre de fantasia": fantasiaFinal,
        "Tipo de servicio": tipoServicioString,
        "Metodo de aplicacion": metodoAplicacionString,
        "Objetivo de Control": objetivoControlString,
        "Plagas que controla": plagasCombinadas,
        "Fecha del Servicio": Timestamp.fromDate(fServicio),
        "Servicio valido": Timestamp.fromDate(fValido),
        "Hora de Inicio": Timestamp.fromDate(hInicio),
        "Hora Finalizacion": Timestamp.fromDate(hFin),
        "Tecnico Responsable": document.getElementById('tecnico-responsable').value.trim() || "Everst Rojas Camacho",
        "Recibido por": document.getElementById('recibido-por').value.trim() || "---",
        Nombre: doc(db, "clientes", clienteSeleccionadoId), 
        productos: listaProductosGuardar,
        "Codigo de barras": idCertificadoValue
      };

      await setDoc(doc(db, "certificados_comerciales", idCertificadoValue), payloadCertificado);
      
      const certMock = {
        id: idCertificadoValue,
        clienteNombre: clienteEncontrado ? (clienteEncontrado.nombre || clienteEncontrado.razonSocial) : 'N/A',
        direccion: clienteEncontrado ? (clienteEncontrado.direccion || '---') : '---',
        fecha: fServicio.toLocaleDateString('es-CR'),
        vence: fValido.toLocaleDateString('es-CR'),
        fantasia: payloadCertificado["Nombre de fantasia"],
        tipo: tipoServicioString,
        metodo: metodoAplicacionString,
        objetivo: objetivoControlString,
        plagas: plagasCombinadas,
        horarioFormatted: `${formatearHora12hObj(hInicio)} a ${formatearHora12hObj(hFin)}`,
        tecnico: payloadCertificado["Tecnico Responsable"],
        recibido: payloadCertificado["Recibido por"],
        productos: listaProductosGuardar
      };

      prepararYDispararImpresion(certMock);
      
      setTimeout(() => {
        formCert.reset();
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        contenedorProductos.innerHTML = "";
        contadorProductos = 0;
        agregarFilaProducto();
        
        if (isEditMode) {
          isEditMode = false;
          currentEditingId = null;
          if (tituloPantalla) tituloPantalla.innerText = "Fumigadora Tecnoplagas - Nuevo Certificado Comercial";
          if (labelConsecutivo) labelConsecutivo.innerText = "Consecutivo / N° de Certificado";
          if (btnSubmit) {
            btnSubmit.classList.remove('modo-edicion');
            btnSubmit.innerHTML = "💾 Guardar e Imprimir Certificado Comercial";
          }
        }
      }, 1000);

    } catch (error) {
      console.error(error);
      alert("❌ Ocurrió un error al guardar: " + error.message);
    }
  });
}
