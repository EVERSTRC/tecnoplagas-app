// certificados.js
// IMPORTANTE: Asegúrate de tener configurado e inicializado Firebase en tu proyecto 
// o adapta las referencias de 'db' según el método de persistencia que utilices.
import { db } from './firebase-config.js'; // Ajusta la ruta según tu arquitectura
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  query, 
  orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Variables Globales de Estado
let modoEdicion = false;
let idDocumentoEdicion = null;
let listaClientes = [];
let listaProductos = [];
let qrInstancia = null;

// selectores de Elementos del DOM
const form = document.getElementById('certificado-form');
const idCertificadoInput = document.getElementById('id-certificado');
const selectCliente = document.getElementById('select-cliente');
const selectProducto = document.getElementById('producto-utilizado');
const tablaHistorialBody = document.getElementById('tabla-historial-body');
const inputBuscar = document.getElementById('input-buscar');

// Campos de la Ficha Técnica Automática
const formProdNombre = document.getElementById('form-prod-nombre');
const formProdActivo = document.getElementById('form-prod-activo');
const formProdMs = document.getElementById('form-prod-ms');
const formProdDosis = document.getElementById('form-prod-dosis');
const formProdLote = document.getElementById('form-prod-lote');
const formProdVence = document.getElementById('form-prod-vence');
const plagasControlaInput = document.getElementById('plagas-controla');

// Inicialización del Módulo
document.addEventListener('DOMContentLoaded', async () => {
    inicializarFechasPorDefecto();
    await cargarDatosIniciales();
    await cargarHistorial();
    configurarEventos();
});

// 1. CONFIGURACIÓN INICIAL Y DATOS
function inicializarFechasPorDefecto() {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    
    document.getElementById('fecha-servicio').value = `${yyyy}-${mm}-${dd}`;
    
    // Vencimiento por defecto (3 meses después)
    const vencimiento = new Date();
    vencimiento.setMonth(vencimiento.getMonth() + 3);
    const vYyyy = vencimiento.getFullYear();
    const vMm = String(vencimiento.getMonth() + 1).padStart(2, '0');
    const vDd = String(vencimiento.getDate()).padStart(2, '0');
    document.getElementById('servicio-valido').value = `${vYyyy}-${vMm}-${vDd}`;
    
    // Generar un ID temporal para visualización si es nuevo
    if (!modoEdicion) {
        idCertificadoInput.value = 'TP-' + Math.floor(100000 + Math.random() * 900000);
    }
}

async function cargarDatosIniciales() {
    try {
        // Ejemplo de Carga de Clientes desde Firestore
        const queryClientes = await getDocs(collection(db, "clientes"));
        selectCliente.innerHTML = '<option value="">Seleccione un cliente...</option>';
        listaClientes = [];
        queryClientes.forEach((doc) => {
            const data = doc.data();
            listaClientes.push({ id: doc.id, ...data });
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = data.razonSocial || data.nombre;
            selectCliente.appendChild(option);
        });

        // Ejemplo de Carga de Productos desde Firestore
        const queryProductos = await getDocs(collection(db, "productos"));
        selectProducto.innerHTML = '<option value="">Seleccione el producto químico...</option>';
        listaProductos = [];
        queryProductos.forEach((doc) => {
            const data = doc.data();
            listaProductos.push({ id: doc.id, ...data });
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = data.nombreComercial;
            selectProducto.appendChild(option);
        });
    } catch (error) {
        console.error("Error cargando datos iniciales:", error);
    }
}

function configurarEventos() {
    // Escuchar el cambio de producto para auto-rellenar los campos técnicos
    selectProducto.addEventListener('change', (e) => {
        const prodId = e.target.value;
        const productoSelected = listaProductos.find(p => p.id === prodId);
        
        if (productoSelected) {
            formProdNombre.value = productoSelected.nombreComercial || '';
            formProdActivo.value = productoSelected.ingredienteActivo || '';
            formProdMs.value = productoSelected.registroMS || '';
            formProdDosis.value = productoSelected.dosisRecomendada || '';
            formProdVence.value = productoSelected.vencimiento || '';
            if(productoSelected.plagasControla) {
                plagasControlaInput.value = productoSelected.plagasControla;
            }
        } else {
            limpiarCamposProducto();
        }
    });

    // Control de Filtro/Búsqueda en Historial
    inputBuscar.addEventListener('input', (e) => {
        const termino = e.target.value.toLowerCase();
        const filas = tablaHistorialBody.querySelectorAll('tr');
        
        filas.forEach(fila => {
            const textoFila = fila.textContent.toLowerCase();
            if(textoFila.includes(termino)) {
                fila.style.display = '';
            } else {
                fila.style.display = 'none';
            }
        });
    });

    // Envío del Formulario (Guardar / Actualizar)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!form.checkValidity()) {
            alert('Por favor, complete todos los campos requeridos del formulario.');
            return;
        }
        await guardarCertificado();
    });
}

function limpiarCamposProducto() {
    formProdNombre.value = '';
    formProdActivo.value = '';
    formProdMs.value = '';
    formProdDosis.value = '';
    formProdLote.value = '';
    formProdVence.value = '';
    plagasControlaInput.value = '';
}

// 2. LÓGICA DE PERSISTENCIA (GUARDAR Y EDITAR)
async function guardarCertificado() {
    // Recopilar Checkboxes
    const tiposServicio = Array.from(document.querySelectorAll('input[name="tipo-servicio"]:checked')).map(el => el.value);
    const objetivosControl = Array.from(document.querySelectorAll('input[name="objetivo-control"]:checked')).map(el => el.value);
    const metodosAplicacion = Array.from(document.querySelectorAll('input[name="metodo-aplicacion"]:checked')).map(el => el.value);

    const certificadoData = {
        numCertificado: idCertificadoInput.value,
        clienteId: selectCliente.value,
        nombreFantasia: document.getElementById('nombre-fantasia').value,
        cabezal: document.getElementById('cabezal').value || 'N/A',
        remolque: document.getElementById('remolque').value || 'N/A',
        fechaServicio: document.getElementById('fecha-servicio').value,
        servicioValido: document.getElementById('servicio-valido').value,
        horaInicio: document.getElementById('hora-inicio').value,
        horaFinalizacion: document.getElementById('hora-finalizacion').value,
        tiposServicio,
        objetivosControl,
        metodosAplicacion,
        productoId: selectProducto.value,
        plagasControla: plagasControlaInput.value,
        productoNombre: formProdNombre.value,
        productoActivo: formProdActivo.value,
        productoMs: formProdMs.value,
        productoDosis: formProdDosis.value,
        productoLote: formProdLote.value || 'N/A',
        productoVence: formProdVence.value,
        fechaRegistro: new Date().toISOString()
    };

    try {
        if (modoEdicion && idDocumentoEdicion) {
            // Actualizar Documento Existente
            const docRef = doc(db, "certificados", idDocumentoEdicion);
            await updateDoc(docRef, certificadoData);
            alert('¡Certificado actualizado con éxito!');
        } else {
            // Crear Nuevo Documento
            await addDoc(collection(db, "certificados"), certificadoData);
            alert('¡Certificado guardado con éxito!');
        }

        // Preparar Datos en el área oculta de impresión e imprimir automáticamente
        prepararVistaImpresion(certificadoData);
        window.print();

        // Resetear Formulario al estado original
         resetFormulario();
        await cargarHistorial();
    } catch (error) {
        console.error("Error al procesar el certificado: ", error);
        alert('Hubo un error al guardar los datos.');
    }
}

function resetFormulario() {
    form.reset();
    modoEdicion = false;
    idDocumentoEdicion = null;
    document.querySelector('.titulo-modulo').textContent = "Fumigadora Tecnoplagas - Nuevo Certificado";
    document.querySelector('.btn-submit').innerHTML = "💾 Guardar e Imprimir Certificado";
    inicializarFechasPorDefecto();
}

// 3. CARGA HISTORIAL Y ENLACE DE ACCIONES (IMPRIMIR / EDITAR)
async function cargarHistorial() {
    try {
        const q = query(collection(db, "certificados"), orderBy("fechaRegistro", "desc"));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            tablaHistorialBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">No hay certificados registrados.</td></tr>`;
            return;
        }

        tablaHistorialBody.innerHTML = '';
        
        snapshot.forEach((documento) => {
            const data = documento.data();
            const docId = documento.id;
            
            // Buscar el nombre del cliente basado en la lista en caché
            const cliente = listaClientes.find(c => c.id === data.clienteId);
            const nombreCliente = cliente ? (cliente.razonSocial || cliente.nombre) : 'Cliente No Encontrado';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${data.numCertificado}</strong></td>
                <td>${nombreCliente} ${data.nombreFantasia ? `(${data.nombreFantasia})` : ''}</td>
                <td>${data.fechaServicio}</td>
                <td>${data.productoNombre || '---'}</td>
                <td>
                    <div class="actions-wrapper">
                        <button class="btn-print" data-id="${docId}">🖨️ Reimprimir</button>
                        <button class="btn-edit" data-id="${docId}">✏️ Editar</button>
                    </div>
                </td>
            `;

            // Agregar los listeners de eventos para los botones dinámicos
            tr.querySelector('.btn-print').addEventListener('click', () => reimprimirCertificado(docId));
            tr.querySelector('.btn-edit').addEventListener('click', () => cargarParaEditar(docId));

            tablaHistorialBody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error al cargar historial:", error);
        tablaHistorialBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Error al sincronizar historial.</td></tr>`;
    }
}

// 4. ACCIÓN: CARGAR DATOS PARA EDICIÓN
async function cargarParaEditar(docId) {
    try {
        const docRef = doc(db, "certificados", docId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            alert("El certificado seleccionado ya no existe.");
            return;
        }

        const data = docSnap.data();
        
        // Activar banderas de edición
        modoEdicion = true;
        idDocumentoEdicion = docId;

        // Cambiar títulos visuales de la interfaz
        document.querySelector('.titulo-modulo').textContent = `✏️ Editando Certificado: ${data.numCertificado}`;
        document.querySelector('.btn-submit').innerHTML = "💾 Actualizar e Imprimir Cambios";

        // Mapear campos simples al formulario
        idCertificadoInput.value = data.numCertificado;
        selectCliente.value = data.clienteId;
        document.getElementById('nombre-fantasia').value = data.nombreFantasia || '';
        document.getElementById('cabezal').value = data.cabezal || '';
        document.getElementById('remolque').value = data.remolque || '';
        document.getElementById('fecha-servicio').value = data.fechaServicio;
        document.getElementById('servicio-valido').value = data.servicioValido;
        document.getElementById('hora-inicio').value = data.horaInicio;
        document.getElementById('hora-finalizacion').value = data.horaFinalizacion;
        
        // Ficha técnica del producto químico
        selectProducto.value = data.productoId || '';
        plagasControlaInput.value = data.plagasControla || '';
        formProdNombre.value = data.productoNombre || '';
        formProdActivo.value = data.productoActivo || '';
        formProdMs.value = data.productoMs || '';
        formProdDosis.value = data.productoDosis || '';
        formProdLote.value = data.productoLote || '';
        formProdVence.value = data.productoVence || '';

        // Desmarcar todos los checkboxes primero
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

        // Mapear Checkboxes Guardados
        if(data.tiposServicio) data.tiposServicio.forEach(val => marcarCheckbox('tipo-servicio', val));
        if(data.objetivosControl) data.objetivosControl.forEach(val => marcarCheckbox('objetivo-control', val));
        if(data.metodosAplicacion) data.metodosAplicacion.forEach(val => marcarCheckbox('metodo-aplicacion', val));

        // Redirigir la interfaz a la pestaña de Emisión/Formulario
        window.cambiarVista('emitir');
        
        // Scroll suave hacia la parte superior
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error("Error cargando documento para edición:", error);
        alert("Ocurrió un error al obtener la información del documento.");
    }
}

function marcarCheckbox(name, value) {
    const cb = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if(cb) cb.checked = true;
}

// 5. ACCIÓN: REIMPRIMIR DIRECTAMENTE DESDE EL HISTORIAL
async function reimprimirCertificado(docId) {
    try {
        const docRef = doc(db, "certificados", docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            prepararVistaImpresion(docSnap.data());
            // Pequeña pausa para asegurar la renderización del código QR
            setTimeout(() => {
                window.print();
            }, 300);
        } else {
            alert("No se encontró el documento para imprimir.");
        }
    } catch (error) {
        console.error("Error al reimprimir:", error);
    }
}

// 6. RENDERIZACIÓN EXCLUSIVA PARA EL PDF / IMPRESIÓN
function prepararVistaImpresion(data) {
    // Buscar datos completos del cliente para la dirección
    const cliente = listaClientes.find(c => c.id === data.clienteId);
    
    // Inyectar textos básicos
    document.getElementById('print-cliente').textContent = cliente ? (cliente.razonSocial || cliente.nombre) : '---';
    document.getElementById('print-direccion').textContent = cliente ? (cliente.direccion || 'No especificada') : '---';
    document.getElementById('print-fantasia').textContent = data.nombreFantasia || 'N/A';
    document.getElementById('print-num-cert').textContent = data.numCertificado;
    
    document.getElementById('print-fecha').textContent = data.fechaServicio;
    document.getElementById('print-vence').textContent = data.servicioValido;
    document.getElementById('print-inicio').textContent = data.horaInicio;
    document.getElementById('print-fin').textContent = data.horaFinalizacion;
    
    document.getElementById('print-tipo').textContent = data.tiposServicio ? data.tiposServicio.join(', ') : '---';
    document.getElementById('print-cabezal').textContent = data.cabezal;
    document.getElementById('print-remolque').textContent = data.remolque;
    document.getElementById('print-plagas').textContent = data.plagasControla || 'Control general de plagas';

    // Ficha de Producto en Impresión
    document.getElementById('td-prod-nombre').textContent = data.productoNombre;
    document.getElementById('td-prod-activo').textContent = data.productoActivo;
    document.getElementById('td-prod-ms').textContent = data.productoMs;
    document.getElementById('td-prod-lote').textContent = data.productoLote;
    document.getElementById('td-prod-dosis').textContent = data.productoDosis;
    document.getElementById('td-prod-vence').textContent = data.productoVence;

    // Renderizar Estados Visuales de los Checkboxes de la Tabla de Impresión
    gestionarCheckboxesImpresion('chk-desinsectacion', data.objetivosControl, 'Desinsectación');
    gestionarCheckboxesImpresion('chk-desratizacion', data.objetivosControl, 'Desratización');
    gestionarCheckboxesImpresion('chk-sanitizacion', data.objetivosControl, 'Sanitización');

    gestionarCheckboxesImpresion('m-aspersion', data.metodosAplicacion, 'Aspersión');
    gestionarCheckboxesImpresion('m-termonebulizacion', data.metodosAplicacion, 'Termonebulización');
    gestionarCheckboxesImpresion('m-nebulizacion-frio', data.metodosAplicacion, 'Nebulización en frío');
    gestionarCheckboxesImpresion('m-lami-gomosa', data.metodosAplicacion, 'Lami gomosa');
    gestionarCheckboxesImpresion('m-prod-granulado', data.metodosAplicacion, 'Prod granulado');
    gestionarCheckboxesImpresion('m-cebo-roedores', data.metodosAplicacion, 'Cebo para roedores');
    gestionarCheckboxesImpresion('m-trampa-mecanica', data.metodosAplicacion, 'Trampa mecánica');
    gestionarCheckboxesImpresion('m-prod-gel', data.metodosAplicacion, 'Aplic de prod en gel');
    gestionarCheckboxesImpresion('m-gas-fumigeno', data.metodosAplicacion, 'Aplic de Gas Fumígeno');
    gestionarCheckboxesImpresion('m-prod-polvo', data.metodosAplicacion, 'Aplic de prod en Polvo');

    // Generación del código QR de Autenticidad
    const contenedorQR = document.getElementById('qrcode');
    contenedorQR.innerHTML = ''; // Limpiar QR anterior
    
    // URL de validación (apunta a tu sistema de verificación)
    const urlValidacion = `https://tecnoplagascrc.com/validar?cert=${data.numCertificado}`;

    qrInstancia = new QRCode(contenedorQR, {
        text: urlValidacion,
        width: 75,
        height: 75,
        colorDark : "#0f172a",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
}

function gestionarCheckboxesImpresion(elementId, arregloValores, stringBuscar) {
    const elemento = document.getElementById(elementId);
    if (!elemento) return;
    
    if (arregloValores && arregloValores.includes(stringBuscar)) {
        elemento.innerHTML = `<strong>[X] ${stringBuscar}</strong>`;
        elemento.style.color = '#0f172a';
    } else {
        elemento.innerHTML = `[ ] ${stringBuscar}`;
        elemento.style.color = '#94a3b8'; // Texto atenuado si no se aplicó
    }
}
