# 🎹 Pianew Tiles - Clean Recovery

Este repositorio ha sido restaurado y estabilizado para funcionar como un juego **completamente offline**, eliminando la complejidad innecesaria de Expo, React Native y servidores externos.

## 🚀 Estado Actual
El proyecto ha sido limpiado de la migración fallida a Expo y ahora utiliza una arquitectura sólida y ligera:
- **Frontend:** React + Vite + Tailwind CSS.
- **Motor de Juego:** HTML5 Canvas para renderizado de alto rendimiento.
- **Audio:** Tone.js para síntesis de sonido de piano en tiempo real.
- **Móvil:** Capacitor para empaquetado nativo en Android.
- **Offline:** No requiere conexión a internet, base de datos ni servidor Express.

## 🛠️ Cambios Realizados
1. **Eliminación de Expo/React Native:** Se han borrado todas las dependencias y carpetas relacionadas con Expo (`app/`, `assets/`, `app.json`, etc.) que causaban conflictos.
2. **Limpieza de Scripts:** El `package.json` ha sido regenerado con scripts limpios para desarrollo y compilación.
3. **Consolidación Web:** Se ha restaurado la estructura de `client/` como la raíz del juego.
4. **Configuración de Capacitor:** Se ha inicializado un proyecto de Capacitor limpio y compatible con Android.
5. **Eliminación de Backend:** Se ha eliminado el servidor Express y la lógica de base de datos para garantizar un funcionamiento 100% offline.

## 💻 Desarrollo Local

### Requisitos
- Node.js (v18+)
- pnpm (recomendado) o npm

### Instalación
```bash
pnpm install
```

### Ejecutar en Navegador
```bash
pnpm dev
```

### Construir para Producción (Web)
```bash
pnpm build
```

## 📱 Compilación para Android

### Requisitos
- Android Studio
- Java 17 (Obligatorio para las últimas versiones de Gradle/Capacitor)
- Android SDK

### Pasos para Compilar
1. **Generar el build web:**
   ```bash
   pnpm build
   ```
2. **Sincronizar con Android:**
   ```bash
   pnpm cap:sync
   ```
3. **Abrir en Android Studio:**
   ```bash
   pnpm cap:open:android
   ```
4. **Generar APK:**
   Desde Android Studio: `Build > Build Bundle(s) / APK(s) > Build APK(s)`.

## 📂 Estructura del Proyecto
- `client/src/`: Código fuente del juego (React).
- `client/src/pages/Game.tsx`: Lógica principal del juego y renderizado en Canvas.
- `dist/`: Salida del build web (lo que se empaqueta en el APK).
- `android/`: Proyecto nativo de Android generado por Capacitor.

## 🎵 Créditos
Juego desarrollado originalmente con **Blink** y estabilizado para producción offline.
