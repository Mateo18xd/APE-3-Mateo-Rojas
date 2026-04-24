const sleep = ms => new Promise(r => setTimeout(r, ms));

function log(termId, msg, type = "") {
    const term = document.getElementById(termId);
    const color = type === "err" ? "color: #ff5555" : type === "info" ? "color: #5bc0de" : "";
    term.innerHTML += `<div style="${color}">> ${msg}</div>`;
    term.scrollTop = term.scrollHeight;
}

//  CLASES DE SINCRONIZACIÓN 
class Semaforo {
    constructor(valor) {
        this.valor = valor;
        this.cola = [];
    }
    async wait() {
        if (this.valor > 0) {
            this.valor--;
            return Promise.resolve();
        }
        return new Promise(resolve => this.cola.push(resolve));
    }
    signal() {
        if (this.cola.length > 0) {
            const resolve = this.cola.shift();
            resolve();
        } else {
            this.valor++;
        }
    }
}

class Mutex extends Semaforo {
    constructor() { super(1); }
    async lock() { return this.wait(); }
    unlock() { this.signal(); }
}

class Barrera {
    constructor(total) {
        this.total = total;
        this.contador = 0;
        this.cola = [];
        this.mutex = new Mutex();
    }
    async wait(id) {
        await this.mutex.lock();
        this.contador++;
        document.getElementById(`dot${id}`).classList.add('ready');
        document.getElementById('met5').innerText = `Hilos en la barrera: ${this.contador} / ${this.total}`;
        
        if (this.contador === this.total) {
            await sleep(500); // Pausa dramática
            this.cola.forEach(resolve => resolve());
            this.cola = [];
            this.contador = 0;
            this.mutex.unlock();
        } else {
            this.mutex.unlock();
            await new Promise(resolve => this.cola.push(resolve));
        }
    }
}

// EJERCICIOS 

// 1. MUTEX - VENTA ATÓMICA DE BOLETOS
async function ejecutarMutex() {
    const btn = document.getElementById('btn1');
    btn.disabled = true;
    document.getElementById('term1').innerHTML = "";
    
    const N_HILOS = parseInt(document.getElementById('input_hilos').value) || 5;
    const M_VENTAS = parseInt(document.getElementById('input_ventas').value) || 1000000;
    
    const MUTEX = new Mutex();
    let boletos_vendidos = 0;
    const TOTAL_ESPERADO = N_HILOS * M_VENTAS;

    const ventas_por_hilo = Array(N_HILOS).fill(0);
    
    const container = document.getElementById('met1_hilos_container');
    container.innerHTML = '';
    for(let i = 1; i <= N_HILOS; i++) {
        const div = document.createElement('div');
        div.id = `met1_hilo${i}`;
        div.style.margin = '5px 0';
        div.innerText = `Hilo ${i}: 0 / ${M_VENTAS.toLocaleString('es-ES')}`;
        container.appendChild(div);
    }
    
    log('term1', `🎫 ALGORITMO VentaAtómica - Iniciando...`, "info");
    log('term1', `   N_HILOS: ${N_HILOS}`);
    log('term1', `   M_VENTAS: ${M_VENTAS.toLocaleString('es-ES')}`);
    log('term1', `   TOTAL ESPERADO: ${TOTAL_ESPERADO.toLocaleString('es-ES')}`);
    log('term1', `   Inicializando mutex...`);

    async function EjecutarVenta(id_hilo) {
        let contador_local = 0;
        for(let i = 1; i <= M_VENTAS; i++) {
        
            await MUTEX.lock();
            
            boletos_vendidos++;
            contador_local++;
            ventas_por_hilo[id_hilo - 1]++;
            
            if(boletos_vendidos % 50000 === 0) {
                document.getElementById('prog1').style.width = `${(boletos_vendidos/TOTAL_ESPERADO)*100}%`;
                document.getElementById('met1').innerText = `Boletos vendidos: ${boletos_vendidos.toLocaleString('es-ES')} / ${TOTAL_ESPERADO.toLocaleString('es-ES')}`;
                
                for(let j = 1; j <= N_HILOS; j++) {
                    document.getElementById(`met1_hilo${j}`).innerText = `Hilo ${j}: ${ventas_por_hilo[j-1].toLocaleString('es-ES')} / ${M_VENTAS.toLocaleString('es-ES')}`;
                }
            }
            
            MUTEX.unlock(); 
            
            if(i % 10000 === 0) await sleep(1);
        }
        log('term1', `✅ Hilo ${id_hilo} completó ${contador_local.toLocaleString('es-ES')} ventas`, "info");
    }

    const inicio = Date.now();
    log('term1', `Lanzando ${N_HILOS} hilos...`);
    
    const hilos = [];
    for(let i = 1; i <= N_HILOS; i++) {
        hilos.push(EjecutarVenta(i));
    }
    
    await Promise.all(hilos);
    
    const tiempo = ((Date.now() - inicio) / 1000).toFixed(2);
    const correcto = boletos_vendidos === TOTAL_ESPERADO ? "✅ CORRECTO" : "❌ ERROR";
    
    log('term1', `\n═══════════════════════════════════`, "info");
    log('term1', `VENTAS TOTALES: ${boletos_vendidos.toLocaleString('es-ES')}`, "info");
    log('term1', `TOTAL ESPERADO: ${TOTAL_ESPERADO.toLocaleString('es-ES')}`, "info");
    log('term1', `RESULTADO: ${correcto}`, "info");
    log('term1', `Tiempo de ejecución: ${tiempo}s`, "info");
    log('term1', `═══════════════════════════════════\n`, "info");
    
    for(let i = 1; i <= N_HILOS; i++) {
        log('term1', `Hilo ${i}: ${ventas_por_hilo[i-1].toLocaleString('es-ES')} ventas`, "info");
        document.getElementById(`met1_hilo${i}`).innerText = `Hilo ${i}: ${ventas_por_hilo[i-1].toLocaleString('es-ES')} / ${M_VENTAS.toLocaleString('es-ES')} ✅`;
    }
    
    document.getElementById('prog1').style.width = `100%`;
    document.getElementById('met1').innerText = `Boletos vendidos: ${boletos_vendidos.toLocaleString('es-ES')} / ${TOTAL_ESPERADO.toLocaleString('es-ES')} ${correcto}`;
    
    btn.disabled = false;
}

// 2. GIMNASIO
async function ejecutarSemaforos() {
    const btn = document.getElementById('btn2');
    btn.disabled = true;
    document.getElementById('term2').innerHTML = "";
    const maquinas = new Semaforo(3);
    const mVisuals = [document.getElementById('m1'), document.getElementById('m2'), document.getElementById('m3')];
    let enUso = 0;

    async function atleta(id) {
        log('term2', `Atleta ${id} esperando máquina...`);
        await maquinas.wait();
        

        const mVIndex = mVisuals.findIndex(m => !m.classList.contains('active'));
        mVisuals[mVIndex].classList.add('active');
        enUso++;
        document.getElementById('met2').innerText = `Máquinas en uso: ${enUso} / 3`;
        
        log('term2', `Atleta ${id} entrenando en M${mVIndex+1}`, "info");
        await sleep(1500 + Math.random() * 2000);
        
        enUso--;
        mVisuals[mVIndex].classList.remove('active');
        document.getElementById('met2').innerText = `Máquinas en uso: ${enUso} / 3`;
        log('term2', `Atleta ${id} liberó máquina`, "err");
        maquinas.signal();
    }

    const atletas = Array.from({length: 6}, (_, i) => atleta(i+1));
    await Promise.all(atletas);
    btn.disabled = false;
}

// 3. PANADERÍA
async function ejecutarProdCons() {
    const btn = document.getElementById('btn3');
    btn.disabled = true;
    const vitrinaV = document.getElementById('vitrina-visual');
    vitrinaV.innerHTML = "";
    
    const capacidad = 10;
    const vacios = new Semaforo(capacidad);
    const llenos = new Semaforo(0);
    const mtx = new Mutex();
    let vitrinaCount = 0;

    async function panadero() {
        for(let i=0; i<12; i++) {
            await vacios.wait();
            await mtx.lock();
            vitrinaCount++;
            vitrinaV.innerHTML += '<span class="pan-icon">🥖</span>';
            log('term3', `Panadero: Horneado #${i+1}`);
            document.getElementById('met3').innerText = `Panes en vitrina: ${vitrinaCount} / ${capacidad}`;
            mtx.unlock();
            llenos.signal();
            await sleep(600);
        }
    }

    async function cliente() {
        for(let i=0; i<12; i++) {
            await llenos.wait();
            await mtx.lock();
            vitrinaCount--;
            vitrinaV.removeChild(vitrinaV.lastChild);
            log('term3', `Cliente: Compró pan`, "err");
            document.getElementById('met3').innerText = `Panes en vitrina: ${vitrinaCount} / ${capacidad}`;
            mtx.unlock();
            vacios.signal();
            await sleep(1000);
        }
    }

    Promise.all([panadero(), cliente()]).then(() => btn.disabled = false);
}

// 4. LECTORES / ESCRITORES
async function ejecutarLectEsc() {
    const btn = document.getElementById('btn4');
    btn.disabled = true;
    const indicator = document.getElementById('access-ind');
    let lectores = 0;
    const mtxL = new Mutex();
    const semE = new Mutex();

    async function lector(id) {
        await mtxL.lock();
        lectores++;
        if(lectores === 1) {
            await semE.lock();
            indicator.innerText = "LEYENDO (LECTURA CONCURRENTE)";
            indicator.classList.remove('locked');
        }
        document.getElementById('met4').innerText = `Lectores: ${lectores} | Escritor: Inactivo`;
        mtxL.unlock();

        log('term4', `Estudiante ${id} leyendo...`, "info");
        await sleep(2000);

        await mtxL.lock();
        lectores--;
        if(lectores === 0) {
            semE.unlock();
            indicator.innerText = "ACCESO LIBRE";
        }
        document.getElementById('met4').innerText = `Lectores: ${lectores} | Escritor: Inactivo`;
        log('term4', `Estudiante ${id} salió.`);
        mtxL.unlock();
    }

    async function profesor() {
        log('term4', "Profesor esperando turno...", "err");
        await semE.lock();
        indicator.innerText = "ESCRIBIENDO (ACCESO EXCLUSIVO)";
        indicator.classList.add('locked');
        document.getElementById('met4').innerText = `Lectores: 0 | Escritor: ACTIVO`;
        await sleep(2500);
        indicator.innerText = "ACCESO LIBRE";
        indicator.classList.remove('locked');
        semE.unlock();
        log('term4', "Profesor terminó de publicar notas.");
    }

    lector(1);
    setTimeout(() => lector(2), 500);
    setTimeout(() => profesor(), 1000);
    setTimeout(() => lector(3), 4000);
    setTimeout(() => btn.disabled = false, 7000);
}

// 5. BARRERA
async function ejecutarBarrera() {
    const btn = document.getElementById('btn5');
    btn.disabled = true;
    document.querySelectorAll('.dot').forEach(d => d.classList.remove('ready'));
    const barrera = new Barrera(5);

    async function tarea(id) {
        log('term5', `Hilo ${id}: Fase 1 (Cálculo)...`);
        await sleep(Math.random() * 3000);
        log('term5', `Hilo ${id}: LISTO. Esperando en barrera.`);
        await barrera.wait(id);
        log('term5', `Hilo ${id}: !!! INICIANDO FASE 2 !!!`, "info");
    }

    const hilos = Array.from({length: 5}, (_, i) => tarea(i+1));
    await Promise.all(hilos).then(() => btn.disabled = false);
}