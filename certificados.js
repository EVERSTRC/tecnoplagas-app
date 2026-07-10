// =========================================================================
// IMPORTACIONES DE FIREBASE (Ajusta la inicialización si tu archivo de configuración es diferente)
// =========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// RECUERDA: Si ya exportas 'db' desde otro archivo (ej: firebase-config.js), puedes borrar este bloque de credenciales
// e importar directamente 'db' desde tu ruta. Si no, pega aquí tus credenciales de Firebase:
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "fumigadora-tecnoplagas.firebaseapp.com",
  projectId: "fumigadora-tecnoplagas",
  storageBucket: "fumigadora-tecnoplagas.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

// Inicializamos Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Variable global para almacenar los productos de Firestore temporalmente en memoria
let productosFirestore = {};

// =========================================================================
// 1. CARGAR PRODUCTOS DESDE FIRESTORE EN EL SELECT
// =========================================================================
async function cargarProductosDesdeFirestore() {
  const selectProducto = document.getElementById('producto-utilizado');
  if (!selectProducto) return;

  try {
    // Consulta a la colección 'Productos' vista en tu Firebase Console
    const querySnapshot = await getDocs(collection(db, "Productos"));
    
    // Reseteamos el selector dejando solo la opción inicial por defecto
    selectProducto.innerHTML = '<option value="">Seleccione el producto químico...</option>';
    productosFirestore = {}; 

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const idDocumento = doc.id; // 'Cybor', 'Cynoff_EC', 'EKOSET_EC', 'Fingen', etc.

      // Guardamos la información mapeada usando el ID del documento como llave
      productosFirestore[idDocumento] = data;

      // Creamos la opción HTML dinámicamente
      const option = document.createElement('option');
      option.value = idDocumento;
      // Muestra el campo 'nombre' interno, de lo contrario muestra el ID del documento
      option.textContent = data.nombre || idDocumento; 
      selectProducto.appendChild(option);
    });

    // Agregamos al final la opción para flujos extraordinarios o manuales
    const optionOtro = document.createElement('option');
    optionOtro.value = "Otro";
    optionOtro.textContent = "Otro (Manual)";
    selectProducto.appendChild(optionOtro);

    console.log("✅ Colección 'Productos' cargada de manera exitosa.");

  } catch (error) {
    console.error("❌ Error al leer los productos de Firestore: ", error);
  }
}

// =========================================================================
// 2. ESCUCHADORES DE EVENTOS PRINCIPALES (DOM CONTENT LOADED)
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
  
  // Ejecutamos la carga inicial de los productos químicos de la base de datos
  cargarProductosDesdeFirestore();
  
  // Generamos un número consecutivo automático temporal si el campo está vacío
  const inputIdCertificado = document.getElementById('id-certificado');
  if (inputIdCertificado && !inputIdCertificado.value) {
    inputIdCertificado.value = "CERT-" + Math.floor(100000 + Math.random() * 900000);
  }

  const selectProducto = document.getElementById('producto-utilizado');
  const formulario = document.getElementById('certificado-form');

  // --- EVENTO: CAMBIO DE PRODUCTO QUÍMICO ---
  if (selectProducto) {
    selectProducto.addEventListener('change', function() {
      const valorSeleccionado = this.value;
      
      // Captura de Inputs del Formulario (Edición)
      const inputNombre = document.getElementById('form-prod-nombre');
      const inputActivo = document.getElementById('form-prod-activo');
      const inputMs = document.getElementById('form-prod-ms');
      const inputDosis = document.getElementById('form-prod-dosis');
      const inputLote = document.getElementById('form-prod-lote');
      const inputVence = document.getElementById('form-prod-vence');

      // Si seleccionó un producto válido que exista en Firestore
      if (productosFirestore[valorSeleccionado]) {
        const prod = productosFirestore[valorSeleccionado];
        
        // Extraemos las variables validando posibles variaciones de nombres de campos
        const nombreComercial = prod.nombre || valorSeleccionado;
        const ingredienteActivo = prod.activo || "---";
        const registroMs = prod.registro_ms || prod.ms || "---";
        const dosisRecomendada = prod.dosis || "---";
        const numeroLote = prod.lote || "---";
        const fechaVencimiento = prod.vencimiento || prod.vence || "---";

        // Asignamos los valores a los cuadros de texto del formulario
        if(inputNombre) inputNombre.value = nombreComercial;
        if(inputActivo) inputActivo.value = ingredienteActivo;
        if(inputMs) inputMs.value = registroMs;
        if(inputDosis) inputDosis.value = dosisRecomendada;
        if(inputLote) inputLote.value = numeroLote;
        if(inputVence) inputVence.value = fechaVencimiento;

      } else {
        // Si selecciona 'Otro' o 'Seleccione...', limpiamos los controles para escritura libre
        const inputs = [inputNombre, inputActivo, inputMs, inputDosis, inputLote, inputVence];
        inputs.forEach(input => { if(input) input.value = ""; });
      }
    });
  }

  // --- EVENTO: GUARDAR E IMPRIMIR CERTIFICADO ---
  if (formulario) {
    formulario.addEventListener('submit', async (e) => {
      e.preventDefault(); // Evitamos que la página se recargue

      // Recopilación completa de variables desde el formulario
      const idCertificado = document.getElementById('id-certificado').value;
      const selectCliente = document.getElementById('select-cliente');
      const clienteNombre = selectCliente ? selectCliente.options[selectCliente.selectedIndex].text : "---";
      
      const nombreFantasia = document.getElementById('nombre-fantasia').value || "N/A";
      const cabezal = document.getElementById('cabezal').value || "N/A";
      const remolque = document.getElementById('remolque').value || "N/A";
      
      const fechaServicio = document.getElementById('fecha-servicio').value;
      const servicioValido = document.getElementById('servicio-valido').value;
      const horaInicio = document.getElementById('hora-inicio').value;
      const horaFinalizacion = document.getElementById('hora-finalizacion').value;
      
      const tipoServicio = document.getElementById('tipo-servicio').value;
      const objetivoControl = document.getElementById('objetivo-control').value;
      const metodoAplicacion = document.getElementById('metodo-aplicacion').value;
      const plagasControla = document.getElementById('plagas-controla').value;

      // Datos de la Ficha Técnica Química
      const prodNombre = document.getElementById('form-prod-nombre').value;
      const prodActivo = document.getElementById('form-prod-activo').value;
      const prodMs = document.getElementById('form-prod-ms').value;
      const prodDosis = document.getElementById('form-prod-dosis').value;
      const prodLote = document.getElementById('form-prod-lote').value;
      const prodVence = document.getElementById('form-prod-vence').value;

      // 1. Objeto unificado listo para enviar a la colección 'Certificados'
      const nuevoCertificado = {
        idCertificado,
        clienteNombre,
        nombreFantasia,
        cabezal,
        remolque,
        fechaServicio,
        servicioValido,
        horaInicio,
        horaFinalizacion,
        tipoServicio,
        objetivoControl,
        metodoAplicacion,
        plagasControla,
        quimico: {
          nombre: prodNombre,
          activo: prodActivo,
          registroMs: prodMs,
          dosis: prodDosis,
          lote: prodLote,
          vencimiento: prodVence
        },
        fechaCreacion: new Date().toISOString()
      };

      try {
        // Guardamos de forma asíncrona en Cloud Firestore
        await addDoc(collection(db, "Certificados"), nuevoCertificado);
        console.log("✅ Certificado guardado con éxito en Firebase Firestore.");

        // 2. TRANSFERENCIA ABSOLUTA DE DATOS HACIA EL BLOQUE DE IMPRESIÓN (PDF)
        document.getElementById('print-cliente').textContent = clienteNombre;
        document.getElementById('print-fantasia').textContent = nombreFantasia;
        document.getElementById('print-cabezal').textContent = cabezal;
        document.getElementById('print-remolque').textContent = remolque;
        document.getElementById('print-fecha').textContent = fechaServicio;
        document.getElementById('print-vence').textContent = servicioValido;
        document.getElementById('print-inicio').textContent = horaInicio;
        document.getElementById('print-fin').textContent = horaFinalizacion;
        document.getElementById('print-tipo').textContent = tipoServicio;
        document.getElementById('print-plagas').textContent = plagasControla;

        // Mapeo estricto de la tabla de especificación química en el PDF
        document.getElementById('td-prod-nombre').textContent = prodNombre || "---";
        document.getElementById('td-prod-activo').textContent = prodActivo || "---";
        document.getElementById('td-prod-ms').textContent = prodMs || "---";
        document.getElementById('td-prod-dosis').textContent = prodDosis || "---";
        document.getElementById('td-prod-lote').textContent = prodLote || "---"; // Aquí forzamos la actualización del lote
        document.getElementById('td-prod-vence').textContent = prodVence || "---";

        // Ajuste dinámico visual para los recuadros de verificación (Checkboxes simulados)
        document.getElementById('chk-desinsectacion').textContent = objetivoControl === "Desinsectación" ? "(X) Desinsectación" : "( ) Desinsectación";
        document.getElementById('chk-desratizacion').textContent = objetivoControl === "Desratización" ? "(X) Desratización" : "( ) Desratización";
        document.getElementById('chk-sanitizacion').textContent = objetivoControl === "Sanitización" ? "(X) Sanitización" : "( ) Sanitización";

        document.getElementById('chk-aspersion').textContent = metodoAplicacion === "Aspersión" ? "(X) Aspersión" : "( ) Aspersión";
        document.getElementById('chk-cebo').textContent = metodoAplicacion === "Cebo Rodenticida" ? "(X) Cebo Rodenticida" : "( ) Cebo Rodenticida";
        document.getElementById('chk-termonebulizacion').textContent = metodoAplicacion === "Termonebulización" ? "(X) Termonebulización" : "( ) Termonebulización";

        // 3. GENERACIÓN DEL CÓDIGO QR AUTOMÁTICO
        const contenedorQR = document.getElementById("qrcode");
        if (contenedorQR) {
          contenedorQR.innerHTML = ""; // Limpiamos QR previo
          // El código QR apuntará a la validación de este ID de certificado único
          new QRCode(contenedorQR, {
            text: `https://everstrc.github.io/tecnoplagas-app/validar.html?id=${idCertificado}`,
            width: 80,
            height: 80,
            colorDark: "#0f172a",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
          });
        }

        // Pequeña pausa de milisegundos para garantizar la renderización estable del QR e iniciar impresión
        setTimeout(() => {
          window.print();
        }, 350);

      } catch (error) {
        console.error("❌ Error crítico al intentar guardar en Firestore: ", error);
        alert("Ocurrió un inconveniente al almacenar los datos. Por favor verifique la conexión.");
      }
    });
  }
});
