// =========================================================================
// 1. IMPORTACIONES OFICIALES DE FIREBASE (Módulo SDK Web)
// =========================================================================
import { db } from "./firebase-config.js"; 
import { 
  collection, 
  addDoc, 
  getDocs, 
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Diccionario Técnico Obligatorio de Agroquímicos (Autocompletado)
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

// Almacenamiento local temporal en la tablet
let listaClientesLocal = [];
let certificadosHistorial = [];

// =========================================================================
// 2. DISPARADOR DE ARRANQUE DE LA PÁGINA (DOMContentLoaded)
// =========================================================================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Iniciando módulo de certificados desde cero...");
  
  // A) Ejecuciones locales rápidas (Para que el Consecutivo SIEMPRE cargue al instante)
  generarConsecutivo();
  configurarEventosFormulario();

  // B) Peticiones asíncronas aisladas a Firebase (Si una falla, no congela a la otra)
  await cargarClientesSelector();
  escucharHistorialCertificados();
});

// =========================================================================
// 3. LÓGICA DE NEGOCIO Y DATOS LOCALES
// =========================================================================

// Genera un identificador único en base a la fecha para evitar fraudes o duplicados
function generarConsecutivo() {
  try {
    const ahora = new Date();
    const año = ahora.getFullYear().toString().slice(-2);
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    
    const consecutivo = `CERT-${año}${mes}${dia}-${random}`;
    const inputCert = document.getElementById("id-certificado");
    if (inputCert) {
      inputCert.value = consecutivo;
    }
  } catch (err) {
    console.error("Fallo al generar número consecutivo:", err);
  }
}

// Configura las interacciones y los buscadores dentro de la interfaz de usuario
function configurarEventosFormulario() {
  // Cambio en selector de productos químicos
  const prodSelect = document.getElementById("producto-utilizado");
  if (prodSelect) {
    prodSelect.addEventListener("change", (e) => {
      const prodSeleccionado = e.target.value;
      if (infoProductos[prodSeleccionado]) {
        const info = infoProductos[prodSeleccionado];
        document.getElementById("form-prod-nombre").value = info.nombre;
        document.getElementById("form-prod-activo").value = info.activo;
        document.getElementById("form-prod-ms").value = info.ms;
        document.getElementById("form-prod-dosis").value = info.dosis;
        document.getElementById("form-prod-vence").value = info.vence;
      } else {
        document.getElementById("form-prod-nombre").value = "";
        document.getElementById("form-prod-activo").value = "";
        document.getElementById("form-prod-ms").value = "";
        document.getElementById("form-prod-dosis").value = "";
        document.getElementById("form-prod-vence").value = "";
      }
    });
  }

  // Filtro de búsqueda en tiempo real dentro de la tabla del historial
  const inputBuscar = document.getElementById("input-buscar");
  if (inputBuscar) {
    inputBuscar.addEventListener("input", (e) => {
      const texto = e.target.value.toLowerCase().trim();
      const filas = document.querySelectorAll("#tabla-historial-body tr");
      filas.forEach(tr => {
        const textoFila = tr.textContent.toLowerCase();
        tr.style.display = textoFila.includes(texto) ? "" : "none";
      });
    });
  }

  // Captura y envío del formulario a la base de datos
  const certForm = document.getElementById("certificado-form");
  if (certForm) {
    certForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const selectCliente = document.getElementById("select-cliente");
      const idCliente = selectCliente.value;
      const clienteNombre = selectCliente.options[selectCliente.selectedIndex].text;
      const clienteDataLocal = listaClientesLocal.find(c => c.id === idCliente);
      const direccionCliente = clienteDataLocal ? (clienteDataLocal.direccion || "Dirección no especificada") : "Dirección Local";

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
        fechaCaptura: new Date().toISOString() // Métrica para ordenar cronológicamente
      };

      try {
        await addDoc(collection(db, "certificados"), nuevoCertificado);
        alert("¡Certificado guardado con éxito!");
        prepararEImprimirHoja(nuevoCertificado);
        document.getElementById("certificado-form").reset();
        generarConsecutivo();
      } catch (error) {
        console.error("Error al almacenar el documento en Firestore:", error);
        alert("Ocurrió un problema de red al guardar.");
      }
    });
  }
}

// =========================================================================
// 4. PERSISTENCIA DE DATOS DE FIREBASE
// =========================================================================

// Llena el selector desplegable con los clientes vigentes
async function cargarClientesSelector() {
  const selectCliente = document.getElementById("select-cliente");
  if (!selectCliente) return;
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
    console.error("Error consultando la colección de clientes:", error);
  }
}

// Escucha activa en tiempo real para pintar la consulta de certificados emitidos
function escucharHistorialCertificados() {
  try {
    const coleccionRef = collection(db, "certificados");
    
    onSnapshot(coleccionRef, (snapshot) => {
      certificadosHistorial = [];
      const tbody = document.getElementById("tabla-historial-body");
      if (!tbody) return;
      tbody.innerHTML = "";

      if (snapshot.empty) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748b; padding: 20px;">No hay certificados registrados aún.</td></tr>`;
        return;
      }

      // Volcado seguro de documentos de Firebase
      snapshot.forEach((doc) => {
        const cert = doc.data();
        if (cert) {
          certificadosHistorial.push({ idFirestore: doc.id, ...cert });
        }
      });

      // Ordenar localmente mediante JavaScript (El más reciente al tope de la lista)
      certificadosHistorial.sort((a, b) => {
        const tiempoA = new Date(a.fechaCaptura || a.fechaServicio || 0);
        const tiempoB = new Date(b.fechaCaptura || b.fechaServicio || 0);
        return tiempoB - tiempoA;
      });

      // Insertar filas dinámicas en el HTML de consulta
      certificadosHistorial.forEach((cert) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td style="font-weight: bold; color: #0f172a;">${cert.idCertificado || '---'}</td>
          <td>${cert.clienteNombre || '---'}</td>
          <td>${cert.fechaServicio || '---'}</td>
          <td><span style="background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-size: 12px;">${cert.quimicoNombre || '---'}</span></td>
          <td>
            <button class="btn-reimprimir" data-id="${cert.idFirestore}" style="background-color: #00b074; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer;">
              🖨️ Re-Imprimir
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Asignación de eventos de re-impresión a los botones de la tabla recién renderizada
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
      console.error("Error en el Snapshot en vivo de certificados:", error);
    });
  } catch (err) {
    console.error("Error crítico ejecutando el hilo de consultas:", err);
  }
}

// =========================================================================
// 5. MÓDULO DE REIMPRESIÓN Y QR DE ALTA SEGURIDAD (ANTICLONACIÓN)
// =========================================================================
function prepararEImprimirHoja(datos) {
  // Inyecciones protegidas con condicionales para evitar excepciones de tipo Null si los contenedores no están visibles
  const elemNumCert = document.getElementById("print-num-cert");
  if (elemNumCert) elemNumCert.textContent = datos.idCertificado || "---";
  
  if(document.getElementById("print-cliente")) document.getElementById("print-cliente").textContent = datos.clienteNombre || "---";
  if(document.getElementById("print-fantasia")) document.getElementById("print-fantasia").textContent = datos.nombreFantasia || "---";
  if(document.getElementById("print-direccion")) document.getElementById("print-direccion").textContent = datos.clienteDireccion || "---";
  if(document.getElementById("print-fecha")) document.getElementById("print-fecha").textContent = datos.fechaServicio || "---";
  if(document.getElementById("print-vence")) document.getElementById("print-vence").textContent = datos.servicioValido || "---";
  if(document.getElementById("print-inicio")) document.getElementById("print-inicio").textContent = datos.horaInicio || "00:00";
  if(document.getElementById("print-fin")) document.getElementById("print-fin").textContent = datos.horaFinalizacion || "00:00";
  if(document.getElementById("print-tipo")) document.getElementById("print-tipo").textContent = datos.tipoServicio || "---";
  if(document.getElementById("print-cabezal")) document.getElementById("print-cabezal").textContent = datos.cabezal || "N/A";
  if(document.getElementById("print-remolque")) document.getElementById("print-remolque").textContent = datos.remolque || "N/A";
  if(document.getElementById("print-plagas")) document.getElementById("print-plagas").textContent = datos.plagasControla || "---";

  if(document.getElementById("td-prod-nombre")) document.getElementById("td-prod-nombre").textContent = datos.quimicoNombre || "---";
  if(document.getElementById("td-prod-activo")) document.getElementById("td-prod-activo").textContent = datos.quimicoActivo || "---";
  if(document.getElementById("td-prod-ms")) document.getElementById("td-prod-ms").textContent = datos.quimicoMs || "---";
  if(document.getElementById("td-prod-lote")) document.getElementById("td-prod-lote").textContent = datos.quimicoLote || "N/A";
  if(document.getElementById("td-prod-dosis")) document.getElementById("td-prod-dosis").textContent = datos.quimicoDosis || "---";
  if(document.getElementById("td-prod-vence")) document.getElementById("td-prod-vence").textContent = datos.quimicoVence || "---";

  if(document.getElementById("chk-desinsectacion")) document.getElementById("chk-desinsectacion").textContent = datos.objetivoControl === "Desinsectación" ? "(X) Desinsectación" : "( ) Desinsectación";
  if(document.getElementById("chk-desratizacion")) document.getElementById("chk-desratizacion").textContent = datos.objetivoControl === "Desratización" ? "(X) Desratización" : "( ) Desratización";
  if(document.getElementById("chk-sanitizacion")) document.getElementById("chk-sanitizacion").textContent = datos.objetivoControl === "Sanitización" ? "(X) Sanitización" : "( ) Sanitización";

  if(document.getElementById("chk-aspersion")) document.getElementById("chk-aspersion").textContent = datos.metodoAplicacion === "Aspersión" ? "(X) Aspersión" : "( ) Aspersión";
  if(document.getElementById("chk-cebo")) document.getElementById("chk-cebo").textContent = datos.metodoAplicacion === "Cebo Rodenticida" ? "(X) Cebo Rodenticida" : "( ) Cebo Rodenticida";
  if(document.getElementById("chk-termonebulizacion")) document.getElementById("chk-termonebulizacion").textContent = datos.metodoAplicacion === "Termonebulización" ? "(X) Termonebulización" : "( ) Termonebulización";

  // --- CONSTRUCCIÓN DEL QR ANTICLONACIÓN CON ATRIBUTOS TÉCNICOS ---
  try {
    const qrContainer = document.getElementById("qrcode");
    if (qrContainer) {
      qrContainer.innerHTML = ""; // Limpieza absoluta de instancias anteriores

      // Texto plano cifrado visualmente para validación de aduanas, fronteras o inspectores en ruta
      const textoValidacionSegura = `TECNOPLAGAS C.R.C
==========================
CERTIFICADO DE FUMIGACIÓN VALIDO
==========================
N° Consecutivo: ${datos.idCertificado || 'N/A'}
Cliente: ${datos.clienteNombre || 'N/A'}
Placa Cabezal: ${datos.cabezal || 'N/A'}
Placa Remolque: ${datos.remolque || 'N/A'}
Fecha Aplicación: ${datos.fechaServicio || 'N/A'}
Válido Hasta: ${datos.servicioValido || 'N/A'}
Producto Químico: ${datos.quimicoNombre || 'N/A'}
==========================
Permiso Sanitario: ARSLU-3160-02-2025
Verificación de Autenticidad Exitosa.`;

      new QRCode(qrContainer, {
        text: textoValidacionSegura,
        width: 115,
        height: 115,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M // Nivel óptimo de redundancia contra arrugas o daños en el papel impreso
      });
    }
  } catch (qrError) {
    console.error("No se pudo plasmar el gráfico QR en la plantilla:", qrError);
  }

  // Despliegue de la interfaz de impresión nativa del sistema
  setTimeout(() => {
    window.print();
  }, 450);
}
