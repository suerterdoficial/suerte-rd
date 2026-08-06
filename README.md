# 🎲 Suerte RD - Plataforma Profesional de Sorteos

Plataforma profesional para la gestión y participación en rifas y sorteos digitales en la República Dominicana.

---

## 📁 Estructura del Proyecto

```text
SUERTE RD/
├── assets/
│   ├── css/
│   │   └── style.css          # Estilos globales y sistema de diseño
│   ├── js/
│   │   └── app.js             # Lógica cliente, carrito, tómbola y panel admin
├── data.json                  # Almacenamiento persistente local
├── index.html                 # Interfaz de usuario principal
├── server.js                  # Backend Express.js con API REST
├── package.json               # Dependencias y scripts de ejecución
├── .env.example               # Plantilla de variables de entorno
└── README.md                  # Documentación
```

---

## 🚀 Instrucciones de Inicio

### 1. Requisitos Previos
- Node.js instalado (v16 o superior).

### 2. Instalación de Dependencias
```bash
npm install
```

### 3. Iniciar el Servidor
```bash
npm start
```

El servidor iniciará en: **`http://localhost:8000`**

---

## 🌟 Características Principales
- **Sistema Multirrifa**: Gestión simultánea de múltiples sorteos (iPhone, Vehículos, Patinetas).
- **Selección de Boletos**: Tómbola aleatoria de 5 dígitos, ingreso manual con teclado animado o explorador visual con paginación.
- **Recibo Digital de Pago**: Generación instantánea de recibo estilo Apple Wallet listo para validación por WhatsApp.
- **Panel Administrativo Integrado**: Gráficas en tiempo real (Chart.js), gestión de reservas, exportación CSV y tómbola oficial en vivo con efectos de confeti.
