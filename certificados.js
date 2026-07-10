// =========================================================================
// IMPORTACIONES DE FIREBASE
// =========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// CONFIGURACIÓN DE TU PROYECTO (Asegúrate de que coincida con tus credenciales)
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "fumigadora-tecnoplagas.firebaseapp.com",
  projectId: "fumigadora-tecnoplagas",
  storageBucket: "fumigadora-tecnoplagas.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

// Inicialización de Firebase y base de datos Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Almacenamiento local temporal de los productos descargados
let productosFirestore = {};

// =========================================================================
// 1. CARGA AUTOMÁTICA DE PRODUCTOS DESDE FIRESTORE EN EL SELECT
// =========================================================================
async function cargarProductosDesdeFirestore() {
  const selectProducto = document.getElementById('producto-utilizado');
  if (!selectProducto) {
    console.error("❌ Error: No existe el elemento con id 'producto-utilizado' en tu HTML.");
    return;
  }

  try {
    console.log("⏳ Consultando la colección 'Productos' en Firestore...");
    const querySnapshot = await getDocs(collection(db, "Productos"));
    
    if (querySnapshot.empty) {
      console.warn("⚠️ Advertencia: La colección 'Productos' está vacía.");
      return;
    }

    // Resetear el select con la opción inicial por defecto
    selectProducto.innerHTML = '<option value="">Seleccione el producto químico...</option>';
    productosFirestore = {}; 

    // Recorrer los documentos encontrados en Firestore
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const idDocumento = doc.id; // 'Cybor', 'Cynoff_EC', 'EKOSET_EC', etc.

      // Guardamos la información en el objeto global usando el ID como clave
      productosFirestore[idDocumento] = data;

      // Creamos la opción dentro del selector HTML
      const option = document.createElement('option');
      option.value = idDocumento;
      // Usamos la propiedad con espacios exactos de tu Firestore
      option.textContent = data["Nombre Comercial"] || idDocumento; 
      selectProducto.appendChild(option);
    });

    // Añadimos una opción para llenado completamente manual si fuera requerido
    const optionOtro = document.createElement('option');
    optionOtro.value = "Otro";
    optionOtro.textContent = "Otro (Manual)";
    selectProducto.appendChild(optionOtro);

    console.log("✅ Productos inyectados con éxito en el select:", Object.keys(productosFirestore));

  } catch (error) {
    console.error("❌ Error crítico al leer la tabla 'Productos': ", error);
  }
}

// =========================================================================
// 2. CONTROLADORES DE EVENTOS PRINCIPALES
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
  
  // Ejecutamos la carga inicial de los productos desde la nube
  cargarProductosDesdeFirestore();
  
  // Generar un código consecutivo automático si el campo id-certificado está vacío
  const inputIdCertificado = document.getElementById('id-certificado');
  if (inputIdCertificado && !inputIdCertificado.value) {
    inputIdCertificado.value = "CERT-" + Math.floor(100000 + Math.random() * 900000);
  }

  const selectProducto = document.getElementById('producto-utilizado');
  const formulario = document.getElementById('certificado-form');

  // --- ESCUCHAR EL CAMBIO EN EL SELECT DE PRODUCTOS ---
  if (selectProducto) {
    selectProducto.addEventListener('change', function() {
      const valorSeleccionado = this.value; // ID del documento seleccionado
      console.log("🔄 Cambio detectado en el select. Valor actual:", valorSeleccionado);
      
      // Captura de Inputs en el Formulario (Edición)
      const inputNombre = document.getElementById('form-prod-nombre');
      const inputActivo = document.getElementById('form-prod-activo');
      const inputMs = document.getElementById('form-prod-ms');
      const inputDosis = document.getElementById('form-prod-dosis');
      const inputLote = document.getElementById('form-prod-lote');
      const inputVence = document.getElementById('form-prod-vence');

      // Si el elemento seleccionado existe dentro de la base de datos descargada
      if (productosFirestore[valorSeleccionado]) {
        const prod = productosFirestore[valorSeleccionado];
        console.log("📦 Datos obtenidos de Firestore para este producto:", prod);
        
        // Extracción con corchetes respetando los nombres literales de tus columnas en Firebase
        const nombreComercial = prod["Nombre Comercial"] || valorSeleccionado;
        const ingredienteActivo = prod["Ingrediente Activo"] || "";
        const registroMs = prod["Registro M.S."] || "";
        const dosisRecomendada = prod["Dosis Recomendada"] || "";
        const numeroLote = prod["Lote"] || "";
        const fechaVencimiento = prod["Vencimiento del Producto"] || "";

        // Auto-llenado inmediato en las cajas de texto del Formulario
        if(inputNombre) inputNombre.value = nombreComercial;
        if(inputActivo) inputActivo.value = ingredienteActivo;
        if(inputMs) inputMs.value = registroMs;
        if(inputDosis) inputDosis.value = dosisRecomendada;
        if(inputLote) inputLote.value = numeroLote;
        if(inputVence) inputVence.value = fechaVencimiento;
        
        console.log("🎯 Inputs del formulario rellenados con éxito.");

      } else {
        // Si eligen 'Otro' o la opción vacía, limpiamos todo para escritura manual libre
        console.log("🧹 Limpiando los campos de producto.");
        const inputs = [inputNombre, inputActivo, inputMs, inputDosis, inputLote, inputVence];
        inputs.forEach(input => { if(input) input.value = ""; });
      }
    });
  }

  // --- PROCESAR GUARDADO EN BASE DE DATOS E IMPRESIÓN ---
  if (formulario) {
    formulario.addEventListener('submit', async (e) => {
      e.preventDefault(); // Detiene la recarga automática de la página

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

      // Valores finales capturados de los inputs técnicos antes de imprimir
      const prodNombre = document.getElementById('form-prod-nombre').value;
      const prodActivo = document.getElementById('form-prod-activo').value;
      const prodMs = document.getElementById('form-prod-ms').value;
      const prodDosis = document.getElementById('form-prod-dosis').value;
      const prodLote = document.getElementById('form-prod-lote').value;
      const prodVence = document.getElementById('form-prod-vence').value;

      // Modelo de datos estructurado para guardar en tu colección 'Certificados'
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
        console.log("💾 Almacenando certificado en Firestore...");
        await addDoc(collection(db, "Certificados"), nuevoCertificado);
        console.log("✅ Registro exitoso en la nube.");

        // TRASLADO DE DATOS DIRECTO A LA PLANTILLA DE IMPRESIÓN (PDF)
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

        // Inyección estricta en las celdas finales de la tabla técnica impresa
        document.getElementById('td-prod-nombre').textContent = prodNombre || "---";
        document.getElementById('td-prod-activo').textContent = prodActivo || "---";
        document.getElementById('td-prod-ms').textContent = prodMs || "---";
        document.getElementById('td-prod-dosis').textContent = prodDosis || "---";
        document.getElementById('td-prod-lote').textContent = prodLote || "---"; // Aquí forzamos que el lote se imprima correctamente
        document.getElementById('td-prod-vence').textContent = prodVence || "---";

        // Mapear visualmente las casillas de verificación simuladas en el PDF
        document.getElementById('chk-desinsectacion').textContent = objetivoControl === "Desinsectación" ? "(X) Desinsectación" : "( ) Desinsectación";
        document.getElementById('chk-desratizacion').textContent = objetivoControl === "Desratización" ? "(X) Desratización" : "( ) Desratización";
        document.getElementById('chk-sanitizacion').textContent = objetivoControl === "Sanitización" ? "(X) Sanitización" : "( ) Sanitización";

        document.getElementById('chk-aspersion').textContent = metodoAplicacion === "Aspersión" ? "(X) Aspersión" : "( ) Aspersión";
        document.getElementById('chk-cebo').textContent = metodoAplicacion === "Cebo Rodenticida" ? "(X) Cebo Rodenticida" : "( ) Cebo Rodenticida";
        document.getElementById('chk-termonebulizacion').textContent = metodoAplicacion === "Termonebulización" ? "(X) Termonebulización" : "( ) Termonebulización";

        // Renderizado del código QR Dinámico de validación
        const contenedorQR = document.getElementById("qrcode");
        if (contenedorQR) {
          contenedorQR.innerHTML = ""; // Limpiar cualquier QR residual anterior
          new QRCode(contenedorQR, {
            text: `https://everstrc.github.io/tecnoplagas-app/validar.html?id=${idCertificado}`,
            width: 80,
            height: 80,
            colorDark: "#0f172a",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
          });
        }

        // Breve pausa para asegurar la estabilidad del QR en el DOM antes de mandar a imprimir
        setTimeout(() => {
          window.print();
        }, 350);

      } catch (error) {
        console.error("❌ Error crítico en Firebase al procesar el envío: ", error);
        alert("Ocurrió un error al procesar y almacenar el certificado.");
      }
    });
  }
});
