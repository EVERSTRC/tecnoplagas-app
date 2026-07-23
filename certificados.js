/* ==========================================================================
   CERTIFICADOS.JS - Módulo de Gestión e Impresión
   ========================================================================== */

// Variable global para almacenar el listado de certificados en memoria
let listaCertificadosGlobal = [];

/**
 * Función principal para cargar la lista de certificados desde Supabase / BD
 */
async function cargarListaCertificados() {
  try {
    const contenedor = document.getElementById('lista-certificados');
    if (!contenedor) return;

    contenedor.innerHTML = '<p class="text-center text-muted">Cargando certificados...</p>';

    // Se asume la existencia del cliente 'supabaseClient' en el ámbito global
    if (typeof supabaseClient === 'undefined') {
      console.error("Error: supabaseClient no está definido.");
      contenedor.innerHTML = '<p class="text-center text-danger">Error al conectar con la base de datos.</p>';
      return;
    }

    const { data, error } = await supabaseClient
      .from('certificados')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    listaCertificadosGlobal = data || [];
    renderizarTablaCertificados(listaCertificadosGlobal);

  } catch (err) {
    console.error("Error cargando certificados:", err);
    const contenedor = document.getElementById('lista-certificados');
    if (contenedor) {
      contenedor.innerHTML = '<p class="text-center text-danger">Error al obtener la lista de certificados.</p>';
    }
  }
}

/**
 * Renderiza la tabla de certificados en el DOM
 */
function renderizarTablaCertificados(lista) {
  const contenedor = document.getElementById('lista-certificados');
  if (!contenedor) return;

  if (lista.length === 0) {
    contenedor.innerHTML = '<p class="text-center text-muted">No hay certificados registrados.</p>';
    return;
  }

  let html = `
    <div class="table-responsive">
      <table class="table table-hover align-middle">
        <thead class="table-dark">
          <tr>
            <th>Nº Cert.</th>
            <th>Cliente</th>
            <th>Fecha Emisión</th>
            <th>Vencimiento</th>
            <th>Plagas</th>
            <th class="text-end">Acciones</th>
          </tr>
        </thead>
        <tbody>
  `;

  lista.forEach(cert => {
    html += `
      <tr>
        <td><strong>${cert.id || '---'}</strong></td>
        <td>${cert.clienteNombre || '---'}</td>
        <td>${cert.fecha || '---'}</td>
        <td>${cert.vence || '---'}</td>
        <td><span class="badge bg-secondary">${cert.plagas || 'General'}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary me-1" onclick="imprimirCertificadoDesdeLista('${cert.id}')">
            🖨️ Imprimir
          </button>
          <button class="btn btn-sm btn-outline-dark" onclick="imprimirSoloQR('${cert.id}')">
            📱 Imprimir QR
          </button>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  contenedor.innerHTML = html;
}

/**
 * 1. IMPRIMIR SOLO QR (Corregido)
 * Aplica la clase 'print-qr-only' y la remueve usando 'afterprint'
 */
window.imprimirSoloQR = function(idCert) {
  const cert = listaCertificadosGlobal.find(c => c.id === idCert);
  if (!cert) {
    alert("No se encontró la información del certificado.");
    return;
  }

  const cliLimpio = (cert.clienteNombre || "Cliente")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .substring(0, 25);

  const urlBaseValidador = "https://everstrc.github.io/tecnoplagas-app/validar.html";
  const textoQrPublico = `${urlBaseValidador}?id=${encodeURIComponent(cert.id)}&cli=${encodeURIComponent(cliLimpio)}&cab=${encodeURIComponent(cert.cabezal)}&rem=${encodeURIComponent(cert.remolque)}&emi=${encodeURIComponent(cert.fecha)}&ven=${encodeURIComponent(cert.vence)}`;

  const qrContainerSolo = document.getElementById('qrcode-solo-container');
  if (qrContainerSolo) {
    qrContainerSolo.innerHTML = "";
    const InstanciaQRCode = window.QRCode || QRCode;
    if (typeof InstanciaQRCode !== 'undefined') {
      new InstanciaQRCode(qrContainerSolo, {
        text: textoQrPublico,
        width: 260,
        height: 260,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: InstanciaQRCode.CorrectLevel ? InstanciaQRCode.CorrectLevel.M : 1
      });
    }
  }

  // Desvinculamos listeners previos de afterprint
  window.onafterprint = null;

  // Marcamos el body para imprimir únicamente la sección de solo QR
  document.body.classList.add('print-qr-only');

  // Evento nativo: se activa únicamente al cerrar o confirmar el cuadro de impresión
  window.onafterprint = () => {
    document.body.classList.remove('print-qr-only');
    window.onafterprint = null;
  };

  // Breve retardo para permitir el renderizado del código QR en el DOM
  setTimeout(() => {
    window.print();
  }, 200);
};

/**
 * Disparador para imprimir certificado desde botón de tabla
 */
window.imprimirCertificadoDesdeLista = function(idCert) {
  const cert = listaCertificadosGlobal.find(c => c.id === idCert);
  if (!cert) {
    alert("Certificado no encontrado.");
    return;
  }
  prepararYDispararImpresion(cert);
};

/**
 * 2. IMPRIMIR CERTIFICADO COMPLETO (Corregido)
 * Rena datos en la plantilla HTML y dispara la impresión completa
 */
function prepararYDispararImpresion(cert) {
  try {
    // FORZAMOS la remoción de la clase por si quedó vinculada previamente
    document.body.classList.remove('print-qr-only');

    if (document.getElementById('print-num-cert')) document.getElementById('print-num-cert').innerText = cert.id || '---';
    if (document.getElementById('print-cliente')) document.getElementById('print-cliente').innerText = cert.clienteNombre || '---';
    if (document.getElementById('print-fantasia')) document.getElementById('print-fantasia').innerText = cert.fantasia || '---';
    if (document.getElementById('print-direccion')) document.getElementById('print-direccion').innerText = cert.direccion || '---';
    if (document.getElementById('print-fecha')) document.getElementById('print-fecha').innerText = cert.fecha || '---';
    if (document.getElementById('print-vence')) document.getElementById('print-vence').innerText = cert.vence || '---';
    if (document.getElementById('print-inicio')) document.getElementById('print-inicio').innerText = cert.horaInicio || '00:00';
    if (document.getElementById('print-fin')) document.getElementById('print-fin').innerText = cert.horaFin || '00:00';
    if (document.getElementById('print-tipo')) document.getElementById('print-tipo').innerText = cert.tipo || '---';
    if (document.getElementById('print-cabezal')) document.getElementById('print-cabezal').innerText = cert.cabezal || 'N/A';
    if (document.getElementById('print-remolque')) document.getElementById('print-remolque').innerText = cert.remolque || 'N/A';
    if (document.getElementById('print-plagas')) document.getElementById('print-plagas').innerText = cert.plagas || '---';

    // Rellenar Objetivos
    const contenedorObjetivos = document.getElementById('print-objetivos-elegidos');
    if (contenedorObjetivos) {
      contenedorObjetivos.innerHTML = "";
      const objTexto = cert.objetivo || "";
      if (objTexto && objTexto !== "No especificado" && objTexto !== "---") {
        objTexto.split(',').forEach(item => {
          if (item.trim().length > 0) {
            const div = document.createElement('div');
            div.style.fontWeight = "bold";
            div.innerText = `• ${item.trim()}`;
            contenedorObjetivos.appendChild(div);
          }
        });
      } else {
        contenedorObjetivos.innerText = "---";
      }
    }

    // Rellenar Métodos
    const contenedorMetodos = document.getElementById('print-metodos-elegidos');
    if (contenedorMetodos) {
      contenedorMetodos.innerHTML = "";
      const metTexto = cert.metodo || "";
      if (metTexto && metTexto !== "No especificado" && metTexto !== "---") {
        metTexto.split(',').forEach(item => {
          if (item.trim().length > 0) {
            const div = document.createElement('div');
            div.innerText = `• ${item.trim()}`;
            contenedorMetodos.appendChild(div);
          }
        });
      } else {
        contenedorMetodos.innerText = "---";
      }
    }

    // Rellenar Detalles del Producto
    if (document.getElementById('td-prod-nombre')) document.getElementById('td-prod-nombre').innerText = cert.pNombre || '---';
    if (document.getElementById('td-prod-activo')) document.getElementById('td-prod-activo').innerText = cert.pActivo || '---';
    if (document.getElementById('td-prod-ms')) document.getElementById('td-prod-ms').innerText = cert.pReg || '---';
    if (document.getElementById('td-prod-lote')) document.getElementById('td-prod-lote').innerText = cert.pLote || '---';
    if (document.getElementById('td-prod-dosis')) document.getElementById('td-prod-dosis').innerText = cert.pDosis || '---';
    if (document.getElementById('td-prod-vence')) document.getElementById('td-prod-vence').innerText = cert.pVence || '---';

    // Generar Código QR dentro de la plantilla completa del certificado
    const qrContainer = document.getElementById('qrcode');
    if (qrContainer) {
      qrContainer.innerHTML = "";
      const cliLimpio = (cert.clienteNombre || "Cliente")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .substring(0, 25);

      const urlBaseValidador = "https://everstrc.github.io/tecnoplagas-app/validar.html";
      const textoQrPublico = `${urlBaseValidador}?id=${encodeURIComponent(cert.id)}&cli=${encodeURIComponent(cliLimpio)}&cab=${encodeURIComponent(cert.cabezal)}&rem=${encodeURIComponent(cert.remolque)}&emi=${encodeURIComponent(cert.fecha)}&ven=${encodeURIComponent(cert.vence)}`;

      const InstanciaQRCode = window.QRCode || QRCode;
      if (typeof InstanciaQRCode !== 'undefined') {
        new InstanciaQRCode(qrContainer, {
          text: textoQrPublico,
          width: 95,
          height: 95,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: InstanciaQRCode.CorrectLevel ? InstanciaQRCode.CorrectLevel.M : 1
        });
      }
    }

    // Disparar la impresión tras un breve retardo
    setTimeout(() => {
      window.print();
    }, 300);

  } catch (error) {
    console.error("Error al preparar la impresión:", error);
  }
}

// Inicializar la carga cuando el documento esté completamente disponible
document.addEventListener('DOMContentLoaded', () => {
  cargarListaCertificados();
});
