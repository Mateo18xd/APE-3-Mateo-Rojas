import time
import threading

M_VENTAS = 1000000
N_HILOS = 5
boletos_sec = 0
boletos_conc = 0
cerrojo = threading.Lock()

# 1. EJECUCIÓN SECUENCIAL
def venta_secuencial():
    global boletos_sec
    for _ in range(N_HILOS * M_VENTAS):
        boletos_sec += 1

inicio_sec = time.time()
venta_secuencial()
fin_sec = time.time()


def ejecutar_venta_hilo():
    global boletos_conc
    for _ in range(M_VENTAS):
        with cerrojo:
            boletos_conc += 1

inicio_conc = time.time()
hilos = [threading.Thread(target=ejecutar_venta_hilo) for _ in range(N_HILOS)]

for t in hilos: 
    t.start()


for t in hilos: 
    t.join()
    
fin_conc = time.time()

print("=== ANÁLISIS DE RENDIMIENTO ===")
print(f"Total boletos (Secuencial): {boletos_sec}")
print(f"Tiempo Secuencial: {fin_sec - inicio_sec:.4f} segundos\n")

print(f"Total boletos (Concurrente): {boletos_conc}")
print(f"Tiempo Concurrente (Mutex): {fin_conc - inicio_conc:.4f} segundos")
print("===============================")