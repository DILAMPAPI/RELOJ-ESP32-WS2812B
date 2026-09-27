\# ⏰ RELOJ ESP32 — WS2812B



Proyecto de un reloj digital basado en \*\*ESP32-C3 SuperMini\*\*, \*\*RTC DS1307\*\* y \*\*LEDs direccionables WS2812B\*\*.



El proyecto incluye el firmware del reloj, una aplicación móvil desarrollada con Flutter y un prototipo web utilizado para diseñar y probar funcionalidades antes de incorporarlas a la aplicación principal.



\---



\## 📌 Descripción



El reloj utiliza un conjunto de \*\*58 LEDs WS2812B\*\* para representar cuatro dígitos de siete segmentos, además de indicadores y elementos visuales adicionales.



El ESP32 se encarga de:



\* Mantener y mostrar la hora.

\* Obtener la hora mediante un RTC DS1307.

\* Controlar los LEDs WS2812B.

\* Gestionar brillo y color.

\* Gestionar alarmas.

\* Ejecutar temporizadores.

\* Ejecutar un modo Pomodoro.

\* Generar alertas mediante un buzzer.

\* Comunicarse con la aplicación mediante Bluetooth Low Energy (BLE).

\* Guardar configuraciones mediante memoria no volátil.



La aplicación móvil permite controlar y configurar el reloj desde el teléfono.



\---



\# 🧩 Arquitectura del proyecto



El proyecto está dividido en varios componentes independientes:



```text

&#x20;                   ┌─────────────────────┐

&#x20;                   │      RELOJ ESP32    │

&#x20;                   │                     │

&#x20;                   │   ESP32-C3          │

&#x20;                   │      │              │

&#x20;                   │      ├── DS1307      │

&#x20;                   │      ├── WS2812B     │

&#x20;                   │      └── Buzzer      │

&#x20;                   └──────────┬──────────┘

&#x20;                              │

&#x20;                             BLE

&#x20;                              │

&#x20;                   ┌──────────▼──────────┐

&#x20;                   │    Flutter App      │

&#x20;                   │    📱 Aplicación    │

&#x20;                   └─────────────────────┘





&#x20;             ┌────────────────────────────┐

&#x20;             │      Web Prototype        │

&#x20;             │                            │

&#x20;             │ React + Vite + TypeScript  │

&#x20;             │                            │

&#x20;             │ Diseño / pruebas / ideas   │

&#x20;             └────────────────────────────┘

```



El \*\*prototipo web no es la aplicación principal\*\*. Se utiliza como laboratorio para experimentar con interfaces y funcionalidades.



\---



\# 📁 Estructura del repositorio



```text

RELOJ-ESP32-WS2812B/

│

├── firmware/

│   └── esp32/

│       └── reloj\_digital\_esp32\_protocolo.ino

│

├── flutter\_app/

│   ├── lib/

│   ├── android/

│   ├── ios/

│   └── ...

│

├── web\_prototype/

│   ├── src/

│   ├── package.json

│   ├── index.html

│   ├── vite.config.ts

│   └── ...

│

├── docs/

│   └── protocol.md

│

├── .gitignore

└── README.md

```



\### `firmware/`



Código que se ejecuta directamente en el ESP32.



Contiene la lógica del reloj, LEDs, RTC, alarmas, temporizador, Pomodoro, buzzer y comunicación BLE.



\### `flutter\_app/`



Aplicación móvil principal desarrollada con Flutter.



Es la aplicación que se instala en el teléfono y se comunica con el reloj físico.



\### `web\_prototype/`



Prototipo web desarrollado con React, Vite y TypeScript.



Se utiliza para:



\* Diseñar interfaces.

\* Probar ideas.

\* Experimentar con funcionalidades.

\* Simular el reloj.

\* Probar conceptos antes de implementarlos en Flutter.



\### `docs/`



Documentación técnica del proyecto.



Actualmente contiene la especificación del protocolo de comunicación BLE.



\---



\# 🔧 Hardware



\## Microcontrolador



\* ESP32-C3 SuperMini



\## RTC



\* DS1307

\* Comunicación I²C



```text

SDA → GPIO8

SCL → GPIO9

```



\## LEDs



\* 58 × WS2812B

\* Datos → GPIO5



\## Buzzer



```text

Buzzer → GPIO10

```



\## Alimentación



Los LEDs utilizan una alimentación de 5 V independiente.



El ESP32 se alimenta mediante USB.



\*\*El GND debe ser común entre la alimentación de los LEDs y el ESP32.\*\*



\---



\# 💡 Distribución de segmentos



Actualmente los LEDs están organizados en pares para representar los segmentos de cada dígito.



Ejemplo de un dígito:



```text

&#x20;      a

&#x20;    ─────

&#x20; f │     │ b

&#x20;   │  g  │

&#x20;    ─────

&#x20; e │     │ c

&#x20;   │     │

&#x20;    ─────

&#x20;      d

```



Mapa utilizado actualmente:



```text

LED 0–1    → g

LED 2–3    → B

LED 4–5    → a

LED 6–7    → f

LED 8–9    → E

LED 10–11  → d

LED 12–13  → c

```



El firmware utiliza una estructura `segmentMap` para relacionar los dígitos con sus segmentos.



\---



\# 📡 Comunicación BLE



La comunicación entre la aplicación y el ESP32 utiliza un protocolo de comandos estructurado.



Algunos comandos disponibles:



```text

SET\_TIME

SET\_BRIGHTNESS

SET\_COLOR

SET\_FORMAT

GET\_CONFIG



ADD\_ALARM

REMOVE\_ALARM

TOGGLE\_ALARM

GET\_ALARMS



START\_TIMER

PAUSE\_TIMER

RESUME\_TIMER

STOP\_TIMER



START\_POMODORO

PAUSE\_POMODORO

RESUME\_POMODORO

STOP\_POMODORO



STOP\_ALERT

PING

GET\_STATUS

```



La documentación completa se encuentra en:



\[`docs/protocol.md`](docs/protocol.md)



\---



\# ⏰ Funciones actuales



\## Reloj



\* \[x] Mostrar hora

\* \[x] Formato 12/24 horas

\* \[x] RTC DS1307

\* \[x] Configuración mediante BLE

\* \[x] Brillo configurable

\* \[x] Color configurable



\## Alarmas



\* \[x] Hasta 5 alarmas

\* \[x] Activar/desactivar alarmas

\* \[x] Configuración de días

\* \[x] Buzzer

\* \[x] Parpadeo de LEDs

\* \[x] Detención automática de la alerta



\## Temporizador



\* \[x] Iniciar

\* \[x] Pausar

\* \[x] Reanudar

\* \[x] Detener



\## Pomodoro



\* \[x] Tiempo de trabajo

\* \[x] Tiempo de descanso

\* \[x] Número de rondas

\* \[x] Pausar

\* \[x] Reanudar

\* \[x] Detener



\## Aplicación



\* \[x] Comunicación BLE

\* \[x] Configuración del reloj

\* \[x] Control de iluminación

\* \[x] Alarmas

\* \[x] Temporizador

\* \[x] Pomodoro



\---



\# 🛠️ Tecnologías



\### Firmware



\* C++

\* Arduino

\* ESP32

\* WS2812B

\* DS1307

\* Bluetooth Low Energy



\### Aplicación móvil



\* Flutter

\* Dart

\* BLE



\### Prototipo web



\* React

\* TypeScript

\* Vite

\* Web Bluetooth



\### Diseño y fabricación



\* Fusion 360

\* OrcaSlicer

\* Impresión 3D

\* Fabricación de piezas para el gabinete



\---



\# 🚀 Desarrollo



\## Firmware



El firmware se encuentra en:



```text

firmware/esp32/

```



El archivo principal es:



```text

reloj\_digital\_esp32\_protocolo.ino

```



Puede abrirse y cargarse utilizando Arduino IDE.



\---



\## Flutter



La aplicación se encuentra en:



```text

flutter\_app/

```



Para trabajar con ella:



```bash

cd flutter\_app

flutter pub get

flutter run

```



\---



\## Prototipo web



El prototipo se encuentra en:



```text

web\_prototype/

```



Para instalar las dependencias:



```bash

cd web\_prototype

bun install

```



Para ejecutar el entorno de desarrollo:



```bash

bun run dev

```



\---



\# 📚 Documentación



| Documento                              | Descripción                      |

| -------------------------------------- | -------------------------------- |

| \[`docs/protocol.md`](docs/protocol.md) | Protocolo de comunicación BLE    |

| `README.md`                            | Descripción general del proyecto |



\---



\# 🗂️ Control de versiones



El proyecto utiliza \*\*Git\*\* y \*\*GitHub\*\* para controlar las versiones.



Flujo básico utilizado durante el desarrollo:



```text

Modificar

&#x20;  ↓

git status

&#x20;  ↓

git add

&#x20;  ↓

git commit

&#x20;  ↓

git push

```



Los commits deben representar cambios concretos y fáciles de identificar.



Ejemplo:



```bash

git commit -m "Add BLE communication protocol"

```



\---



\# 🎯 Objetivo del proyecto



El objetivo es desarrollar un reloj digital físico completamente controlable desde una aplicación móvil, utilizando hardware accesible y una arquitectura que permita continuar agregando funcionalidades sin depender de una única plataforma.



El proyecto también sirve como entorno de aprendizaje para:



\* Sistemas embebidos.

\* ESP32.

\* Comunicación BLE.

\* Desarrollo móvil con Flutter.

\* Desarrollo web.

\* Diseño electrónico.

\* Diseño 3D.

\* Git y GitHub.



\---



\## 📌 Estado del proyecto



\*\*En desarrollo 🚧\*\*



El hardware y la comunicación BLE ya han sido probados con el dispositivo físico. La aplicación Flutter cuenta con una versión funcional y el prototipo web se mantiene separado como herramienta de diseño y experimentación.



