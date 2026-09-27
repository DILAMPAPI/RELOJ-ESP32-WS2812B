\# Protocolo de comunicación BLE — RELOJ ESP32



\## 1. Objetivo



Este documento define el protocolo de comunicación entre la aplicación y el ESP32-C3 del proyecto RELOJ ESP32.



El protocolo permite controlar y consultar:



\* Hora y fecha

\* Brillo de los LEDs

\* Color de los LEDs

\* Formato de 12/24 horas

\* Alarmas

\* Temporizador

\* Pomodoro

\* Estado actual del reloj

\* Configuración

\* Alertas



\---



\## 2. Transporte



La comunicación se realiza mediante \*\*Bluetooth Low Energy (BLE)\*\*.



Los comandos utilizan texto plano.



Cada comando se envía como una línea:



```text

COMANDO argumento1 argumento2 ...

```



El ESP32 responde también mediante líneas de texto.



\### Tipos de respuesta



```text

OK ...

ERR ...

STATUS ...

CONFIG ...

ALARM ...

PONG

```



\---



\## 3. Comandos del reloj



\### SET\_TIME



Establece la fecha y hora del RTC.



```text

SET\_TIME YYYY MM DD HH MM SS

```



Ejemplo:



```text

SET\_TIME 2026 09 27 14 35 00

```



Respuesta:



```text

OK SET\_TIME

```



\---



\## 4. Configuración



\### SET\_BRIGHTNESS



Establece el brillo de los LEDs.



Rango:



```text

0–255

```



Comando:



```text

SET\_BRIGHTNESS brightness

```



Ejemplo:



```text

SET\_BRIGHTNESS 180

```



Respuesta:



```text

OK SET\_BRIGHTNESS 180

```



\---



\### SET\_COLOR



Establece el color de los LEDs.



Cada componente RGB utiliza un rango de `0–255`.



```text

SET\_COLOR R G B

```



Ejemplo:



```text

SET\_COLOR 255 100 0

```



Respuesta:



```text

OK SET\_COLOR 255 100 0

```



\---



\### SET\_FORMAT



Establece el formato de hora.



Valores permitidos:



```text

12

24

```



Ejemplo:



```text

SET\_FORMAT 12

```



Respuesta:



```text

OK SET\_FORMAT 12

```



\---



\### GET\_CONFIG



Solicita la configuración actual.



```text

GET\_CONFIG

```



Respuesta:



```text

CONFIG brightness=180 color=255,100,0 format=12

```



\---



\## 5. Alarmas



El reloj soporta hasta \*\*5 alarmas\*\*.



\### ADD\_ALARM



Crea o modifica una alarma.



```text

ADD\_ALARM idx HH MM days enabled

```



Donde:



\* `idx`: índice de la alarma, `0–4`

\* `HH`: hora

\* `MM`: minuto

\* `days`: máscara de días

\* `enabled`: `0` desactivada, `1` activada



Ejemplo:



```text

ADD\_ALARM 0 07 30 127 1

```



Respuesta:



```text

OK ADD\_ALARM 0

```



\---



\### REMOVE\_ALARM



Elimina una alarma.



```text

REMOVE\_ALARM idx

```



Ejemplo:



```text

REMOVE\_ALARM 0

```



Respuesta:



```text

OK REMOVE\_ALARM 0

```



\---



\### TOGGLE\_ALARM



Activa o desactiva una alarma.



```text

TOGGLE\_ALARM idx enabled

```



Ejemplo:



```text

TOGGLE\_ALARM 0 0

```



Respuesta:



```text

OK TOGGLE\_ALARM 0 0

```



\---



\### GET\_ALARMS



Solicita todas las alarmas.



```text

GET\_ALARMS

```



El ESP32 responde con una línea por alarma:



```text

ALARM idx=0 time=7:30 days=127 enabled=1

ALARM idx=1 time=8:00 days=62 enabled=0

ALARM idx=2 time=12:30 days=31 enabled=0

ALARM idx=3 time=18:00 days=127 enabled=0

ALARM idx=4 time=22:00 days=127 enabled=0

```



\---



\## 6. Temporizador



\### START\_TIMER



Inicia un temporizador.



```text

START\_TIMER hours minutes seconds

```



Ejemplo:



```text

START\_TIMER 0 25 0

```



Respuesta:



```text

OK START\_TIMER 0 25 0

```



\---



\### PAUSE\_TIMER



Pausa el temporizador.



```text

PAUSE\_TIMER

```



Respuesta:



```text

OK PAUSE\_TIMER

```



\---



\### RESUME\_TIMER



Continúa un temporizador pausado.



```text

RESUME\_TIMER

```



Respuesta:



```text

OK RESUME\_TIMER

```



\---



\### STOP\_TIMER



Detiene el temporizador.



```text

STOP\_TIMER

```



Respuesta:



```text

OK STOP\_TIMER

```



\---



\## 7. Pomodoro



\### START\_POMODORO



Inicia una sesión Pomodoro.



```text

START\_POMODORO workMin breakMin rounds

```



Donde:



\* `workMin`: duración del periodo de trabajo

\* `breakMin`: duración del descanso

\* `rounds`: cantidad de rondas



Ejemplo:



```text

START\_POMODORO 25 5 4

```



Respuesta:



```text

OK START\_POMODORO 25 5 4

```



\---



\### PAUSE\_POMODORO



```text

PAUSE\_POMODORO

```



Respuesta:



```text

OK PAUSE\_POMODORO

```



\---



\### RESUME\_POMODORO



```text

RESUME\_POMODORO

```



Respuesta:



```text

OK RESUME\_POMODORO

```



\---



\### STOP\_POMODORO



```text

STOP\_POMODORO

```



Respuesta:



```text

OK STOP\_POMODORO

```



\---



\## 8. Alertas



\### STOP\_ALERT



Detiene una alerta activa.



```text

STOP\_ALERT

```



Respuesta:



```text

OK STOP\_ALERT

```



\---



\## 9. Estado



\### GET\_STATUS



Solicita el estado actual del reloj.



```text

GET\_STATUS

```



En funcionamiento normal:



```text

STATUS mode=CLOCK time=14:35:20 alert=0

```



Durante un temporizador:



```text

STATUS mode=TIMER time=14:35:20 alert=0 remainingSec=120 paused=0

```



Durante Pomodoro:



```text

STATUS mode=POMODORO time=14:35:20 alert=0 phase=WORK round=1/4 remainingSec=1500 paused=0

```



\### Campos de STATUS



| Campo          | Descripción                       |

| -------------- | --------------------------------- |

| `mode`         | `CLOCK`, `TIMER` o `POMODORO`     |

| `time`         | Hora actual del RTC               |

| `alert`        | `0` sin alerta, `1` alerta activa |

| `remainingSec` | Tiempo restante en segundos       |

| `paused`       | `0` activo, `1` pausado           |

| `phase`        | `WORK` o `BREAK`                  |

| `round`        | Ronda actual / rondas totales     |



Los campos adicionales dependen del modo actual.



\---



\## 10. Conectividad



\### PING



Comprueba que el ESP32 responde.



```text

PING

```



Respuesta:



```text

PONG

```



\---



\## 11. Errores



Los errores utilizan el formato:



```text

ERR motivo

```



Ejemplo:



```text

ERR SET\_BRIGHTNESS fuera de rango (0-255)

```



La aplicación debe mostrar o traducir estos errores al usuario cuando sea necesario.



\---



\## 12. Sincronización inicial



Cuando la aplicación establece una conexión con el ESP32, debe solicitar:



```text

GET\_STATUS

GET\_CONFIG

GET\_ALARMS

```



Esto permite reconstruir el estado actual del reloj después de una nueva conexión.



\---



\## 13. Polling de estado



Mientras existe una conexión activa, la aplicación puede consultar periódicamente:



```text

GET\_STATUS

```



La implementación actual realiza esta consulta aproximadamente cada segundo.



Esto permite actualizar en tiempo real:



\* Hora

\* Temporizador

\* Pomodoro

\* Estado de pausa

\* Alertas

\* Ronda actual



\---



\## 14. Compatibilidad



Este protocolo es compartido por:



\* Firmware ESP32

\* Aplicación Flutter

\* Prototipo web/React



Cualquier modificación de comandos o formatos de respuesta debe actualizar este documento y las implementaciones correspondientes.



\---



\## 15. Versión



\*\*Protocolo:\*\* v1.0



\*\*Proyecto:\*\* RELOJ ESP32



\*\*Transporte:\*\* Bluetooth Low Energy (BLE)



