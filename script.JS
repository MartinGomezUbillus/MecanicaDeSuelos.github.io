// ============================================================================
// CONFIGURACIÓN DE TAMICES (Con los datos exactos del informe)
// ============================================================================
const TAMICES = [
    { nombre: '3"',     abertura: 76.200, pesoInforme: 0.0,  destacado: false },
    { nombre: '2 1/2"', abertura: 63.500, pesoInforme: 0.0,  destacado: false },
    { nombre: '2"',     abertura: 50.800, pesoInforme: 0.0,  destacado: false },
    { nombre: '1 1/2"', abertura: 38.100, pesoInforme: 247.0, destacado: false },
    { nombre: '1"',     abertura: 25.400, pesoInforme: 64.0, destacado: false },
    { nombre: '3/4"',   abertura: 19.050, pesoInforme: 27.0, destacado: false },
    { nombre: '1/2"',   abertura: 12.500, pesoInforme: 45.0, destacado: false },
    { nombre: '3/8"',   abertura: 9.500,  pesoInforme: 23.0, destacado: false },
    { nombre: '1/4"',   abertura: 6.350,  pesoInforme: 88.0, destacado: false },
    { nombre: '# 4',    abertura: 4.750,  pesoInforme: 37.0, destacado: true },
    { nombre: '# 8',    abertura: 2.380,  pesoInforme: 0.0,  destacado: false },
    { nombre: '# 10',   abertura: 2.000,  pesoInforme: 67.3, destacado: true },
    { nombre: '# 16',   abertura: 1.190,  pesoInforme: 0.0,  destacado: false },
    { nombre: '# 30',   abertura: 0.600,  pesoInforme: 0.0,  destacado: false },
    { nombre: '# 40',   abertura: 0.420,  pesoInforme: 80.7, destacado: true },
    { nombre: '# 50',   abertura: 0.300,  pesoInforme: 0.0,  destacado: false },
    { nombre: '# 100',  abertura: 0.150,  pesoInforme: 0.0,  destacado: false },
    { nombre: '# 200',  abertura: 0.075,  pesoInforme: 55.0, destacado: true },
    { nombre: '< # 200',abertura: 0.000,  pesoInforme: 57.1, destacado: false }
];

// Plugin personalizado para dibujar etiquetas limpias sin que se superpongan
// Plugin mejorado: muestra etiquetas limpias en los tamices clave sin superponerse en el eje X
const pluginEtiquetasCurva = {
    id: 'etiquetasTamices',
    afterDatasetsDraw(chart) {
        const { ctx, chartArea } = chart;
        const meta = chart.getDatasetMeta(0);
        const dataset = chart.data.datasets[0].data;

        ctx.save();
        ctx.font = '700 11px Inter, sans-serif';
        ctx.textAlign = 'center';

        // Solo etiquetamos los tamices principales para que nunca se amontonen al final del eje X
        const tamicesEtiquetar = ['1 1/2"', '3/8"', '# 4', '# 10', '# 40', '# 200'];
        let contadorVisibles = 0;

        meta.data.forEach((punto, index) => {
            const dato = dataset[index];
            if (!dato || !tamicesEtiquetar.includes(dato.tamiz)) return;

            const esNormativo = ['# 4', '# 10', '# 40', '# 200'].includes(dato.tamiz);

            // Si el punto está cerca del eje X inferior (como #200 con 12.7%), ponemos la etiqueta ARRIBA del punto
            let offsetY = (contadorVisibles % 2 === 0) ? -14 : 18;
            if (punto.y > chartArea.bottom - 35) {
                offsetY = -14;
            } else if (punto.y < chartArea.top + 25) {
                offsetY = 18;
            }

            // Ajustar alineación horizontal en el extremo derecho (#200) para que no se corte
            if (dato.tamiz === '# 200') {
                ctx.textAlign = 'right';
            } else {
                ctx.textAlign = 'center';
            }

            const texto = `${dato.tamiz}: ${dato.y.toFixed(1)}%`;
            const posX = dato.tamiz === '# 200' ? punto.x - 6 : punto.x;
            const posY = punto.y + offsetY;

            // Fondo blanco semitransparente detrás del texto para lectura impecable
            const anchoTexto = ctx.measureText(texto).width;
            const xCaja = dato.tamiz === '# 200' ? posX - anchoTexto - 4 : posX - anchoTexto / 2 - 4;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
            ctx.fillRect(xCaja, posY - 10, anchoTexto + 8, 14);

            ctx.fillStyle = esNormativo ? '#b45309' : '#0f172a';
            ctx.fillText(texto, posX, posY);

            contadorVisibles++;
        });
        ctx.restore();
    }
};

let chartCurva = null;

window.addEventListener('DOMContentLoaded', () => {
    construirTablaHTML();
    inicializarGrafica();
    cargarDatosInformeM1();
});

function irAModulo(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

function cambiarModoM1(modo) {
    const vistaTabla = document.getElementById('vista-tabla');
    const vistaDirecto = document.getElementById('vista-directo');
    const btnTabla = document.getElementById('btn-modo-tabla');
    const btnDirecto = document.getElementById('btn-modo-directo');

    if (modo === 'tabla') {
        vistaTabla.classList.remove('hidden');
        vistaDirecto.classList.add('hidden');
        btnTabla.classList.add('active');
        btnDirecto.classList.remove('active');
        calcularDesdeTabla();
    } else {
        vistaTabla.classList.add('hidden');
        vistaDirecto.classList.remove('hidden');
        btnTabla.classList.remove('active');
        btnDirecto.classList.add('active');
        calcularDesdeDirecto();
    }
}

function construirTablaHTML() {
    const tbody = document.getElementById('tbody-tamices');
    tbody.innerHTML = '';

    TAMICES.forEach((t, idx) => {
        const tr = document.createElement('tr');
        if (t.destacado) tr.classList.add('highlight-sieve');

        tr.innerHTML = `
            <td>${t.nombre}</td>
            <td>${t.abertura > 0 ? t.abertura.toFixed(3) : 'Fondo'}</td>
            <td>
                <input type="number" step="0.1" min="0" class="peso-input"
                       id="peso-t-${idx}" value="${t.pesoInforme}"
                       oninput="calcularDesdeTabla()">
            </td>
            <td id="ret-parc-${idx}">0.0</td>
            <td id="ret-acum-${idx}">0.0</td>
            <td id="pasa-${idx}">100.0</td>
        `;
        tbody.appendChild(tr);
    });
}

function alCambiarModoCuarteo() {
    const usarCuarteo = document.getElementById('check-cuarteo').checked;
    const inputPeso = document.getElementById('peso-muestra-total');
    if (usarCuarteo) {
        inputPeso.value = 1258.3;
    } else {
        inputPeso.value = '';
    }
    calcularDesdeTabla();
}

function cargarDatosInformeM1() {
    TAMICES.forEach((t, idx) => {
        document.getElementById(`peso-t-${idx}`).value = t.pesoInforme;
    });
    document.getElementById('check-cuarteo').checked = true;
    document.getElementById('peso-muestra-total').value = 1258.3;
    document.getElementById('ll-tabla').value = 21.6;
    document.getElementById('lp-tabla').value = 17.7;
    calcularDesdeTabla();
}

function limpiarTablaM1() {
    TAMICES.forEach((_, idx) => {
        document.getElementById(`peso-t-${idx}`).value = 0;
    });
    document.getElementById('check-cuarteo').checked = false;
    document.getElementById('peso-muestra-total').value = '';
    calcularDesdeTabla();
}

// ============================================================================
// CÁLCULO DE TABLA, INTERPOLACIÓN DE D10/D30/D60 Y CURVA GRANULOMÉTRICA
// ============================================================================
function calcularDesdeTabla() {
    const usarCuarteo = document.getElementById('check-cuarteo').checked;
    const inputPesoTotal = parseFloat(document.getElementById('peso-muestra-total').value);

    const pesos = TAMICES.map((_, idx) => {
        const val = parseFloat(document.getElementById(`peso-t-${idx}`).value);
        return isNaN(val) || val < 0 ? 0 : val;
    });

    const idxMalla4 = 9;
    const sumaGruesosHastaMalla4 = pesos.slice(0, idxMalla4 + 1).reduce((a, b) => a + b, 0);
    const sumaFinosBajoMalla4 = pesos.slice(idxMalla4 + 1).reduce((a, b) => a + b, 0);
    const sumaDirecta = sumaGruesosHastaMalla4 + sumaFinosBajoMalla4;

    const pesoTotalReferencia = (usarCuarteo && !isNaN(inputPesoTotal) && inputPesoTotal > 0)
        ? inputPesoTotal
        : ((!isNaN(inputPesoTotal) && inputPesoTotal > 0) ? inputPesoTotal : sumaDirecta);

    let retAcum = 0;
    const todosLosPuntos = [];
    const datosPasa = {};

    const pctRetHastaMalla4 = pesoTotalReferencia > 0 ? (sumaGruesosHastaMalla4 / pesoTotalReferencia) * 100 : 0;
    const pctPasaMalla4 = Math.max(0, 100 - pctRetHastaMalla4);

    TAMICES.forEach((t, idx) => {
        let retParcial = 0;
        if (pesoTotalReferencia > 0) {
            if (usarCuarteo && idx > idxMalla4 && sumaFinosBajoMalla4 > 0) {
                retParcial = (pesos[idx] / sumaFinosBajoMalla4) * pctPasaMalla4;
            } else {
                retParcial = (pesos[idx] / pesoTotalReferencia) * 100;
            }
        }

        retAcum += retParcial;
        if (retAcum > 100) retAcum = 100;
        const pctPasa = Math.max(0, 100 - retAcum);

        document.getElementById(`ret-parc-${idx}`).textContent = retParcial.toFixed(1);
        document.getElementById(`ret-acum-${idx}`).textContent = retAcum.toFixed(1);
        document.getElementById(`pasa-${idx}`).textContent = t.abertura > 0 ? pctPasa.toFixed(1) : '-';

        if (t.abertura > 0) {
            todosLosPuntos.push({
                x: t.abertura,
                y: Number(pctPasa.toFixed(2)),
                tamiz: t.nombre,
                pesoRet: pesos[idx]
            });
            datosPasa[t.nombre] = pctPasa;
        }
    });

    document.getElementById('total-peso-ret').textContent = `${sumaDirecta.toFixed(1)} g`;

    // Para que la curva sea suave y sin escalones planos artificiales en tamices con peso 0,
    // conservamos el primer tamiz de 100% y los tamices donde hubo retención real (o tamices clave)
    const puntosSuaves = todosLosPuntos.filter((p, idx) => {
        if (idx === 0 || idx === todosLosPuntos.length - 1) return true;
        if (p.pesoRet > 0) return true;
        if (p.y === 100 && todosLosPuntos[idx + 1]?.y < 100) return true;
        return false;
    });

    actualizarGrafica(puntosSuaves);

    // Cálculo directo de D10, D30 y D60 desde los puntos de la tabla
    const d10 = calcularDiametroCaracteristico(puntosSuaves, 10);
    const d30 = calcularDiametroCaracteristico(puntosSuaves, 30);
    const d60 = calcularDiametroCaracteristico(puntosSuaves, 60);

    let cu = null, cc = null;
    if (d10 && d60 && d10 > 0) {
        cu = d60 / d10;
        if (d30) cc = Math.pow(d30, 2) / (d60 * d10);
    }

    const p4 = datosPasa['# 4'] ?? 100;
    const p10 = datosPasa['# 10'] ?? 100;
    const p40 = datosPasa['# 40'] ?? 100;
    const p200 = datosPasa['# 200'] ?? 0;

    const pctGrava = Math.max(0, 100 - p4);
    const pctArena = Math.max(0, p4 - p200);
    const pctFinos = p200;

    document.getElementById('res-grava').textContent = `${pctGrava.toFixed(1)}%`;
    document.getElementById('res-arena').textContent = `${pctArena.toFixed(1)}%`;
    document.getElementById('res-finos').textContent = `${pctFinos.toFixed(1)}%`;

    document.getElementById('res-d10').textContent = d10 ? `${d10.toFixed(3)} mm` : '-';
    document.getElementById('res-d30').textContent = d30 ? `${d30.toFixed(3)} mm` : '-';
    document.getElementById('res-d60').textContent = d60 ? `${d60.toFixed(2)} mm` : '-';
    document.getElementById('res-cu').textContent = cu ? cu.toFixed(2) : '-';
    document.getElementById('res-cc').textContent = cc ? cc.toFixed(2) : '-';

    const ll = parseFloat(document.getElementById('ll-tabla').value) || 0;
    const lp = parseFloat(document.getElementById('lp-tabla').value) || 0;
    const ip = Math.max(0, ll - lp);
    document.getElementById('ip-tabla').value = ip.toFixed(1);

    ejecutarClasificaciones({ p4, p10, p40, p200, ll, lp, ip, cu, cc });
}

// Calcula D10, D30, D60 por interpolación logarítmica (y extrapola hacia el fondo si P#200 > 10%)
function calcularDiametroCaracteristico(puntos, porcentajeBuscado) {
    if (!puntos || puntos.length < 2) return null;

    // agregamos un punto virtual del fondo (< #200 a 0.005 mm con 0% que pasa)
    // por si el 10% cae debajo de la malla #200 (ej. cuando pasa 12.7% en #200)
    const listaExtendida = [...puntos, { x: 0.005, y: 0.0 }];

    for (let i = 0; i < listaExtendida.length - 1; i++) {
        const pSup = listaExtendida[i];
        const pInf = listaExtendida[i + 1];

        if (pSup.y >= porcentajeBuscado && pInf.y <= porcentajeBuscado) {
            if (Math.abs(pSup.y - pInf.y) < 1e-6) return pInf.x;
            const logD = Math.log10(pInf.x) +
                ((porcentajeBuscado - pInf.y) / (pSup.y - pInf.y)) *
                (Math.log10(pSup.x) - Math.log10(pInf.x));
            return Math.pow(10, logD);
        }
    }
    return null;
}

function calcularDesdeDirecto() {
    const p4 = parseFloat(document.getElementById('dir-p4').value) || 0;
    const p10 = parseFloat(document.getElementById('dir-p10').value) || 0;
    const p40 = parseFloat(document.getElementById('dir-p40').value) || 0;
    const p200 = parseFloat(document.getElementById('dir-p200').value) || 0;
    const ll = parseFloat(document.getElementById('dir-ll').value) || 0;
    const lp = parseFloat(document.getElementById('dir-lp').value) || 0;
    const ip = Math.max(0, ll - lp);
    const cu = parseFloat(document.getElementById('dir-cu').value) || null;
    const cc = parseFloat(document.getElementById('dir-cc').value) || null;

    ejecutarClasificaciones({ p4, p10, p40, p200, ll, lp, ip, cu, cc });
}

// ============================================================================
// MOTOR DE CLASIFICACIÓN SUCS Y AASHTO
// ============================================================================
function ejecutarClasificaciones(d) {
    const resSUCS = clasificarSUCS(d);
    const resAASHTO = clasificarAASHTO(d);

    document.getElementById('out-sucs-simbolo').textContent = resSUCS.simbolo;
    document.getElementById('out-sucs-nombre').textContent = resSUCS.nombre;
    document.getElementById('out-sucs-condiciones').innerHTML =
        resSUCS.condiciones.map(c => `<li>${c}</li>`).join('');

    document.getElementById('out-aashto-simbolo').textContent = `${resAASHTO.grupo} (${resAASHTO.ig})`;
    document.getElementById('out-aashto-nombre').textContent = resAASHTO.descripcion;
    document.getElementById('out-aashto-condiciones').innerHTML =
        resAASHTO.condiciones.map(c => `<li>${c}</li>`).join('');

    // Conecta automáticamente el resultado SUCS del Módulo 1 con la Base de Datos del Módulo 3
    if (typeof sincronizarSUCSDesdeModulo1 === 'function') {
        sincronizarSUCSDesdeModulo1(resSUCS.simbolo);
    }
}

function clasificarSUCS({ p4, p200, ll, ip, cu, cc }) {
    const condiciones = [];
    const finos = p200;
    const grava = Math.max(0, 100 - p4);
    const arena = Math.max(0, p4 - p200);
    const ipLineaA = 0.73 * (ll - 20);

    let tipoFino = 'M';
    if (ip >= 4 && ip <= 7 && ip >= ipLineaA) {
        tipoFino = 'CL-ML';
    } else if (ip > 7 && ip >= ipLineaA) {
        tipoFino = 'C';
    } else {
        tipoFino = 'M';
    }

    if (finos >= 50) {
        condiciones.push(`% Pasa #200 = ${finos.toFixed(1)}% (≥ 50% → Suelo de Grano Fino)`);
        condiciones.push(`Línea A de Casagrande: IP_A = ${ipLineaA.toFixed(1)}% vs IP = ${ip.toFixed(1)}%`);

        if (tipoFino === 'CL-ML') {
            return { simbolo: 'CL-ML', nombre: 'Arcilla limosa de baja plasticidad', condiciones };
        }
        const sufijo = ll >= 50 ? 'H' : 'L';
        condiciones.push(`Límite Líquido = ${ll.toFixed(1)}% (${ll >= 50 ? 'Alta plasticidad (H)' : 'Baja plasticidad (L)'})`);

        return {
            simbolo: `${tipoFino}${sufijo}`,
            nombre: `${tipoFino === 'C' ? 'Arcilla' : 'Limo'} de ${sufijo === 'H' ? 'alta' : 'baja'} plasticidad`,
            condiciones
        };
    }

    condiciones.push(`% Pasa #200 = ${finos.toFixed(1)}% (< 50% → Suelo de Grano Grueso)`);
    const esArena = arena >= grava;
    const prefijo = esArena ? 'S' : 'G';
    condiciones.push(`Arena = ${arena.toFixed(1)}% vs Grava = ${grava.toFixed(1)}% → Predomina ${esArena ? 'Arena (S)' : 'Grava (G)'}`);

    const bienGradado = esArena
        ? (cu !== null && cc !== null && cu >= 6 && cc >= 1 && cc <= 3)
        : (cu !== null && cc !== null && cu >= 4 && cc >= 1 && cc <= 3);
    const letraGradacion = bienGradado ? 'W' : 'P';

    if (finos < 5) {
        condiciones.push(`Finos < 5% → Suelo limpio (${prefijo}${letraGradacion}), Cu=${cu ? cu.toFixed(1) : '-'}, Cc=${cc ? cc.toFixed(2) : '-'}`);
        return {
            simbolo: `${prefijo}${letraGradacion}`,
            nombre: `${esArena ? 'Arena' : 'Grava'} ${bienGradado ? 'bien gradada' : 'mal gradada'}`,
            condiciones
        };
    }

    if (finos > 12) {
        condiciones.push(`Finos = ${finos.toFixed(1)}% (> 12% → Suelo grueso con finos)`);
        condiciones.push(`Carta de Casagrande: IP = ${ip.toFixed(1)}% vs Línea A (${ipLineaA.toFixed(1)}%) → Finos tipo ${tipoFino}`);

        if (tipoFino === 'CL-ML') {
            return { simbolo: `${prefijo}C-${prefijo}M`, nombre: `${esArena ? 'Arena' : 'Grava'} arcillo-limosa`, condiciones };
        }
        const letraFino = tipoFino === 'C' ? 'C' : 'M';
        return {
            simbolo: `${prefijo}${letraFino}`,
            nombre: `${esArena ? 'Arena' : 'Grava'} ${letraFino === 'C' ? 'arcillosa' : 'limosa'}`,
            condiciones
        };
    }

    const letraFino = tipoFino === 'C' ? 'C' : 'M';
    condiciones.push(`5% ≤ Finos (${finos.toFixed(1)}%) ≤ 12% → Clasificación dual (Cu=${cu ? cu.toFixed(1) : '-'}, Cc=${cc ? cc.toFixed(2) : '-'})`);
    return {
        simbolo: `${prefijo}${letraGradacion}-${prefijo}${letraFino}`,
        nombre: `${esArena ? 'Arena' : 'Grava'} ${bienGradado ? 'bien gradada' : 'mal gradada'} con ${letraFino === 'C' ? 'arcilla' : 'limo'}`,
        condiciones
    };
}

function clasificarAASHTO({ p10, p40, p200, ll, ip }) {
    const condiciones = [];
    let grupo = '';
    let descripcion = '';

    if (p200 <= 35) {
        condiciones.push(`% Pasa #200 = ${p200.toFixed(1)}% (≤ 35% → Materiales Granulares)`);
        if (p10 <= 50 && p40 <= 30 && p200 <= 15 && ip <= 6) {
            grupo = 'A-1-a';
            descripcion = 'Fragmentos de roca, grava y arena';
            condiciones.push(`Cumple A-1-a: P#10 (${p10.toFixed(1)}≤50), P#40 (${p40.toFixed(1)}≤30), P#200 (${p200.toFixed(1)}≤15), IP (${ip.toFixed(1)}≤6)`);
        } else if (p40 <= 50 && p200 <= 25 && ip <= 6) {
            grupo = 'A-1-b';
            descripcion = 'Arena gruesa o grava con arena';
            condiciones.push(`Cumple A-1-b: P#40 (${p40.toFixed(1)}≤50), P#200 (${p200.toFixed(1)}≤25), IP (${ip.toFixed(1)}≤6)`);
        } else if (p40 > 50 && p200 <= 10 && ip === 0) {
            grupo = 'A-3';
            descripcion = 'Arena fina no plástica';
            condiciones.push(`Cumple A-3: P#40 (${p40.toFixed(1)}>50), P#200 (${p200.toFixed(1)}≤10), NP`);
        } else if (ll <= 40 && ip <= 10) {
            grupo = 'A-2-4';
            descripcion = 'Grava y arena limosa o arcillosa';
            condiciones.push(`Cumple A-2-4: P#200 ≤ 35%, LL (${ll.toFixed(1)}≤40), IP (${ip.toFixed(1)}≤10)`);
        } else if (ll > 40 && ip <= 10) {
            grupo = 'A-2-5';
            descripcion = 'Grava y arena limosa elástica';
            condiciones.push(`Cumple A-2-5: P#200 ≤ 35%, LL (${ll.toFixed(1)}>40), IP (${ip.toFixed(1)}≤10)`);
        } else if (ll <= 40 && ip > 10) {
            grupo = 'A-2-6';
            descripcion = 'Grava y arena arcillosa plástica';
            condiciones.push(`Cumple A-2-6: P#200 ≤ 35%, LL (${ll.toFixed(1)}≤40), IP (${ip.toFixed(1)}>10)`);
        } else {
            grupo = 'A-2-7';
            descripcion = 'Grava y arena arcillosa de alta plasticidad';
            condiciones.push(`Cumple A-2-7: P#200 ≤ 35%, LL (${ll.toFixed(1)}>40), IP (${ip.toFixed(1)}>10)`);
        }
    } else {
        condiciones.push(`% Pasa #200 = ${p200.toFixed(1)}% (> 35% → Materiales Limo-Arcillosos)`);
        if (ll <= 40 && ip <= 10) {
            grupo = 'A-4';
            descripcion = 'Suelo limoso';
            condiciones.push(`Cumple A-4: LL (${ll.toFixed(1)}≤40) e IP (${ip.toFixed(1)}≤10)`);
        } else if (ll > 40 && ip <= 10) {
            grupo = 'A-5';
            descripcion = 'Suelo limoso elástico';
            condiciones.push(`Cumple A-5: LL (${ll.toFixed(1)}>40) e IP (${ip.toFixed(1)}≤10)`);
        } else if (ll <= 40 && ip > 10) {
            grupo = 'A-6';
            descripcion = 'Suelo arcilloso plástico';
            condiciones.push(`Cumple A-6: LL (${ll.toFixed(1)}≤40) e IP (${ip.toFixed(1)}>10)`);
        } else {
            const sub = ip <= (ll - 30) ? 'A-7-5' : 'A-7-6';
            grupo = sub;
            descripcion = 'Suelo arcilloso de alta plasticidad';
            condiciones.push(`Cumple ${sub}: LL > 40, IP > 10`);
        }
    }

    let ig = 0;
    if (['A-1-a', 'A-1-b', 'A-2-4', 'A-2-5', 'A-3'].includes(grupo)) {
        ig = 0;
    } else if (['A-2-6', 'A-2-7'].includes(grupo)) {
        ig = 0.01 * (p200 - 15) * (ip - 10);
    } else {
        ig = (p200 - 35) * (0.2 + 0.005 * (ll - 40)) + 0.01 * (p200 - 15) * (ip - 10);
    }
    ig = Math.max(0, Math.round(ig));
    condiciones.push(`Índice de Grupo calculado: IG = ${ig}`);

    return { grupo, ig, descripcion, condiciones };
}

// ============================================================================
// GRÁFICA GRANULOMÉTRICA ANCHA, SUAVE Y SIN ETIQUETAS SUPERPUESTAS
// ============================================================================
function inicializarGrafica() {
    const ctx = document.getElementById('graficaGranulometrica').getContext('2d');
    chartCurva = new Chart(ctx, {
        type: 'line',
        plugins: [pluginEtiquetasCurva],
        data: {
            datasets: [{
                label: 'Curva Granulométrica (% Que Pasa)',
                data: [],
                borderColor: '#0284c7',
                backgroundColor: 'rgba(14, 165, 233, 0.14)',
                borderWidth: 3,
                pointBackgroundColor: '#f59e0b',
                pointBorderColor: '#0f172a',
                pointBorderWidth: 1.5,
                pointRadius: 5.5,
                pointHoverRadius: 8,
                fill: true,
                cubicInterpolationMode: 'monotone',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 24, right: 28, bottom: 10, left: 10 }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { font: { weight: 'bold', size: 12 } }
                },
                tooltip: {
                    backgroundColor: '#0f172a',
                    titleFont: { size: 13, weight: 'bold' },
                    bodyFont: { size: 12 },
                    padding: 10,
                    callbacks: {
                        title: (items) => {
                            const p = items[0].raw;
                            return `Tamiz ${p.tamiz} (Abertura: ${p.x.toFixed(3)} mm)`;
                        },
                        label: (item) => ` % Que Pasa: ${item.raw.y.toFixed(1)}%`
                    }
                }
            },
            scales: {
                x: {
                    type: 'logarithmic',
                    reverse: true,
                    min: 0.05,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Abertura del Tamiz (mm) - Escala Logarítmica (Tamices #4, #10, #40 y #200)',
                        font: { weight: 'bold', size: 13 },
                        color: '#0f172a',
                        padding: { top: 10 }
                    },
                    ticks: {
                        autoSkip: false,
                        maxRotation: 0,
                        minRotation: 0,
                        padding: 6,
                        font: { size: 11, weight: '600' },
                        callback: function(value) {
                            // Valores espaciados logarítmicamente para que no se superpongan al final del eje X
                            const hitos = [
                                { val: 76.2, label: '76.2 (3")' },
                                { val: 25.4, label: '25.4 (1")' },
                                { val: 9.5,  label: '9.5 (3/8")' },
                                { val: 4.75, label: '4.75 (#4)' },
                                { val: 2.0,  label: '2.00 (#10)' },
                                { val: 0.42, label: '0.42 (#40)' },
                                { val: 0.075,label: '0.075 (#200)' }
                            ];
                            for (const h of hitos) {
                                if (Math.abs(value - h.val) / h.val < 0.06) return h.label;
                            }
                            return '';
                        }
                    },
                    afterBuildTicks: function(scale) {
                        scale.ticks = [
                            { value: 76.2 },
                            { value: 25.4 },
                            { value: 9.5 },
                            { value: 4.75 },
                            { value: 2.0 },
                            { value: 0.42 },
                            { value: 0.075 }
                        ];
                    },
                    grid: { color: '#e2e8f0' }
                },
                y: {
                    min: 0,
                    max: 105,
                    title: {
                        display: true,
                        text: 'Porcentaje Que Pasa (%)',
                        font: { weight: 'bold', size: 13 },
                        color: '#0f172a'
                    },
                    ticks: {
                        stepSize: 10,
                        callback: (val) => val <= 100 ? `${val}%` : ''
                    },
                    grid: { color: '#e2e8f0' }
                }
            }
        }
    });
}

function actualizarGrafica(puntos) {
    if (!chartCurva) return;
    chartCurva.data.datasets[0].data = puntos;
    chartCurva.update();
}

// ============================================================================
// MÓDULO 2: PERFIL ESTRATIGRÁFICO, NIVEL FREÁTICO Y 3 GRÁFICAS DE ESFUERZOS
// ============================================================================
let estratosM2 = [];
let chartSigmaTotal = null;
let chartPresionU = null;
let chartSigmaEfectivo = null;

const COLORES_ESTRATOS = ['#fde68a', '#cbd5e1', '#fed7aa', '#bbf7d0', '#ddd6fe', '#fecdd3'];

window.addEventListener('DOMContentLoaded', () => {
    inicializarGraficasModulo2();
    cargarDatosInformeM2();
});

// Carga los 2 estratos iniciales del informe (0.00 a 2.00 m y 2.00 a 2.50 m, NF = 1.80 m)
function cargarDatosInformeM2() {
    estratosM2 = [
        { zInicio: 0.00, zFin: 2.00, gamma: 1.60, color: '#fde68a' },
        { zInicio: 2.00, zFin: 2.50, gamma: 1.60, color: '#cbd5e1' }
    ];

    document.getElementById('m2-usar-gamma-unico').checked = true;
    document.getElementById('m2-gamma-global').disabled = false;
    document.getElementById('m2-gamma-global').value = 1.60;
    document.getElementById('m2-tiene-nf').checked = true;
    document.getElementById('m2-nf-prof').value = 1.80;
    document.getElementById('m2-gamma-agua').value = 1.00;
    document.getElementById('m2-z-eval').value = 2.00;

    renderizarTablaEstratosM2();
    calcularModulo2();
}



function agregarEstratoM2() {
    const ultimo = estratosM2[estratosM2.length - 1];
    const nuevoInicio = ultimo ? ultimo.zFin : 0.00;
    const nuevoFin = Number((nuevoInicio + 1.00).toFixed(2));
    const gammaGlobal = parseFloat(document.getElementById('m2-gamma-global').value) || 1.60;
    const color = COLORES_ESTRATOS[estratosM2.length % COLORES_ESTRATOS.length];

    estratosM2.push({
        zInicio: nuevoInicio,
        zFin: nuevoFin,
        gamma: gammaGlobal,
        color: color
    });

    renderizarTablaEstratosM2();
    calcularModulo2();
}

function eliminarEstratoM2(idx) {
    if (estratosM2.length <= 1) return;
    estratosM2.splice(idx, 1);
    encadenarProfundidadesM2();
    renderizarTablaEstratosM2();
    calcularModulo2();
}

// Permite valores negativos o positivos en el Estrato 1 y encadena los siguientes
function encadenarProfundidadesM2() {
    for (let i = 0; i < estratosM2.length; i++) {
        if (i === 0) {
            if (isNaN(estratosM2[0].zInicio)) estratosM2[0].zInicio = 0;
        } else {
            estratosM2[i].zInicio = Number(estratosM2[i - 1].zFin.toFixed(2));
        }
        if (estratosM2[i].zFin <= estratosM2[i].zInicio) {
            estratosM2[i].zFin = Number((estratosM2[i].zInicio + 0.50).toFixed(2));
        }
    }
}

function alternarModoGammaM2() {
    const usarUnico = document.getElementById('m2-usar-gamma-unico').checked;
    const inputGlobal = document.getElementById('m2-gamma-global');
    inputGlobal.disabled = !usarUnico;
    if (usarUnico) {
        sincronizarGammaGlobalM2();
    } else {
        renderizarTablaEstratosM2();
        calcularModulo2();
    }
}

function sincronizarGammaGlobalM2() {
    const usarUnico = document.getElementById('m2-usar-gamma-unico').checked;
    const valGlobal = parseFloat(document.getElementById('m2-gamma-global').value);
    if (usarUnico && !isNaN(valGlobal) && valGlobal > 0) {
        estratosM2.forEach(e => { e.gamma = valGlobal; });
        renderizarTablaEstratosM2();
    }
    calcularModulo2();
}

function actualizarCampoEstratoM2(idx, campo, valor) {
    if (campo === 'color') {
        estratosM2[idx].color = valor;
        dibujarPerfilVisualM2();
        return;
    }

    const num = parseFloat(valor);
    if (isNaN(num)) return;

    // Si cambia el Peso Unitario (gamma), NO redibujamos la tabla para que el cursor nunca se salga del input
    if (campo === 'gamma') {
        if (num <= 0) return;
        estratosM2[idx].gamma = num;
        calcularModulo2();
        return;
    }

    if (campo === 'zInicio' && idx === 0) {
        estratosM2[0].zInicio = num;
        if (estratosM2[0].zFin <= num) {
            estratosM2[0].zFin = Number((num + 0.50).toFixed(2));
        }
    } else if (campo === 'zFin') {
        estratosM2[idx].zFin = num;
    }

    encadenarProfundidadesM2();
    renderizarTablaEstratosM2();
    calcularModulo2();
}

function renderizarTablaEstratosM2() {
    const tbody = document.getElementById('tbody-estratos-m2');
    if (!tbody) return;
    tbody.innerHTML = '';

    const usarGammaUnico = document.getElementById('m2-usar-gamma-unico').checked;

    estratosM2.forEach((est, idx) => {
        const espesor = Math.max(0, est.zFin - est.zInicio);
        const tr = document.createElement('tr');

        const inputInicioHTML = idx === 0
            ? `<input type="number" step="0.1" class="stratum-num-input" value="${est.zInicio.toFixed(2)}"
                      onchange="actualizarCampoEstratoM2(0, 'zInicio', this.value)">`
            : `<input type="number" class="stratum-num-input locked-input" value="${est.zInicio.toFixed(2)}" readonly
                      title="Inicia automáticamente donde termina el Estrato ${idx}">`;

        const inputGammaHTML = usarGammaUnico
            ? `<input type="number" class="stratum-num-input locked-input" value="${est.gamma.toFixed(2)}" readonly
                      title="Usando Peso Unitario global. Desmarca la casilla superior para editar cada estrato.">`
            : `<input type="number" step="0.05" min="0.1" class="stratum-num-input" value="${est.gamma}"
                      oninput="actualizarCampoEstratoM2(${idx}, 'gamma', this.value)"
                      onchange="this.value = parseFloat(this.value || 1.6).toFixed(2)">`;

        tr.innerHTML = `
            <td><strong>Estrato ${idx + 1}</strong></td>
            <td>${inputInicioHTML}</td>
            <td>
                <input type="number" step="0.1" class="stratum-num-input"
                       value="${est.zFin.toFixed(2)}"
                       onchange="actualizarCampoEstratoM2(${idx}, 'zFin', this.value)">
            </td>
            <td><strong>${espesor.toFixed(2)} m</strong></td>
            <td>${inputGammaHTML}</td>
            <td>
                <input type="color" value="${est.color}"
                       oninput="actualizarCampoEstratoM2(${idx}, 'color', this.value)">
            </td>
            <td>
                <button class="btn-delete-stratum" onclick="eliminarEstratoM2(${idx})"
                        ${estratosM2.length <= 1 ? 'disabled' : ''}>
                    Eliminar
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Calcula Esfuerzo Total (σ), Presión de Poros (u) y Esfuerzo Efectivo (σ') para cualquier cota Z
function calcularEsfuerzosEnZ(z, tieneNF, zNF, gammaW) {
    const zMin = estratosM2[0].zInicio;
    if (z <= zMin) return { sigma: 0, u: 0, efectivo: 0 };

    let sigma = 0;
    for (const est of estratosM2) {
        if (z > est.zInicio) {
            const techo = est.zInicio;
            const base = Math.min(z, est.zFin);
            const hTramo = Math.max(0, base - techo);
            sigma += hTramo * est.gamma;
        }
    }

    const ultimo = estratosM2[estratosM2.length - 1];
    if (z > ultimo.zFin) {
        sigma += (z - ultimo.zFin) * ultimo.gamma;
    }

    let u = 0;
    if (tieneNF && z > zNF) {
        const techoAgua = Math.max(zMin, zNF);
        if (z > techoAgua) {
            u = (z - techoAgua) * gammaW;
        }
    }

    const efectivo = Math.max(0, sigma - u);
    return { sigma, u, efectivo };
}

function calcularModulo2() {
    if (!estratosM2.length) return;

    const tieneNF = document.getElementById('m2-tiene-nf').checked;
    const inputNF = document.getElementById('m2-nf-prof');
    inputNF.disabled = !tieneNF;

    const zNF = parseFloat(inputNF.value);
    const cotaNF = isNaN(zNF) ? 0 : zNF;

    const valGammaW = parseFloat(document.getElementById('m2-gamma-agua').value);
    const gammaW = (!isNaN(valGammaW) && valGammaW > 0) ? valGammaW : 1.00;

    const valZEval = parseFloat(document.getElementById('m2-z-eval').value);
    const zSuperficie = estratosM2[0].zInicio;
    const zFondo = estratosM2[estratosM2.length - 1].zFin;
    const zEval = !isNaN(valZEval) ? valZEval : zFondo;

    document.getElementById('badge-prof-total').textContent =
        `Cota: ${zSuperficie.toFixed(2)} m a ${zFondo.toFixed(2)} m (Espesor Total: ${(zFondo - zSuperficie).toFixed(2)} m)`;

    // 1. Dibujar el Perfil Estratigráfico Visual limpio y a todo lo ancho
    dibujarPerfilVisualM2();

    // 2. Construir cotas críticas ordenadas
    const zMaxGrafica = Math.max(zFondo, zEval);
    const mapaCotas = new Map();
    const agregarCota = (zVal, etiqueta) => {
        if (zVal < zSuperficie || zVal > zMaxGrafica) return;
        const clave = Number(zVal.toFixed(3));
        if (!mapaCotas.has(clave)) {
            mapaCotas.set(clave, etiqueta);
        } else if (!mapaCotas.get(clave).includes(etiqueta)) {
            mapaCotas.set(clave, `${mapaCotas.get(clave)} / ${etiqueta}`);
        }
    };

    agregarCota(zSuperficie, 'Inicio Estrato 1 (Cota Superior)');
    estratosM2.forEach((est, idx) => {
        const nombreCota = idx === estratosM2.length - 1
            ? `Fin Estrato ${idx + 1} (Fondo del Perfil)`
            : `Cambio Estrato ${idx + 1} a Estrato ${idx + 2}`;
        agregarCota(est.zFin, nombreCota);
    });

    if (tieneNF && cotaNF >= zSuperficie && cotaNF <= zMaxGrafica) {
        agregarCota(cotaNF, 'Nivel Freático (Inicio de Agua)');
    }
    if (zEval >= zSuperficie) {
        agregarCota(zEval, 'Cota Evaluada (Df)');
    }

    const cotasOrdenadas = Array.from(mapaCotas.keys()).sort((a, b) => a - b);

    const ptsTotal = [];
    const ptsPoros = [];
    const ptsEfectivo = [];
    const tbodyRes = document.getElementById('tbody-resultados-esfuerzos');
    tbodyRes.innerHTML = '';

    cotasOrdenadas.forEach(z => {
        const { sigma, u, efectivo } = calcularEsfuerzosEnZ(z, tieneNF, cotaNF, gammaW);
        const desc = mapaCotas.get(z);

        ptsTotal.push({ x: Number(sigma.toFixed(3)), y: z, desc });
        ptsPoros.push({ x: Number(u.toFixed(3)), y: z, desc });
        ptsEfectivo.push({ x: Number(efectivo.toFixed(3)), y: z, desc });

        // Sin clases amarillas en las filas del cuadro resumen
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${z.toFixed(2)} m</strong></td>
            <td>${desc}</td>
            <td>${sigma.toFixed(2)} Tn/m²</td>
            <td>${u.toFixed(2)} Tn/m²</td>
            <td><strong>${efectivo.toFixed(2)} Tn/m²</strong></td>
            <td>${(efectivo * 0.1).toFixed(3)} kg/cm²</td>
        `;
        tbodyRes.appendChild(tr);
    });

    // 3. Actualizar las 3 gráficas
    const maxEsfuerzoEjeX = Math.max(...ptsTotal.map(p => p.x), 1.0) * 1.15;
    actualizarGraficasModulo2(ptsTotal, ptsPoros, ptsEfectivo, zSuperficie, zMaxGrafica, maxEsfuerzoEjeX);

    // 4. Resultados finales 100% dinámicos según cualquier calicata ingresada
    const evalDf = calcularEsfuerzosEnZ(zEval, tieneNF, cotaNF, gammaW);
    const evalFondo = calcularEsfuerzosEnZ(zFondo, tieneNF, cotaNF, gammaW);
    const espesorAcumuladoEnDf = Math.max(0, zEval - zSuperficie);

    document.getElementById('lbl-cota-evaluada').textContent =
        `ESTADO DE ESFUERZOS EN COTA EVALUADA (Z = ${zEval.toFixed(2)} m)`;
    document.getElementById('out-m2-efectivo').textContent =
        `${evalDf.efectivo.toFixed(2)} Tn/m² (${(evalDf.efectivo * 0.1).toFixed(3)} kg/cm²)`;

    document.getElementById('out-m2-desglose').innerHTML = `
        <li>Espesor de suelo sobre la cota evaluada (${zSuperficie.toFixed(2)} m a ${zEval.toFixed(2)} m): <strong>${espesorAcumuladoEnDf.toFixed(2)} m</strong></li>
        <li>Esfuerzo Total calculado: <strong>σ = ${evalDf.sigma.toFixed(2)} Tn/m²</strong> (${(evalDf.sigma * 0.1).toFixed(3)} kg/cm² | ${(evalDf.sigma * 9.81).toFixed(1)} kPa)</li>
        <li>Presión de Poros (Agua): <strong>u = ${evalDf.u.toFixed(2)} Tn/m²</strong> (${(evalDf.u * 0.1).toFixed(3)} kg/cm² | ${(evalDf.u * 9.81).toFixed(1)} kPa)</li>
        <li>Esfuerzo Efectivo Neto: <strong>σ' = σ - u = ${evalDf.efectivo.toFixed(2)} Tn/m²</strong> (En el fondo Z = ${zFondo.toFixed(2)} m: σ' = ${evalFondo.efectivo.toFixed(2)} Tn/m²)</li>
    `;

    const pctReduccion = evalDf.sigma > 0 ? (evalDf.u / evalDf.sigma) * 100 : 0;
    document.getElementById('out-m2-reduccion').textContent =
        tieneNF && evalDf.u > 0 ? `-${pctReduccion.toFixed(1)}% por Agua` : '0.0% Reducción por Agua';

    const recomendaciones = [];
    if (zEval <= zSuperficie) {
        recomendaciones.push(`La cota evaluada (${zEval.toFixed(2)} m) está en o por encima del inicio del perfil (${zSuperficie.toFixed(2)} m), por lo que no hay carga de suelo suprayacente (σ' = 0).`);
    } else if (tieneNF && evalDf.u > 0) {
        const hAgua = zEval - Math.max(zSuperficie, cotaNF);
        recomendaciones.push(`A la cota ${zEval.toFixed(2)} m existe una altura de agua sobre el punto de evaluación de ${hAgua.toFixed(2)} m (Nivel Freático en ${cotaNF.toFixed(2)} m).`);
        recomendaciones.push(`El empuje hidrostático (u = ${evalDf.u.toFixed(2)} Tn/m²) reduce el esfuerzo efectivo del suelo en un ${pctReduccion.toFixed(1)}%, pasando de ${evalDf.sigma.toFixed(2)} a ${evalDf.efectivo.toFixed(2)} Tn/m².`);
        recomendaciones.push(`El esfuerzo efectivo disponible a ${zEval.toFixed(2)} m para movilizar resistencia friccionante en la cimentación es de ${(evalDf.efectivo * 0.1).toFixed(3)} kg/cm² (${(evalDf.efectivo * 9.81).toFixed(1)} kPa).`);
    } else if (tieneNF && evalDf.u === 0) {
        recomendaciones.push(`La cota evaluada (${zEval.toFixed(2)} m) se encuentra por encima del Nivel Freático (${cotaNF.toFixed(2)} m), por lo que la presión de poros en ese nivel es u = 0.00 Tn/m².`);
        recomendaciones.push(`El Esfuerzo Efectivo conserva el 100% del Esfuerzo Total: σ' = ${evalDf.efectivo.toFixed(2)} Tn/m² (${(evalDf.efectivo * 0.1).toFixed(3)} kg/cm²).`);
        if (cotaNF < zFondo) {
            recomendaciones.push(`A partir de ${cotaNF.toFixed(2)} m hacia el fondo (${zFondo.toFixed(2)} m) el suelo se satura, alcanzando una presión de poros de ${evalFondo.u.toFixed(2)} Tn/m² en la base.`);
        }
    } else {
        recomendaciones.push(`Perfil analizado en condición sin Nivel Freático (u = 0.00 Tn/m² en todos los estratos).`);
        recomendaciones.push(`En la cota ${zEval.toFixed(2)} m, el Esfuerzo Efectivo es igual al Esfuerzo Total: σ' = ${evalDf.efectivo.toFixed(2)} Tn/m² (${(evalDf.efectivo * 0.1).toFixed(3)} kg/cm²).`);
        recomendaciones.push(`En la base del perfil (${zFondo.toFixed(2)} m), el suelo alcanza un esfuerzo efectivo máximo de ${evalFondo.efectivo.toFixed(2)} Tn/m² (${(evalFondo.efectivo * 0.1).toFixed(3)} kg/cm²).`);
    }

    document.getElementById('out-m2-recomendaciones').innerHTML =
        recomendaciones.map(r => `<li>${r}</li>`).join('');
}

function dibujarPerfilVisualM2() {
    const cont = document.getElementById('contenedor-perfil-visual');
    if (!cont || !estratosM2.length) return;
    cont.innerHTML = '';

    const zMin = estratosM2[0].zInicio;
    const zMax = estratosM2[estratosM2.length - 1].zFin;
    const espesorTotal = Math.max(0.1, zMax - zMin);

    const tieneNF = document.getElementById('m2-tiene-nf').checked;
    const zNF = parseFloat(document.getElementById('m2-nf-prof').value);
    const cotaNF = isNaN(zNF) ? 0 : zNF;

    estratosM2.forEach((est, idx) => {
        const espesor = Math.max(0, est.zFin - est.zInicio);
        const pctAltura = (espesor / espesorTotal) * 100;

        const capa = document.createElement('div');
        capa.className = 'stratum-layer-visual';
        capa.style.height = `${pctAltura}%`;
        capa.style.backgroundColor = est.color;

        capa.innerHTML = `
            <span class="depth-marker-label" style="top: 4px;">${est.zInicio.toFixed(2)} m</span>
            <div class="stratum-layer-pill">
                Estrato ${idx + 1} | e = ${espesor.toFixed(2)} m | γ = ${est.gamma.toFixed(2)} Tn/m³
            </div>
            ${idx === estratosM2.length - 1 ? `<span class="depth-marker-label" style="bottom: 4px;">${est.zFin.toFixed(2)} m</span>` : ''}
        `;
        cont.appendChild(capa);
    });

    if (tieneNF && cotaNF >= zMin && cotaNF <= zMax) {
        const pctTopNF = ((cotaNF - zMin) / espesorTotal) * 100;

        const sombreadoAgua = document.createElement('div');
        sombreadoAgua.className = 'water-zone-shade';
        sombreadoAgua.style.top = `${pctTopNF}%`;
        cont.appendChild(sombreadoAgua);

        const lineaAgua = document.createElement('div');
        lineaAgua.className = 'water-table-line';
        lineaAgua.style.top = `${pctTopNF}%`;
        lineaAgua.innerHTML = `<span class="water-table-badge">▼ N.F. = ${cotaNF.toFixed(2)} m</span>`;
        cont.appendChild(lineaAgua);
    }
}

function crearConfigGraficaEsfuerzo(tituloEjeX, colorLinea, colorFondo) {
    return {
        type: 'scatter',
        data: {
            datasets: [{
                label: tituloEjeX,
                data: [],
                showLine: true,
                borderColor: colorLinea,
                backgroundColor: colorFondo,
                borderWidth: 3,
                pointBackgroundColor: colorLinea,
                pointBorderColor: '#0f172a',
                pointBorderWidth: 1.5,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: 'origin',
                tension: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    callbacks: {
                        title: (items) => `Profundidad Z = ${items[0].raw.y.toFixed(2)} m`,
                        label: (item) => `${tituloEjeX}: ${item.raw.x.toFixed(2)} Tn/m² (${item.raw.desc || ''})`
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'top',
                    min: 0,
                    title: {
                        display: true,
                        text: `${tituloEjeX} (Tn/m²)`,
                        font: { weight: 'bold', size: 11 },
                        color: '#0f172a'
                    },
                    grid: { color: '#e2e8f0' }
                },
                y: {
                    type: 'linear',
                    reverse: true,
                    title: {
                        display: true,
                        text: 'Profundidad Z (m)',
                        font: { weight: 'bold', size: 11 },
                        color: '#0f172a'
                    },
                    ticks: {
                        callback: (val) => `${Number(val).toFixed(1)} m`
                    },
                    grid: { color: '#e2e8f0' }
                }
            }
        }
    };
}

function inicializarGraficasModulo2() {
    const c1 = document.getElementById('chartEsfuerzoTotal');
    const c2 = document.getElementById('chartPresionPoros');
    const c3 = document.getElementById('chartEsfuerzoEfectivo');
    if (!c1 || !c2 || !c3) return;

    chartSigmaTotal = new Chart(
        c1.getContext('2d'),
        crearConfigGraficaEsfuerzo('Esfuerzo Total σ', '#f59e0b', 'rgba(245, 158, 11, 0.18)')
    );
    chartPresionU = new Chart(
        c2.getContext('2d'),
        crearConfigGraficaEsfuerzo('Presión de Poros u', '#0284c7', 'rgba(2, 132, 199, 0.18)')
    );
    chartSigmaEfectivo = new Chart(
        c3.getContext('2d'),
        crearConfigGraficaEsfuerzo("Esfuerzo Efectivo σ'", '#10b981', 'rgba(16, 185, 129, 0.18)')
    );
}

function actualizarGraficasModulo2(ptsTotal, ptsPoros, ptsEfectivo, zMin, zMax, maxX) {
    if (!chartSigmaTotal || !chartPresionU || !chartSigmaEfectivo) return;

    const maxRedondeado = Math.ceil(maxX * 2) / 2;

    [
        { chart: chartSigmaTotal, pts: ptsTotal },
        { chart: chartPresionU, pts: ptsPoros },
        { chart: chartSigmaEfectivo, pts: ptsEfectivo }
    ].forEach(({ chart, pts }) => {
        chart.data.datasets[0].data = pts;
        chart.options.scales.y.min = zMin;
        chart.options.scales.y.max = zMax;
        chart.options.scales.x.max = maxRedondeado;
        chart.update();
    });
}

// ============================================================================
// MÓDULO 3: BASE DE DATOS DE PERMEABILIDAD (SUCS) Y LEY DE DARCY (v = k · i)
// ============================================================================
const DB_PERMEABILIDAD_SUCS = {
    'GW': {
        codigo: 'GW',
        nombre: 'Grava bien gradada, limpia',
        rangoTexto: '1.0 × 10⁻¹ a 1.0 × 10²',
        kMin: 0.1,
        kMax: 100,
        kRecomendado: 1.5,
        porosidad: 0.28,
        grado: 'Muy Alta',
        drenaje: 'Excelente (Bombeo de alto caudal / tablestacado requerido)'
    },
    'GP': {
        codigo: 'GP',
        nombre: 'Grava mal gradada, limpia',
        rangoTexto: '1.0 × 10⁰ a 1.0 × 10²',
        kMin: 1.0,
        kMax: 100,
        kRecomendado: 5.0,
        porosidad: 0.30,
        grado: 'Muy Alta',
        drenaje: 'Excelente (Ingreso inmediato de agua a la excavación)'
    },
    'GM': {
        codigo: 'GM',
        nombre: 'Grava limosa',
        rangoTexto: '1.0 × 10⁻⁵ a 1.0 × 10⁻²',
        kMin: 0.00001,
        kMax: 0.01,
        kRecomendado: 0.001,
        porosidad: 0.32,
        grado: 'Media a Baja',
        drenaje: 'Regular (Bombeo mediante zanjas perimetrales y sumideros)'
    },
    'GC': {
        codigo: 'GC',
        nombre: 'Grava arcillosa',
        rangoTexto: '1.0 × 10⁻⁷ a 1.0 × 10⁻⁴',
        kMin: 0.0000001,
        kMax: 0.0001,
        kRecomendado: 0.00001,
        porosidad: 0.33,
        grado: 'Baja a Muy Baja',
        drenaje: 'Pobre (Baja filtración hacia el fondo de la zapata)'
    },
    'SW': {
        codigo: 'SW',
        nombre: 'Arena bien gradada, limpia',
        rangoTexto: '1.0 × 10⁻³ a 1.0 × 10⁻¹',
        kMin: 0.001,
        kMax: 0.1,
        kRecomendado: 0.01,
        porosidad: 0.35,
        grado: 'Alta',
        drenaje: 'Bueno (Requiere bombeo continuo o punteras Wellpoint)'
    },
    'SP': {
        codigo: 'SP',
        nombre: 'Arena mal gradada, limpia',
        rangoTexto: '1.0 × 10⁻³ a 5.0 × 10⁻¹',
        kMin: 0.001,
        kMax: 0.5,
        kRecomendado: 0.03,
        porosidad: 0.37,
        grado: 'Alta',
        drenaje: 'Bueno (Cuidado con sifonamiento y paredes inestables)'
    },
    'SM': {
        codigo: 'SM',
        nombre: 'Arena limosa (Suelo del Informe)',
        rangoTexto: '1.0 × 10⁻⁵ a 1.0 × 10⁻³',
        kMin: 0.00001,
        kMax: 0.001,
        kRecomendado: 0.0005,
        porosidad: 0.35,
        grado: 'Media a Baja',
        drenaje: 'Regular (Agotamiento con bomba sumergible en sumidero)'
    },
    'SC': {
        codigo: 'SC',
        nombre: 'Arena arcillosa',
        rangoTexto: '1.0 × 10⁻⁷ a 1.0 × 10⁻⁴',
        kMin: 0.0000001,
        kMax: 0.0001,
        kRecomendado: 0.00002,
        porosidad: 0.36,
        grado: 'Baja',
        drenaje: 'Pobre (Filtración lenta, controlable con zanja colectora)'
    },
    'ML': {
        codigo: 'ML',
        nombre: 'Limo inorgánico de baja plasticidad',
        rangoTexto: '1.0 × 10⁻⁶ a 1.0 × 10⁻⁴',
        kMin: 0.000001,
        kMax: 0.0001,
        kRecomendado: 0.00001,
        porosidad: 0.40,
        grado: 'Baja',
        drenaje: 'Pobre (Susceptible a ablandamiento del fondo con agua)'
    },
    'CL': {
        codigo: 'CL',
        nombre: 'Arcilla de baja plasticidad',
        rangoTexto: '1.0 × 10⁻⁸ a 1.0 × 10⁻⁶',
        kMin: 0.00000001,
        kMax: 0.000001,
        kRecomendado: 0.0000001,
        porosidad: 0.42,
        grado: 'Muy Baja (Práct. Impermeable)',
        drenaje: 'Prácticamente Impermeable (Excavación casi seca a corto plazo)'
    },
    'MH': {
        codigo: 'MH',
        nombre: 'Limo de alta plasticidad',
        rangoTexto: '1.0 × 10⁻⁷ a 1.0 × 10⁻⁵',
        kMin: 0.0000001,
        kMax: 0.00001,
        kRecomendado: 0.000001,
        porosidad: 0.44,
        grado: 'Muy Baja',
        drenaje: 'Malo (Proteger fondo con solado de concreto inmediato)'
    },
    'CH': {
        codigo: 'CH',
        nombre: 'Arcilla de alta plasticidad',
        rangoTexto: '1.0 × 10⁻⁹ a 1.0 × 10⁻⁷',
        kMin: 0.000000001,
        kMax: 0.0000001,
        kRecomendado: 0.00000001,
        porosidad: 0.46,
        grado: 'Impermeable',
        drenaje: 'Impermeable (Flujo insignificante; controlar cambios volumétricos)'
    }
};

let chartDarcy = null;
let sucsActivoM3 = 'SM';

window.addEventListener('DOMContentLoaded', () => {
    inicializarSelectYTablaDBM3();
    inicializarGraficaModulo3();
    cargarDatosInformeM3();
});

// Normaliza símbolos compuestos (ej. 'SW-SM' -> 'SM', 'CL-ML' -> 'ML') para encontrar su valor en la BD
function obtenerClaveDBPermeabilidad(simboloSUCS) {
    if (!simboloSUCS) return 'SM';
    const limpio = simboloSUCS.trim().toUpperCase();
    if (DB_PERMEABILIDAD_SUCS[limpio]) return limpio;

    if (limpio === 'CL-ML') return 'ML';
    if (limpio.includes('-')) {
        const partes = limpio.split('-');
        if (DB_PERMEABILIDAD_SUCS[partes[1]]) return partes[1];
        if (DB_PERMEABILIDAD_SUCS[partes[0]]) return partes[0];
    }
    return 'SM';
}

function formatearCientifico(num) {
    if (!num || num <= 0) return '0';
    if (num >= 0.01 && num < 1000) return Number(num.toPrecision(3)).toString();
    const exp = Math.floor(Math.log10(num));
    const mantisa = (num / Math.pow(10, exp)).toFixed(2);
    const superindices = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    const expTexto = String(exp).split('').map(c => superindices[c] || c).join('');
    return `${mantisa} × 10${expTexto}`;
}

// Devuelve HTML limpio con etiqueta <sup> para que en la tabla se lea perfecto
function formatearCientificoHTML(num) {
    if (!num || num <= 0) return '0';
    if (num >= 0.1 && num < 1000) return `${num.toFixed(2)} cm/s`;
    const exp = Math.floor(Math.log10(num));
    const mantisa = (num / Math.pow(10, exp)).toFixed(2);
    return `${mantisa} × 10<sup>${exp}</sup> cm/s`;
}

// Muestra el valor decimal exacto sin notación "1e-7" ilegible
function formatearDecimalK(num) {
    if (!num || num <= 0) return '0';
    if (num >= 0.01) return `${num} cm/s`;
    const decimales = Math.min(9, Math.max(4, -Math.floor(Math.log10(num)) + 1));
    return `${num.toFixed(decimales)} cm/s`;
}

function inicializarSelectYTablaDBM3() {
    const select = document.getElementById('m3-select-suelo');
    if (!select) return;
    select.innerHTML = '';

    Object.values(DB_PERMEABILIDAD_SUCS).forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.codigo;
        opt.textContent = `${item.codigo} — ${item.nombre} (k = ${formatearCientifico(item.kRecomendado)} cm/s)`;
        select.appendChild(opt);
    });

    renderizarTablaDBM3();
}

function renderizarTablaDBM3() {
    const tbody = document.getElementById('tbody-db-permeabilidad');
    if (!tbody) return;
    tbody.innerHTML = '';

    Object.values(DB_PERMEABILIDAD_SUCS).forEach(item => {
        const tr = document.createElement('tr');
        const esActivo = item.codigo === sucsActivoM3;
        if (esActivo) {
            tr.classList.add('highlight-sieve');
        }

        const rangoHTML = `${formatearCientificoHTML(item.kMin).replace(' cm/s', '')} &nbsp;a&nbsp; ${formatearCientificoHTML(item.kMax)}`;

        tr.innerHTML = `
            <td><span class="sucs-pill-table">${item.codigo}</span></td>
            <td style="text-align: left; font-weight: 500;">${item.nombre}</td>
            <td class="k-cell-nowrap">${rangoHTML}</td>
            <td class="k-cell-nowrap"><strong>${formatearCientificoHTML(item.kRecomendado)}</strong></td>
            <td class="k-cell-decimal">${formatearDecimalK(item.kRecomendado)}</td>
            <td><span class="perm-grade-badge">${item.grado}</span></td>
            <td>
                <button class="btn-use-k ${esActivo ? 'active-k-btn' : ''}" onclick="seleccionarFilaDBM3('${item.codigo}')">
                    ${esActivo ? '✓ Adoptado' : 'Adoptar k'}
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function sincronizarSUCSDesdeModulo1(simboloM1) {
    const badge = document.getElementById('m3-badge-sucs-detectado');
    if (badge) badge.textContent = simboloM1;

    const autoActivo = document.getElementById('m3-auto-sucs')?.checked;
    if (!autoActivo) return;

    const claveDB = obtenerClaveDBPermeabilidad(simboloM1);
    aplicarSueloDBM3(claveDB);
}

function alCambiarModoAutoSUCSM3() {
    const autoActivo = document.getElementById('m3-auto-sucs').checked;
    const select = document.getElementById('m3-select-suelo');
    select.disabled = autoActivo;

    if (autoActivo) {
        const simboloActualM1 = document.getElementById('out-sucs-simbolo')?.textContent || 'SM';
        sincronizarSUCSDesdeModulo1(simboloActualM1);
    }
}

function alSeleccionarSueloDBM3() {
    const codigo = document.getElementById('m3-select-suelo').value;
    aplicarSueloDBM3(codigo);
}

function seleccionarFilaDBM3(codigo) {
    const checkAuto = document.getElementById('m3-auto-sucs');
    const select = document.getElementById('m3-select-suelo');
    if (checkAuto) checkAuto.checked = false;
    if (select) select.disabled = false;
    aplicarSueloDBM3(codigo);
}

function aplicarSueloDBM3(codigo) {
    const info = DB_PERMEABILIDAD_SUCS[codigo] || DB_PERMEABILIDAD_SUCS['SM'];
    sucsActivoM3 = info.codigo;

    const select = document.getElementById('m3-select-suelo');
    if (select) select.value = info.codigo;

    const inputK = document.getElementById('m3-k-input');
    if (inputK) inputK.value = info.kRecomendado;

    const inputN = document.getElementById('m3-porosidad-n');
    if (inputN) inputN.value = info.porosidad.toFixed(2);

    const notaRango = document.getElementById('m3-rango-db-nota');
    if (notaRango) {
        notaRango.textContent = `Rango ${info.codigo}: ${info.rangoTexto} cm/s (${info.grado})`;
    }

    renderizarTablaDBM3();
    calcularModulo3();
}

function alEditarKManualM3() {
    const checkAuto = document.getElementById('m3-auto-sucs');
    const select = document.getElementById('m3-select-suelo');
    if (checkAuto) checkAuto.checked = false;
    if (select) select.disabled = false;
    calcularModulo3();
}

function alternarModoGradienteM3() {
    const esDirecto = document.getElementById('m3-modo-gradiente-directo').checked;
    const inputDh = document.getElementById('m3-dh-input');
    const inputL = document.getElementById('m3-l-flujo');
    const inputI = document.getElementById('m3-i-input');
    const notaI = document.getElementById('m3-i-nota');

    inputDh.disabled = esDirecto;
    inputL.disabled = esDirecto;
    inputI.readOnly = !esDirecto;

    if (esDirecto) {
        inputI.classList.remove('readonly-input');
        notaI.textContent = 'Modo directo activado: edita el gradiente i libremente';
    } else {
        inputI.classList.add('readonly-input');
        notaI.textContent = 'Calculado automáticamente: i = Δh / L (Adimensional)';
    }
    calcularModulo3();
}

function cargarDatosInformeM3() {
    document.getElementById('m3-auto-sucs').checked = true;
    document.getElementById('m3-select-suelo').disabled = true;
    document.getElementById('m3-modo-gradiente-directo').checked = false;

    // Tomar el desnivel del agua del informe: Df = 2.00 m y Zw = 1.80 m -> Δh = 0.20 m
    document.getElementById('m3-dh-input').disabled = false;
    document.getElementById('m3-l-flujo').disabled = false;
    document.getElementById('m3-dh-input').value = '0.20';
    document.getElementById('m3-l-flujo').value = '0.80';
    document.getElementById('m3-ancho-b').value = '1.50';
    document.getElementById('m3-largo-l').value = '1.50';

    const inputI = document.getElementById('m3-i-input');
    inputI.readOnly = true;
    inputI.classList.add('readonly-input');

    const simboloM1 = document.getElementById('out-sucs-simbolo')?.textContent || 'SM';
    aplicarSueloDBM3(obtenerClaveDBPermeabilidad(simboloM1));
}

function calcularModulo3() {
    const kVal = parseFloat(document.getElementById('m3-k-input')?.value);
    const k = (!isNaN(kVal) && kVal > 0) ? kVal : 0.0005; // cm/s

    document.getElementById('m3-k-notacion').textContent =
        `Notación científica: k = ${formatearCientifico(k)} cm/s`;

    const esGradienteDirecto = document.getElementById('m3-modo-gradiente-directo')?.checked;
    const dh = Math.max(0, parseFloat(document.getElementById('m3-dh-input')?.value) || 0);
    const lFlujo = Math.max(0.05, parseFloat(document.getElementById('m3-l-flujo')?.value) || 0.80);

    let i = 0;
    if (esGradienteDirecto) {
        i = Math.max(0, parseFloat(document.getElementById('m3-i-input')?.value) || 0);
    } else {
        i = dh / lFlujo;
        document.getElementById('m3-i-input').value = i.toFixed(3);
    }

    const anchoB = Math.max(0.1, parseFloat(document.getElementById('m3-ancho-b')?.value) || 1.50);
    const largoLz = Math.max(0.1, parseFloat(document.getElementById('m3-largo-l')?.value) || 1.50);
    const porosidad = Math.min(0.8, Math.max(0.05, parseFloat(document.getElementById('m3-porosidad-n')?.value) || 0.35));

    const areaExcavacion = anchoB * largoLz; // m²
    document.getElementById('m3-area-texto').textContent = `${areaExcavacion.toFixed(2)} m²`;

    // 1. Ley de Darcy: v = k * i
    const vCms = k * i;                  // cm/s
    const vMs = vCms / 100;              // m/s
    const vCmHora = vCms * 3600;         // cm/hora
    const vMDia = vMs * 86400;           // m/día
    const vsCms = vCms / porosidad;      // Velocidad real intersticial (cm/s)

    // 2. Caudal de filtración hacia la excavación: Q = v * A
    const qM3s = vMs * areaExcavacion;   // m³/s
    const qLmin = qM3s * 1000 * 60;      // Litros/minuto
    const qLhora = qLmin * 60;           // Litros/hora
    const qM3dia = qM3s * 86400;         // m³/día

    // 3. Tiempo en inundar una lámina de 10 cm (0.10 m) en el fondo de la excavación
    // Como Q = v * A y Volumen = 0.10 * A, el tiempo depende directamente de t = 10 cm / v (cm/s)
    const tiempoSegundos10cm = vCms > 0 ? (10 / vCms) : Infinity;
    let textoTiempo10cm = 'Sin flujo (i = 0)';
    if (isFinite(tiempoSegundos10cm)) {
        const minutos = tiempoSegundos10cm / 60;
        const horas = minutos / 60;
        const dias = horas / 24;
        if (minutos < 60) {
            textoTiempo10cm = `${minutos.toFixed(1)} min`;
        } else if (horas < 48) {
            textoTiempo10cm = `${horas.toFixed(1)} horas`;
        } else {
            textoTiempo10cm = `${dias.toFixed(1)} días`;
        }
    }

    // Actualizar indicadores rápidos
    document.getElementById('m3-out-v-cms').textContent = `${formatearCientifico(vCms)} cm/s`;
    document.getElementById('m3-out-v-mdia').textContent = `${vMDia.toFixed(3)} m/día`;
    document.getElementById('m3-out-vs-cms').textContent = `${formatearCientifico(vsCms)} cm/s`;
    document.getElementById('m3-out-q-lmin').textContent = `${qLmin.toFixed(3)} L/min`;
    document.getElementById('m3-out-q-mdia').textContent = `${qM3dia.toFixed(3)} m³/día`;
    document.getElementById('m3-out-tiempo-10cm').textContent = textoTiempo10cm;

    // Actualizar esquema visual y gráfica
    const infoSuelo = DB_PERMEABILIDAD_SUCS[sucsActivoM3] || DB_PERMEABILIDAD_SUCS['SM'];
    dibujarEsquemaFlujoM3(dh, lFlujo, i, anchoB, largoLz, vCms, qLmin, infoSuelo);
    actualizarGraficaModulo3(k, areaExcavacion, i, vMDia, qLmin);

    // Actualizar tarjetas inferiores de resultados y decisión geotécnica
    document.getElementById('m3-card-velocidad').textContent = `${vMDia.toFixed(3)} m/día`;
    document.getElementById('m3-card-subtitulo').textContent =
        `Velocidad de descarga v = ${formatearCientifico(vCms)} cm/s (${vCmHora.toFixed(2)} cm/hora) en suelo ${infoSuelo.codigo}`;

    document.getElementById('m3-lista-calculos').innerHTML = `
        <li>Suelo adoptado de la Base de Datos: <strong>${infoSuelo.codigo} (${infoSuelo.nombre})</strong> con k = <strong>${formatearCientifico(k)} cm/s</strong></li>
        <li>Gradiente hidráulico aplicado: <strong>i = ${i.toFixed(3)}</strong> ${esGradienteDirecto ? '(Ingreso directo)' : `(Δh = ${dh.toFixed(2)} m / L = ${lFlujo.toFixed(2)} m)`}</li>
        <li>Velocidad de flujo de Darcy: <strong>v = k · i = ${formatearCientifico(vCms)} cm/s</strong> (${vMDia.toFixed(3)} m/día)</li>
        <li>Velocidad real en los poros (n = ${porosidad.toFixed(2)}): <strong>vs = v / n = ${formatearCientifico(vsCms)} cm/s</strong> (${(vMDia / porosidad).toFixed(3)} m/día)</li>
    `;

    document.getElementById('m3-card-caudal').textContent =
        qLmin >= 1 ? `${qLmin.toFixed(2)} L/min` : `${qLhora.toFixed(2)} L/hora`;
    document.getElementById('m3-card-veredicto').textContent =
        `Caudal hacia la zapata (${anchoB.toFixed(2)} m × ${largoLz.toFixed(2)} m → A = ${areaExcavacion.toFixed(2)} m²): ${qM3dia.toFixed(3)} m³/día`;

    const recomendaciones = [];
    if (i <= 0 || vCms <= 0) {
        recomendaciones.push(`El gradiente hidráulico es i = 0 (el Nivel Freático no supera la cota de excavación), por lo que no ingresa flujo de agua hacia la cimentación.`);
    } else {
        recomendaciones.push(`Para acumular una lámina de 10 cm de agua en el fondo de la excavación (${areaExcavacion.toFixed(2)} m²) tardaría <strong>${textoTiempo10cm}</strong> (Volumen = ${(0.10 * areaExcavacion * 1000).toFixed(0)} Litros).`);
        recomendaciones.push(`Clasificación de permeabilidad: <strong>${infoSuelo.grado}</strong>. Recomendación constructiva: ${infoSuelo.drenaje}.`);
        if (i >= 0.85) {
            recomendaciones.push(`⚠️ Alerta Geotécnica: El gradiente hidráulico (i = ${i.toFixed(2)}) se acerca o supera el gradiente crítico de ebullición/sifonamiento (ic ≈ 0.9 a 1.0). Aumente la longitud de recorrido L o deprima el nivel freático antes de excavar.`);
        } else {
            recomendaciones.push(`Seguridad hidráulica: El gradiente de trabajo (i = ${i.toFixed(2)}) es inferior al gradiente crítico de sifonamiento (ic ≈ 1.00), manteniendo estable el fondo de la zapata.`);
        }
    }

    document.getElementById('m3-lista-recomendaciones').innerHTML =
        recomendaciones.map(r => `<li>${r}</li>`).join('');
}

function dibujarEsquemaFlujoM3(dh, lFlujo, i, anchoB, largoLz, vCms, qLmin, infoSuelo) {
    const cont = document.getElementById('m3-esquema-flujo');
    if (!cont) return;

    const kActual = parseFloat(document.getElementById('m3-k-input')?.value) || 0.0005;
    const area = anchoB * largoLz;
    const hayFlujo = i > 0 && vCms > 0;

    document.getElementById('m3-badge-esquema').textContent =
        `Suelo ${infoSuelo.codigo} | k = ${formatearCientifico(kActual)} cm/s | i = ${i.toFixed(2)} | A = ${area.toFixed(2)} m²`;

    cont.innerHTML = `
        <div class="seepage-diagram-box">
            <!-- Columna Izquierda: Terreno Saturado y Nivel Freático -->
            <div class="seepage-soil-side">
                <div class="seepage-wt-tag">▼ Nivel Freático Exterior (Carga Δh = ${dh.toFixed(2)} m)</div>
                <div class="seepage-water-mass">
                    <div class="seepage-soil-title">Estrato Permeable (${infoSuelo.codigo})</div>
                    <div class="seepage-data-row"><span>Coeficiente k:</span> <strong>${formatearCientificoHTML(kActual)}</strong></div>
                    <div class="seepage-data-row"><span>Recorrido de flujo (L):</span> <strong>${lFlujo.toFixed(2)} m</strong></div>
                    <div class="seepage-data-row"><span>Gradiente (i = Δh/L):</span> <strong>${i.toFixed(3)}</strong></div>
                </div>
                <div class="seepage-flow-direction">
                    ${hayFlujo ? '➔ Líneas de flujo infiltrándose hacia la zapata ➔' : 'Sin desnivel hidráulico (Δh = 0 m)'}
                </div>
            </div>

            <!-- Columna Derecha: Zona de Excavación de la Zapata -->
            <div class="seepage-pit-center">
                <div class="seepage-pit-header">
                    <span>ZONA DE EXCAVACIÓN / CIMENTACIÓN</span>
                    <strong>Zapata: B = ${anchoB.toFixed(2)} m × Lz = ${largoLz.toFixed(2)} m (Área = ${area.toFixed(2)} m²)</strong>
                </div>
                <div class="seepage-pit-wall">
                    <div class="footing-sketch-block">ZAPATA DE CONCRETO (Df)</div>
                </div>
                <div class="seepage-pit-bottom ${hayFlujo ? 'pit-flowing' : ''}">
                    <div class="seepage-arrows">
                        ${hayFlujo ? '▲ ▲ ▲  Ingreso de Agua al Fondo (v = ' + formatearCientifico(vCms) + ' cm/s)  ▲ ▲ ▲' : 'Fondo de excavación seco (v = 0 cm/s)'}
                    </div>
                    <div class="seepage-q-pill">
                        Caudal infiltrado Q = <strong>${qLmin.toFixed(3)} L/min</strong> &nbsp;|&nbsp; <strong>${(qLmin * 60).toFixed(1)} L/hora</strong>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function inicializarGraficaModulo3() {
    const canvas = document.getElementById('chartDarcyFlujo');
    if (!canvas) return;

    chartDarcy = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Velocidad de Flujo v (m/día)',
                    data: [],
                    borderColor: '#0284c7',
                    backgroundColor: 'rgba(2, 132, 199, 0.14)',
                    borderWidth: 3,
                    pointRadius: 4,
                    fill: true,
                    tension: 0.2,
                    yAxisID: 'y'
                },
                {
                    label: 'Punto de Diseño Actual',
                    data: [],
                    borderColor: '#f59e0b',
                    backgroundColor: '#f59e0b',
                    pointBorderColor: '#0f172a',
                    pointBorderWidth: 2,
                    pointRadius: 8,
                    pointHoverRadius: 10,
                    showLine: false,
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    backgroundColor: '#0f172a',
                    callbacks: {
                        title: (items) => `Gradiente Hidráulico i = ${items[0].parsed.x.toFixed(2)}`,
                        label: (item) => ` Velocidad v: ${item.parsed.y.toFixed(4)} m/día`
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: 0,
                    max: 1.2,
                    title: {
                        display: true,
                        text: 'Gradiente Hidráulico (i = Δh / L)',
                        font: { weight: 'bold', size: 12 },
                        color: '#0f172a'
                    },
                    grid: { color: '#e2e8f0' }
                },
                y: {
                    type: 'linear',
                    min: 0,
                    title: {
                        display: true,
                        text: 'Velocidad de Filtración v (m/día)',
                        font: { weight: 'bold', size: 12 },
                        color: '#0f172a'
                    },
                    grid: { color: '#e2e8f0' }
                }
            }
        }
    });
}

function actualizarGraficaModulo3(kCms, areaM2, iActual, vMDiaActual, qLminActual) {
    if (!chartDarcy) return;

    const maxGradiente = Math.max(1.0, Number((iActual * 1.3).toFixed(1)));
    const pasos = [0, 0.1, 0.2, 0.25, 0.4, 0.6, 0.8, 1.0];
    if (iActual > 1.0) pasos.push(Number(iActual.toFixed(2)), maxGradiente);

    const kMDia = (kCms / 100) * 86400;
    const puntosLinea = pasos.map(grad => ({
        x: grad,
        y: Number((kMDia * grad).toFixed(5))
    }));

    chartDarcy.options.scales.x.max = maxGradiente;
    chartDarcy.data.datasets[0].data = puntosLinea;
    chartDarcy.data.datasets[1].data = [{ x: Number(iActual.toFixed(3)), y: Number(vMDiaActual.toFixed(5)) }];
    chartDarcy.update();
}