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

// REEMPLAZA CON TUS CONFIGURACIONES REALES DE FIREBASE
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "tu-sender-id",
  appId: "tu-app-id"
};

// Inicializar Firebase y Firestore direccionado al nodo nam5
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Selectores del DOM
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

// Almacén local en memoria de clientes mapeados
let mapaClientes = {};

// 1. Cargar Clientes desde Firestore para el selector de referencias
async function cargarClientes() {
  try {
    const querySnapshot = await getDocs(collection(db, "Clientes"));
    selectCliente.innerHTML = '<option value="">-- Seleccione un Cliente --</option>';
    
    querySnapshot.forEach((docSnap) => {
      const datos = docSnap.data();
      const id = docSnap.id;
      mapaClientes[id] = datos.nombre || 'Cliente sin nombre';
      
      const option = document.createElement('option');
      option.value = id;
      // Muestra Consecutivo o Cédula si existen junto al nombre
      option.textContent = `${datos.consecutivo || ''} - ${datos.nombre || id}`;
      selectCliente.appendChild(option);
    });
  } catch (error) {
    console.error("Error cargando clientes de Firestore:", error);
    selectCliente.innerHTML = '<option value="">Error al cargar clientes</option>';
  }
}

// 2. Calcular montos financieros en vivo
function calcularMontos() {
  const cantidad = parseInt(inputCantidad.value) || 0;
  const precioUnitario = parseFloat(inputPrecio.value) || 0;
  const tasaIva = parseFloat(inputIva.value) || 0;

  const subTotal = cantidad * precioUnitario; // Subtotal bruto base
  const subtotalNeto = subTotal;              // Equivalente en este flujo estructurado
  const totalImpuesto = subtotalNeto * tasaIva;
  const totalFactura = subtotalNeto + totalImpuesto;

  // Renderizar etiquetas en pantalla
  lblSubtotalNeto.textContent = `$${subtotalNeto.toFixed(2)}`;
  lblTotalImpuesto.textContent = `$${totalImpuesto.toFixed(2)}`;
  lblTotalFactura.textContent = `$${totalFactura.toFixed(2)}`;

  return { subTotal, subtotalNeto, totalImpuesto, totalFactura };
}

// Escuchadores de eventos para recalcular en tiempo real
[inputCantidad, inputPrecio, inputIva].forEach(elem => {
  elem.addEventListener('input', calcularMontos);
});

// 3. Guardar el Documento Comercial en Firestore conforme a tu estructura de datos exacta
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const clienteId = selectCliente.value;
  if (!clienteId) {
    alert("Por favor selecciona un cliente válido.");
    return;
  }

  // Obtener cálculos financieros exactos
  const calculos = calcularMontos();

  // Armar el documento mapeando fielmente tus tipos de datos de Firestore
  const nuevoDocumento = {
    "Cantidad": parseInt(inputCantidad.value),
    "Cliente": doc(db, "Clientes", clienteId), // Tipo: Reference
    "Condición de venta": document.getElementById('condicionVenta').value,
    "Consecutivo": document.getElementById('consecutivo').value,
    "Descripcion": document.getElementById('descripcion').value,
    "Fecha de Emision": Timestamp.now(), // Tipo: Timestamp
    "IVA": parseFloat(inputIva.value),
    "Medio de Pago": document.getElementById('medioPago').value,
    "Precio Unitario": parseFloat(inputPrecio.value),
    "SubTotal": calculos.subTotal,
    "Subtotal Neto": calculos.subtotalNeto,
    "Tipo de documento": document.getElementById('tipoDocumento').value,
    "Total Factura": calculos.totalFactura,
    "Total Impuesto": calculos.totalImpuesto
  };

  try {
    // Almacena en la colección raíz de transacciones llamada 'Facturacion'
    await addDoc(collection(db, "Facturacion"), nuevoDocumento);
    alert("¡Registro guardado exitosamente en Firestore (nam5)!");
    form.reset();
    calcularMontos();
    cargarHistorial(); // Refrescar visualización del panel derecho
  } catch (error) {
    console.error("Error al guardar el documento comercial: ", error);
    alert("Hubo un error al guardar en la base de datos.");
  }
});

// 4. Consultar Historial con filtros dinámicos
async function cargarHistorial() {
  historialListado.innerHTML = '<p style="text-align:center;">Consultando base de datos...</p>';
  const tipoFiltrado = filtroTipo.value;
  
  try {
    let q = collection(db, "Facturacion");
    
    // Aplicar query condicional según lo seleccionado en la UI
    if (tipoFiltrado !== "Todos") {
      q = query(q, where("Tipo de documento", "==", tipoFiltrado));
    }
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      historialListado.innerHTML = '<p style="text-align:center; color:#64748b;">No se encontraron registros comerciales.</p>';
      return;
    }

    historialListado.innerHTML = '';
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const badgeClase = data["Tipo de documento"] === "Factura" ? "badge-factura" : "badge-cotizacion";
      
      // Conversión legible de Timestamp de Firestore
      let fechaTexto = "Fecha no disponible";
      if(data["Fecha de Emision"] && typeof data["Fecha de Emision"].toDate === 'function') {
        fechaTexto = data["Fecha de Emision"].toDate().toLocaleDateString('es-CR', {
          day: 'numeric', month: 'short', year: 'numeric'
        });
      }

      // Obtener el ID del cliente desde la referencia interna de Firestore
      const clienteIdRef = data["Cliente"] ? data["Cliente"].id : '';
      const nombreCliente = mapaClientes[clienteIdRef] || `ID Cliente: ${clienteIdRef}`;

      const card = document.createElement('div');
      card.className = 'documento-card';
      card.innerHTML = `
        <div class="doc-header">
          <span class="doc-consecutivo">${data["Consecutivo"] || 'SIN-NUM'}</span>
          <span class="badge-doc ${badgeClase}">${data["Tipo de documento"]}</span>
        </div>
        <div class="doc-detalles"><strong>Cliente:</strong> ${nombreCliente}</div>
        <div class="doc-detalles"><strong>Detalle:</strong> ${data["Descripcion"] || ''}</div>
        <div class="doc-detalles"><strong>Emisión:</strong> ${fechaTexto} | <strong>Pago:</strong> ${data["Medio de Pago"] || ''}</div>
        <div class="doc-total">Total: $${(data["Total Factura"] || 0).toFixed(2)}</div>
      `;
      historialListado.appendChild(card);
    });

  } catch (error) {
    console.error("Error al consultar el historial financiero: ", error);
    historialListado.innerHTML = '<p style="color:#ef4444; text-align:center;">Error al conectar con Firestore.</p>';
  }
}

// Asignar eventos de consulta e inicialización
btnFiltrar.addEventListener('click', cargarHistorial);

// Ciclo de carga inicial al abrir el sistema
async function inicializarModulo() {
  await cargarClientes(); // Obligatorio cargar primero para mapear referencias correctamente
  await cargarHistorial();
}

inicializarModulo();
