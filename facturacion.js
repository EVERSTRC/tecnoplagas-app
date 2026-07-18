// facturacion.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  query, 
  where, 
  orderBy, 
  Timestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Credenciales del proyecto vinculadas a Tecnoplagas
const firebaseConfig = {
  apiKey: "TU_API_KEY", // <-- REEMPLAZAR CON TU API KEY DE LA CONSOLA
  authDomain: "fumigadora-tecnoplagas.firebaseapp.com",
  projectId: "fumigadora-tecnoplagas",
  storageBucket: "fumigadora-tecnoplagas.firebasestorage.app",
  messagingSenderId: "510795344519",
  appId: "TU_APP_ID" // <-- REEMPLAZAR CON TU APP ID DE LA CONSOLA
};

// Inicialización de base de datos
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Selectores de Elementos UI
const form = document.getElementById('documento-form');
const selectCliente = document.getElementById('clienteRef');
const inputCantidad = document.getElementById('cantidad');
const inputPrecio = document.getElementById('precioUnitario');
const inputIva = document.getElementById('iva');

const lblSubtotalNeto = document.getElementById('lblSubtotalNeto');
const lblTotalImpuesto = document.getElementById('lblTotalImpuesto');
const lblTotalFactura = document.getElementById('lblTotalFactura');

const filtroTipo = document.getElementById('filtroTipo');
const btnFiltrar = document.getElementById('btn-filtrar');
const historialListado = document.getElementById('historial-listado');

// Memoria de mapeo para evitar lecturas recursivas innecesarias
let cacheClientes = {};

// Cargar listado de la colección "Clientes"
async function obtenerClientes() {
  try {
    const snapshot = await getDocs(collection(db, "Clientes"));
    selectCliente.innerHTML = '<option value="">-- Seleccione un Cliente --</option>';
    
    snapshot.forEach((snapshotDoc) => {
      const data = snapshotDoc.data();
      const id = snapshotDoc.id;
      cacheClientes[id] = data.nombre || 'Cliente sin Identificar';
      
      const itemOption = document.createElement('option');
      itemOption.value = id;
      itemOption.textContent = `${data.consecutivo || 'CLI-'} - ${data.nombre || id}`;
      selectCliente.appendChild(itemOption);
    });
  } catch (err) {
    console.error("Error al obtener Clientes de Firestore: ", err);
    selectCliente.innerHTML = '<option value="">Error al estructurar clientes</option>';
  }
}

// Procesar matemática financiera en tiempo real
function procesarCalculos() {
  const q = parseInt(inputCantidad.value) || 0;
  const precioU = parseFloat(inputPrecio.value) || 0;
  const tasaIva = parseFloat(inputIva.value) || 0;

  const subTotal = q * precioU;
  const subtotalNeto = subTotal; 
  const totalImpuesto = subtotalNeto * tasaIva;
  const totalFactura = subtotalNeto + totalImpuesto;

  lblSubtotalNeto.textContent = `$${subtotalNeto.toFixed(2)}`;
  lblTotalImpuesto.textContent = `$${totalImpuesto.toFixed(2)}`;
  lblTotalFactura.textContent = `$${totalFactura.toFixed(2)}`;

  return { subTotal, subtotalNeto, totalImpuesto, totalFactura };
}

// Vinculación de entradas reactivas
[inputCantidad, inputPrecio, inputIva].forEach(inputNode => {
  inputNode.addEventListener('input', procesarCalculos);
});

// Guardar en la base de datos nam5
form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const idDelCliente = selectCliente.value;
  if (!idDelCliente) {
    alert("Por favor, elija un cliente válido del listado.");
    return;
  }

  const mat = procesarCalculos();

  // Mapeo exacto respetando mayúsculas, minúsculas y tipos de datos del esquema de tu Firestore
  const documentoComercial = {
    "Cantidad": parseInt(inputCantidad.value),
    "Cliente": doc(db, "Clientes", idDelCliente), // Tipo: Reference
    "Condición de venta": document.getElementById('condicionVenta').value,
    "Consecutivo": document.getElementById('consecutivo').value,
    "Descripcion": document.getElementById('descripcion').value,
    "Fecha de Emision": Timestamp.now(), // Tipo: Timestamp
    "IVA": parseFloat(inputIva.value),
    "Medio de Pago": document.getElementById('medioPago').value,
    "Precio Unitario": parseFloat(inputPrecio.value),
    "SubTotal": mat.subTotal,
    "Subtotal Neto": mat.subtotalNeto,
    "Tipo de documento": document.getElementById('tipoDocumento').value,
    "Total Factura": mat.totalFactura,
    "Total Impuesto": mat.totalImpuesto
  };

  try {
    await addDoc(collection(db, "Facturacion"), documentoComercial);
    alert("Documento comercial registrado de manera exitosa.");
    form.reset();
    procesarCalculos();
    obtenerHistorial();
  } catch (err) {
    console.error("Error al persistir el registro en la colección: ", err);
    alert("Error interno al escribir en Firestore.");
  }
});

// Obtener e imprimir el Historial Financiero
async function obtenerHistorial() {
  historialListado.innerHTML = '<p style="text-align:center; color:#64748b;">Actualizando lista...</p>';
  const filtro = filtroTipo.value;
  
  try {
    let baseQuery = collection(db, "Facturacion");
    
    if (filtro !== "Todos") {
      baseQuery = query(baseQuery, where("Tipo de documento", "==", filtro));
    }
    
    const snap = await getDocs(baseQuery);
    
    if (snap.empty) {
      historialListado.innerHTML = '<p style="text-align:center; color:#64748b;">No existen registros que coincidan.</p>';
      return;
    }

    historialListado.innerHTML = '';
    
    snap.forEach((registroDoc) => {
      const data = registroDoc.data();
      const stiloBadge = data["Tipo de documento"] === "Factura" ? "badge-factura" : "badge-cotizacion";
      
      let formatoFecha = "Fecha no válida";
      if (data["Fecha de Emision"] && typeof data["Fecha de Emision"].toDate === 'function') {
        formatoFecha = data["Fecha de Emision"].toDate().toLocaleDateString('es-CR', {
          day: 'numeric', month: 'short', year: 'numeric'
        });
      }

      const refId = data["Cliente"] ? data["Cliente"].id : '';
      const stringCliente = cacheClientes[refId] || `ID de referencia: ${refId}`;

      const cardElement = document.createElement('div');
      cardElement.className = 'documento-card';
      cardElement.innerHTML = `
        <div class="doc-header">
          <span class="doc-consecutivo">${data["Consecutivo"] || 'S/N'}</span>
          <span class="badge-doc ${stiloBadge}">${data["Tipo de documento"]}</span>
        </div>
        <div class="doc-detalles"><strong>Cliente:</strong> ${stringCliente}</div>
        <div class="doc-detalles"><strong>Servicio:</strong> ${data["Descripcion"] || ''}</div>
        <div class="doc-detalles"><strong>Emisión:</strong> ${formatoFecha} | <strong>Condición:</strong> ${data["Condición de venta"] || ''}</div>
        <div class="doc-total">Total: $${(data["Total Factura"] || 0).toFixed(2)}</div>
      `;
      historialListado.appendChild(cardElement);
    });

  } catch (err) {
    console.error("Fallo al obtener el Historial Financiero: ", err);
    historialListado.innerHTML = '<p style="color:#ef4444; text-align:center;">Fallo en la comunicación con Firestore nam5.</p>';
  }
}

btnFiltrar.addEventListener('click', obtenerHistorial);

// Carga asíncrona inicial controlada
async function arrancarModulo() {
  await obtenerClientes();
  await obtenerHistorial();
}

arrancarModulo();
