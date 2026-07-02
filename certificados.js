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

// Almacén local de clientes y certificados en memoria para la tablet
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

// Genera un número único basado en la fecha y hora para evitar duplicados
function generarConsecutivo() {
  const ahora = new Date();
  const año = ahora.getFullYear().toString().slice(-2);
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  
  const consecutivo = `CERT-${año}${mes}${dia}-${random}`;
  const inputCert = document.getElementById("id-certificado");
  if (inputCert) inputCert.value = consecutivo;
}

// Jala tus clientes desde Firestore para el menú desplegable
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
    console.error("Error cargando clientes en el selector:", error);
  }
}

// LISTENER EN TIEMPO REAL: Carga el historial garantizando que fallos individuales no congelen la vista
function escucharHistorialCertificados() {
  try {
    const q = collection(db, "certificados");
    
    onSnapshot(q, (snapshot) => {
      certificadosHistorial = [];
      const tbody = document.getElementById("tabla-historial-body");
      
      if (!tbody) return;
      tbody.innerHTML = "";

      if (snapshot.empty) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748b; padding: 20px;">No hay certificados registrados aún.</td></tr>`;
        return;
      }

      // Mapeamos los documentos recibidos de forma segura
      snapshot.forEach((doc) => {
        const cert = doc.data();
        if (cert) {
          certificadosHistorial.push({ idFirestore: doc.id, ...cert });
        }
      });

      // Ordenar localmente (El más nuevo arriba)
      certificadosHistorial.sort((a, b) => {
        const fechaA = new Date(a.fechaCaptura || a.fechaServicio || 0);
        const fechaB = new Date(b.fechaCaptura || b.fechaServicio || 0);
        return fechaB - fechaA;
      });

      // Renderizar filas controlando strings vacíos o nulos
      certificadosHistorial.forEach((cert) => {
        const tr = document.createElement("tr");
        
        const idCert = cert.idCertificado || "---";
        const cliente = cert.clienteNombre || cert.nombreFantasia || "Sin Nombre";
        const fecha = cert.fechaServicio || "---";
        const quimico = cert.quimicoNombre || "---";

        tr.innerHTML = `
          <td style="font-weight: bold; color: #0f172a; padding: 12px; border-bottom: 1px solid #e2e8f0;">${idCert}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${cliente}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${fecha}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;"><span style="background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-size: 12px;">${quimico}</span></td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
            <button class="btn-reimprimir" data-id="${cert.idFirestore}" style="background-color: #00b074; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer;">
              🖨️ Re-Imprimir
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Vinculación dinámica a los botones verdes de re-impresión rápida
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
      console.error("Error en Snapshot Firestore:", error);
      const tbody = document.getElementById("tabla-historial-body");
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red; padding: 20px;">Error al conectar: ${error.message}</td></tr>`;
      }
    });
  } catch (err) {
    console.error("Error crítico en la función del historial:", err);
  }
}

// ==========================================
// 2. LÓGICA INTERACTIVA DEL FORMULARIO
// ==========================================
function configurarEventosFormulario() {
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

  const inputBuscar = document.getElementById("input-buscar");
  if (inputBuscar) {
    inputBuscar.addEventListener("input", (e) => {
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
  }

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
        fechaCaptura: new Date().toISOString()
      };

      try {
        await addDoc(collection(db, "certificados"), nuevoCertificado);
        alert("¡Certificado guardado con éxito!");
        prepararEImprimirHoja(nuevoCertificado);
        document.getElementById("certificado-form").reset();
        generarConsecutivo();
      } catch (error) {
        console.error("Error al salvar:", error);
        alert("Hubo un percance al guardar el certificado.");
      }
    });
  }
}

// ==========================================
// 3. GENERACIÓN DE QR E IMPRESIÓN PROFESIONAL
// ==========================================
function prepararEImprimirHoja(datos) {
  // Inyección segura del Consecutivo en el encabezado de impresión
  const elemNumCert = document.getElementById("print-num-cert");
  if (elemNumCert) {
    elemNumCert.textContent = datos.idCertificado;
  }
  
  // Rellenar datos de tablas horizontales de la hoja impresa
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

  // Marcar casillas (X) u ( ) correspondientes en Objetivos de Control
  document.getElementById("chk-desinsectacion").textContent = datos.objetivoControl === "Desinsectación" ? "(X) Desinsectación" : "( ) Desinsectación";
  document.getElementById("chk-desratizacion").textContent = datos.objetivoControl === "Desratización" ? "(X) Desratización" : "( ) Desratización";
  document.getElementById("chk-sanitizacion").textContent = datos.objetivoControl === "Sanitización" ? "(X) Sanitización" : "( ) Sanitización";

  // Marcar casillas (X) u ( ) correspondientes en Métodos de Aplicación
  document.getElementById("chk-aspersion").textContent = datos.metodoAplicacion === "Aspersión" ? "(X) Aspersión" : "( ) Aspersión";
  document.getElementById("chk-cebo").textContent = datos.metodoAplicacion === "Cebo Rodenticida" ? "(X) Cebo Rodenticida" : "( ) Cebo Rodenticida";
  document.getElementById("chk-termonebulizacion").textContent = datos.metodoAplicacion === "Termonebulización" ? "(X) Termonebulización" : "( ) Termonebulización";

  // --- CONSTRUCCIÓN REFORZADA DEL CÓDIGO QR ---
  const qrContainer = document.getElementById("qrcode");
  if (qrContainer) {
    qrContainer.innerHTML = ""; // Limpieza estricta anti-duplicados

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
Permiso Sanitario: ARSLU-3160-02-2025`;

    new QRCode(qrContainer, {
      text: stringContenidoQR,
      width: 100,
      height: 100,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }

  // Pequeña pausa para asegurar el correcto renderizado gráfico en la tablet antes de lanzar la impresión
  setTimeout(() => {
    window.print();
  }, 350);
}
