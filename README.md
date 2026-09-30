# Visor PET · Trazabilidad y conciliación transaccional

Maqueta funcional del visor PET Fase 2 (POS y ATM) con datos dummy escalados a ~50 millones de operaciones al mes.
Es un sitio estático: un solo `index.html`, sin compilación ni dependencias que instalar.

## Contenido

- `index.html`: la aplicación completa (HTML, CSS y JavaScript).
- `favicon.svg`: ícono del sitio.
- `vercel.json`: configuración de Vercel (URLs limpias, cabeceras de seguridad y `noindex` para que no aparezca en buscadores).

## Desplegar en Vercel

**Opción 1, desde el navegador**
1. Entra a https://vercel.com/new y elige subir o importar el proyecto.
2. Si usas GitHub: sube esta carpeta a un repositorio e impórtalo.
3. En *Framework Preset* elige **Other**. Deja vacíos *Build Command* y *Output Directory*.
4. Pulsa **Deploy**.

**Opción 2, con la CLI**
```bash
npm i -g vercel
cd visor-pet
vercel          # vista previa
vercel --prod   # producción
```

## Probar en tu computadora

Abre `index.html` directamente en el navegador, o levanta un servidor local:
```bash
npx serve .
```

## Notas

- Los datos son de demostración y se generan en el navegador; no hay backend ni base de datos.
- Carga dos librerías desde cdnjs (jsPDF y SheetJS) para las descargas en PDF y Excel, y la tipografía desde Google Fonts, así que necesita conexión a internet.
- Los cambios en el Web Manager de layouts y el último rol elegido se guardan en el `localStorage` de cada navegador.
- El acceso por rol es simulado; en producción se integra con PingOne (SAML).
- Si el enlace va a compartirse fuera del equipo, activa *Deployment Protection* en Vercel (Settings → Deployment Protection) para pedir inicio de sesión.
