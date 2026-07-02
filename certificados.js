// Importamos la configuración de Firebase compartida de tu proyecto
import { db } from "./firebase-config.js"; 
import { 
  collection, 
  addDoc, 
  getDocs, 
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Diccionario Técnico de Agroquímicos (Auto-rellenado profesional)
const infoProductos = {
  "Finigen": {
    nombre: "Finigen",
    activo: "Cipermetrina + Acetamiprid",
    ms: "4113-P-902",
    dosis: "5-10 ml / Litro de Agua",
    vence: "Diciembre 2028"
  },
  "Ekoset": {
    nombre: "Ekoset",
    activo: "Deltametrina",
    ms: "3540-P-401",
    dosis: "10-15 ml / Litro de Agua",
    vence: "Octubre 2027"
  },
  "Cybor": {
    nombre: "Cybor 10 EA",
    activo: "Cipermetrina",
    ms: "2840-P-112",
    dosis: "10 ml / Litro de Agua",
    vence: "Agosto 2027"
  },
  "Cynoff": {
    nombre: "Cynoff 40 WP",
    activo: "Cipermetrina Zeta",
    ms: "1980-P-310",
    dosis: "20 gr / 5 Litros de Agua",
    vence: "Marzo 2028"
  }
};

// Almacén local de clientes y certificados en memoria para operaciones rápidas
let listaClientesLocal = [];
let certificadosHistorial = [];

// ==========================================
// 1. INICIALIZACIÓN Y CARGA DE DATOS
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  generarConsecutivo();
  await cargarClientesSelector();
  escucharHistorialCertificados();
  configurarEventosFormulario();
});

// Genera un número único basado en la fecha y hora para evitar duplicados en la tablet
function generarConsecutivo() {
  const ahora = new Date();
  const año = ahora.getFullYear().toString().slice(-2);
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000); // 4 dígitos aleatorios
  
  const consecutivo = `CERT-${año}${mes}${dia}-${random}`;
  document.getElementById("id-certificado").value = consecutivo;
}

// Jala tus clientes desde Firestore para el menú desplegable
async function cargarClientesSelector() {
  const selectCliente = document.getElementById("select-cliente");
  try {
    const querySnapshot = await getDocs(collection(db, "clientes"));
    selectCliente.innerHTML = '<option value="">Seleccione un cliente...</option>';
    listaClientesLocal = [];

    querySnapshot.forEach((doc) => {
      const datos = doc.data();
      const id = doc.id;
      listaClientesLocal.push({ id, ...datos });

      const option = document.createElement("option");
      option.value = id;
      option.textContent = datos.nombre || datos.razonSocial || "Cliente sin nombre";
      selectCliente.appendChild(option);
    });
  } catch (error) {
    console.error("Error cargando clientes en el selector:", error);
  }
}

// Listener en tiempo real optimizado sin necesidad de índices en Firebase
function escucharHistorialCertificados() {
  // Traemos la colección directamente para saltarnos la restricción de índices de ordenamiento
  const q = collection(db, "certificados");
  
  onSnapshot(q, (snapshot) => {
    certificadosHistorial = [];
    const tbody = document.getElementById("tabla-historial-body");
    tbody.innerHTML = "";

    if (snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748b; padding: 20px;">No hay certificados registrados aún.</td></tr>`;
      return;
    }

    // Almacenamos los elementos en bruto de Firestore
    snapshot.forEach((doc) => {
      const cert = doc.data();
      certificadosHistorial.push({ idFirestore: doc.id, ...cert });
    });

    // Ordenamos en local (el dispositivo cliente): El más reciente primero
    certificadosHistorial.sort((a, b) => {
      const fechaA = a.fechaCaptura ? new Date(a.fechaCaptura) : new Date(0);
      const fechaB = b.fechaCaptura ? new Date(b.fechaCaptura) : new Date(0);
      return fechaB - fechaA;
    });

    // Construimos la tabla dinámicamente con los datos seguros
    certificadosHistorial.forEach((cert) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight: bold; color: #0f172a;">${cert.idCertificado || 'N/A'}</td>
        <td>${cert.clienteNombre || 'Sin nombre'}</td>
        <td>${cert.fechaServicio || 'N/A'}</td>
        <td><span style="background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-size: 12px;">${cert.quimicoNombre || 'N/A'}</span></td>
        <td>
          <button class="btn-reimprimir" data-id="${cert.idFirestore}" style="background-color: #00b074; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer;">
            🖨️ Re-Imprimir
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Asignar eventos dinámicos a los botones verdes de re-impresión rápida
    document.querySelectorAll(".btn-reimprimir").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idBusqueda = e.target.getAttribute("data-id");
        const registroEncontrado = certificadosHistorial.find(c => c.idFirestore === idBusqueda);
        if (registroEncontrado) {
          prepararEImprimirHoja(registroEncontrado);
        }
      });
    });
  }, (error) => {
    console.error("Error en el listener en tiempo real de certificados:", error);
    document.getElementById("tabla-historial-body").innerHTML = 
      `<tr><td colspan="5" style="text-align: center; color: red; padding: 20px;">Error de red o permisos: ${error.message}</td></tr>`;
  });
}

// ==========================================
// 2. LÓGICA INTERACTIVA DEL FORMULARIO
// ==========================================
function configurarEventosFormulario() {
  // Relleno automático de la Ficha Química al cambiar el selector
  document.getElementById("producto-utilizado").addEventListener("change", (e) => {
    const prodSeleccionado = e.target.value;
    
    if (infoProductos[prodSeleccionado]) {
      const info = infoProductos[prodSeleccionado];
      document.getElementById("form-prod-nombre").value = info.nombre;
      document.getElementById("form-prod-activo").value = info.activo;
      document.getElementById("form-prod-ms").value = info.ms;
      document.getElementById("form-prod-dosis").value = info.dosis;
      document.getElementById("form-prod-vence").value = info.vence;
    } else {
      // Si selecciona "Otro (Manual)", limpia los campos para escritura libre
      document.getElementById("form-prod-nombre").value = "";
      document.getElementById("form-prod-activo").value = "";
      document.getElementById("form-prod-ms").value = "";
      document.getElementById("form-prod-dosis").value = "";
      document.getElementById("form-prod-vence").value = "";
    }
  });

  // Filtrado / Buscador en tiempo real del historial
  document.getElementById("input-buscar").addEventListener("input", (e) => {
    const texto = e.target.value.toLowerCase().trim();
    const filas = document.querySelectorAll("#tabla-historial-body tr");

    filas.forEach(tr => {
      const textoFila = tr.textContent.toLowerCase();
      if (textoFila.includes(texto)) {
        tr.style.display = "";
      } else {
        tr.style.display = "none";
      }
    });
  });

  // Evento Submit principal: Guarda en Firebase y manda a Imprimir
  document.getElementById("certificado-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const selectCliente = document.getElementById("select-cliente");
    const idCliente = selectCliente.value;
    const clienteNombre = selectCliente.options[selectCliente.selectedIndex].text;
    const clienteDataLocal = listaClientesLocal.find(c => c.id === idCliente);
    const direccionCliente = clienteDataLocal ? (clienteDataLocal.direccion || "Dirección no especificada") : "Dirección Local";

    // Empaquetamos todo el modelo de datos estructurado
    const nuevoCertificado = {
      idCertificado: document.getElementById("id-certificado").value,
      idCliente: idCliente,
      clienteNombre: clienteNombre,
      clienteDireccion: direccionCliente,
      nombreFantasia: document.getElementById("nombre-fantasia").value || clienteNombre,
      cabezal: document.getElementById("cabezal").value || "N/A",
      remolque: document.getElementById("remolque").value || "N/A",
      fechaServicio: document.getElementById("fecha-servicio").value,
      servicioValido: document.getElementById("servicio-valido").value,
      horaInicio: document.getElementById("hora-inicio").value,
      horaFinalizacion: document.getElementById("hora-finalizacion").value,
      tipoServicio: document.getElementById("tipo-servicio").value,
      objetivoControl: document.getElementById("objetivo-control").value,
      metodoAplicacion: document.getElementById("metodo-aplicacion").value,
      plagasControla: document.getElementById("plagas-controla").value,
      quimicoNombre: document.getElementById("form-prod-nombre").value,
      quimicoActivo: document.getElementById("form-prod-activo").value,
      quimicoMs: document.getElementById("form-prod-ms").value,
      quimicoDosis: document.getElementById("form-prod-dosis").value,
      quimicoLote: document.getElementById("form-prod-lote").value || "N/A",
      quimicoVence: document.getElementById("form-prod-vence").value,
      fechaCaptura: new Date().toISOString()
    };

    try {
      // 1. Subida segura a Firestore
      await addDoc(collection(db, "certificados"), nuevoCertificado);
      alert("¡Certificado guardado con éxito en la base de datos!");

      // 2. Disparador de Impresión Inmediata con QR Armado
      prepararEImprimirHoja(nuevoCertificado);

      // 3. Reset y Consecutivo nuevo listo para el siguiente camión/cliente
      document.getElementById("certificado-form").reset();
      generarConsecutivo();

    } catch (error) {
      console.error("Error al salvar el certificado:", error);
      alert("Hubo un percance al guardar. Verifique la conexión a internet.");
    }
  });
}

// ==========================================
// 3. GENERACIÓN DE QR E IMPRESIÓN PROFESIONAL
// ==========================================
function prepararEImprimirHoja(datos) {
  // Inyección segura de variables en las etiquetas del documento impreso
  // Si el elemento 'print-num-cert' existe en el encabezado, le inyectamos el ID
  const elemNumCert = document.getElementById("print-num-cert");
  if (elemNumCert) {
    elemNumCert.textContent = datos.idCertificado;
  }
  
  document.getElementById("print-cliente").textContent = datos.clienteNombre || "---";
  document.getElementById("print-fantasia").textContent = datos.nombreFantasia || "---";
  document.getElementById("print-direccion").textContent = datos.clienteDireccion || "---";
  document.getElementById("print-fecha").textContent = datos.fechaServicio || "---";
  document.getElementById("print-vence").textContent = datos.servicioValido || "---";
  document.getElementById("print-inicio").textContent = datos.horaInicio || "00:00";
  document.getElementById("print-fin").textContent = datos.horaFinalizacion || "00:00";
  document.getElementById("print-tipo").textContent = datos.tipoServicio || "---";
  document.getElementById("print-cabezal").textContent = datos.cabezal || "N/A";
  document.getElementById("print-remolque").textContent = datos.remolque || "N/A";
  document.getElementById("print-plagas").textContent = datos.plagasControla || "---";

  document.getElementById("td-prod-nombre").textContent = datos.quimicoNombre || "---";
  document.getElementById("td-prod-activo").textContent = datos.quimicoActivo || "---";
  document.getElementById("td-prod-ms").textContent = datos.quimicoMs || "---";
  document.getElementById("td-prod-lote").textContent = datos.quimicoLote || "N/A";
  document.getElementById("td-prod-dosis").textContent = datos.quimicoDosis || "---";
  document.getElementById("td-prod-vence").textContent = datos.quimicoVence || "---";

  // Lógica de casillas de verificación simuladas (X) para Objetivos de Control
  document.getElementById("chk-desinsectacion").textContent = datos.objetivoControl === "Desinsectación" ? "(X) Desinsectación" : "( ) Desinsectación";
  document.getElementById("chk-desratizacion").textContent = datos.objetivoControl === "Desratización" ? "(X) Desratización" : "( ) Desratización";
  document.getElementById("chk-sanitizacion").textContent = datos.objetivoControl === "Sanitización" ? "(X) Sanitización" : "( ) Sanitización";

  // Lógica de casillas de verificación simuladas (X) para Métodos de Aplicación
  document.getElementById("chk-aspersion").textContent = datos.metodoAplicacion === "Aspersión" ? "(X) Aspersión" : "( ) Aspersión";
  document.getElementById("chk-cebo").textContent = datos.metodoAplicacion === "Cebo Rodenticida" ? "(X) Cebo Rodenticida" : "( ) Cebo Rodenticida";
  document.getElementById("chk-termonebulizacion").textContent = datos.metodoAplicacion === "Termonebulización" ? "(X) Termonebulización" : "( ) Termonebulización";

  // --- CONSTRUCCIÓN DEL QR CON TEXTO EXTRACTO COMPLETO AL ESCANEAR ---
  const qrContainer = document.getElementById("qrcode");
  qrContainer.innerHTML = ""; // Limpieza estricta de códigos de barras/QR previos

  const stringContenidoQR = `TECNOPLAGAS C.R.C
==========================
Certificado Oficial de Fumigación
N° Consecutivo: ${datos.idCertificado}
Cliente: ${datos.clienteNombre}
Fecha Aplicación: ${datos.fechaServicio}
Válido Hasta: ${datos.servicioValido}
Producto Químico: ${datos.quimicoNombre}
Placa Cabezal: ${datos.cabezal}
Placa Remolque: ${datos.remolque}
==========================
Permiso Sanitario: ARSLU-3160-02-2025
Verificado en Sistema Local.`;

  // Renderizado nativo del QR
  new QRCode(qrContainer, {
    text: stringContenidoQR,
    width: 100, // Dimensión perfecta para el pie de página horizontal
    height: 100,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H // Nivel H (Alto) previene fallos de lectura en cámaras de tablets
  });

  // Delay controlado de milisegundos para permitir al QR pintarse antes de abrir la interfaz de impresión
  setTimeout(() => {
    window.print();
  }, 350);
}
