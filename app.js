import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// --- 1. TUS CREDENCIALES REALES ---
const firebaseConfig = {
  apiKey: "AIzaSyAGQZOqoIVz3nYK7uL8cW_IgpLN9Bi7tJM",
  authDomain: "cupido-riviera.firebaseapp.com",
  projectId: "cupido-riviera",
  storageBucket: "cupido-riviera.firebasestorage.app",
  messagingSenderId: "87524235533",
  appId: "1:87524235533:web:65198f35b9eae6ad60b844"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- 2. CONFIGURACIÓN SHOPIFY (IDs DE VARIANTE REALES) ---
// Estos son los códigos que sacamos de tu JSON (Empiezan con 47...)
const shopifyIDs = {
    "Ramo Queen": "47470179418164",   // Rojo
    "Girasol Love": "47470160314420", // Girasol único
    "Buchón Gold": "47470160773172"   // Buchón único
};

const shopifyDomain = "xdabqn-vf.myshopify.com";

// ==========================================
// 🛒 1. LÓGICA DE SELECCIÓN (index.html)
// ==========================================
window.seleccionarProducto = (elemento, nombre, rosas, precio) => {
    // A. Guardar elección en memoria
    const pedidoTemporal = { nombre, rosas, precio };
    localStorage.setItem("pedido_pendiente", JSON.stringify(pedidoTemporal));

    // B. VERIFICAR SI ESTÁ LOGUEADO
    const user = auth.currentUser;
    
    // Le damos 500ms a Firebase para que responda si hay usuario o no
    setTimeout(() => {
        if (auth.currentUser) {
            // Si ya tiene sesión, va directo a llenar datos
            window.location.href = "pago.html";
        } else {
            // Si NO tiene sesión, va a loguearse primero
            window.location.href = "login.html";
        }
    }, 500);
};

// ==========================================
// 🔐 2. LÓGICA DE LOGIN (login.html)
// ==========================================
if (window.location.pathname.includes("login.html")) {
    const btnGoogle = document.getElementById('btn-google');
    
    if (btnGoogle) {
        btnGoogle.addEventListener('click', async () => {
            const provider = new GoogleAuthProvider();
            try {
                const result = await signInWithPopup(auth, provider);
                const user = result.user;

                Swal.fire({
                    title: `¡Hola ${user.displayName.split(" ")[0]}!`,
                    text: 'Redirigiendo a tu pedido...',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    // Si ya había escogido ramo, va a pagar. Si no, a la tienda.
                    const pendiente = localStorage.getItem("pedido_pendiente");
                    window.location.href = pendiente ? "pago.html" : "index.html";
                });
            } catch (error) {
                console.error(error);
                Swal.fire("Error", "No pudimos iniciar sesión. Intenta de nuevo.", "error");
            }
        });
    }
}

// ==========================================
// 💳 3. LÓGICA DE PAGO (pago.html)
// ==========================================
if (window.location.pathname.includes("pago.html")) {
    
    // A. Recuperar datos del producto
    const datosGuardados = localStorage.getItem("pedido_pendiente");
    if (!datosGuardados) {
        window.location.href = "index.html";
    }
    const producto = JSON.parse(datosGuardados);

    // B. Mostrar resumen
    const resumen = document.getElementById("resumen-compra");
    if (resumen) {
        resumen.innerHTML = `
            Estás comprando: <strong>${producto.nombre}</strong><br>
            <span style="font-size: 0.9em; color: #555;">(Incluye aprox. ${producto.rosas} rosas)</span><br>
            <span style="font-size:1.5rem; font-weight:bold; color:#ff4757">$${producto.precio}</span>
        `;
    }

    // C. Verificar usuario (Seguridad extra)
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById("usuario-nombre").innerText = user.displayName || user.email;
        } else {
            // Si llegan aquí sin permiso, los sacamos
            window.location.href = "login.html";
        }
    });

    // D. PROCESAR PEDIDO (Directo a Shopify - Sin selectores)
    const form = document.getElementById('cupido-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = document.querySelector('.btn-enviar');
            btn.innerText = "Procesando... 🔄"; 
            btn.disabled = true;

            const destinatario = document.getElementById('destinatario').value;
            const esProfesor = document.getElementById('tipo-destinatario').checked;

            if(!destinatario.trim()) {
                Swal.fire("Falta información", "Escribe el nombre del destinatario", "warning");
                btn.disabled = false; btn.innerText = "Ir a Pagar Ahora 💳";
                return;
            }

            // Datos de ubicación
            let datosUbicacion = {};
            if (esProfesor) {
                datosUbicacion = { tipo: "Profesor/a", detalle: document.getElementById('area-profe').value };
            } else {
                datosUbicacion = { tipo: "Alumno/a", detalle: `${document.getElementById('grado').value} ${document.getElementById('grupo').value}` };
            }

            // Objeto para Firebase (Pago Fijo: Shopify)
            const pedido = {
                producto: producto.nombre,
                precio: producto.precio,
                cliente: document.getElementById('usuario-nombre').innerText,
                destinatario: destinatario,
                mensaje: document.getElementById('mensaje').value,
                color: document.querySelector('input[name="color_rosas"]:checked').value,
                metodo_pago: "Shopify", // Ya no viene de un select, es automático
                ubicacion: datosUbicacion,
                fecha: new Date().toLocaleString(),
                estado: "Pendiente de Pago"
            };

            try {
                // 1. Guardar en Firebase
                await addDoc(collection(db, "pedidos_cupido"), pedido);
                
                // 2. Obtener el ID de Variante Correcto
                const variantId = shopifyIDs[producto.nombre];
                
                // 3. Crear el Link de Pago Directo
                const checkoutUrl = `https://${shopifyDomain}/cart/${variantId}:1`;

                Swal.fire({
                    title: '¡Datos Guardados! ✅',
                    text: 'Te estamos llevando al pago seguro...',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    localStorage.removeItem("pedido_pendiente"); 
                    // 4. REDIRECCIÓN FINAL
                    window.location.href = checkoutUrl; 
                });

            } catch (error) {
                console.error("Error:", error);
                Swal.fire("Error", "Hubo un problema al conectar.", "error");
                btn.innerText = "Ir a Pagar Ahora 💳";
                btn.disabled = false;
            }
        });
    }
}

// ==========================================
// 🛠️ FUNCIONES VISUALES
// ==========================================
window.cambiarFormulario = () => {
    const esProfesor = document.getElementById('tipo-destinatario').checked;
    if (esProfesor) {
        document.getElementById('campos-alumno').classList.add('hidden');
        document.getElementById('campos-profesor').classList.remove('hidden');
    } else {
        document.getElementById('campos-alumno').classList.remove('hidden');
        document.getElementById('campos-profesor').classList.add('hidden');
    }
};