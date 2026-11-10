import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// --- TUS CREDENCIALES REALES ---
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

const tabla = document.getElementById('lista-pedidos');

// COLORES PARA LA TABLA
const mapaColores = {
    "Rojo Pasión": "#d63031",
    "Amarillo Gold": "#f1c40f",
    "Rosa Pastel": "#fd79a8",
    "Azul Rey": "#0984e3",
    "Negro Elegante": "#2d3436",
    "Blanco Puro": "#dfe6e9"
};

// --- ESCUCHAR PEDIDOS ---
onSnapshot(collection(db, "pedidos_cupido"), (snapshot) => {
    
    if (snapshot.empty) {
        tabla.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">No hay pedidos pendientes 🧹</td></tr>`;
        return;
    }

    let contenidoHTML = "";

    snapshot.forEach((doc) => {
        const p = doc.data();
        const id = doc.id;

        // Badge
        let badgeHTML = "";
        if (p.tipo_destinatario === "Profesor/a") {
            badgeHTML = `<span class="badge badge-profe">🍎 Profe</span>`;
        } else {
            badgeHTML = `<span class="badge badge-alumno">🎓 Alumno</span>`;
        }

        const colorHex = mapaColores[p.color_elegido] || "#ccc";

        contenidoHTML += `
            <tr>
                <td>
                    <strong>${p.destinatario}</strong><br>
                    ${badgeHTML}
                </td>
                <td>${p.detalle_ubicacion}</td>
                <td>
                    ${p.producto}<br>
                    <small>($${p.precio})</small>
                </td>
                <td>
                    <div style="display:flex; align-items:center;">
                        <span class="color-dot" style="background:${colorHex};"></span>
                        <small>${p.color_elegido}</small>
                    </div>
                </td>
                <td><small style="font-style:italic; color:#666;">"${p.mensaje || '-'}"</small></td>
                <td>
                    <button class="btn-check" onclick="completarPedido('${id}', '${p.destinatario}')">✅ Listo</button>
                </td>
            </tr>
        `;
    });

    tabla.innerHTML = contenidoHTML;
}, (error) => {
    console.error("Error:", error);
    // Si sale error aquí, es que no creaste la base de datos en la consola
    if(error.code === 'permission-denied') {
        Swal.fire('¡Falta un paso!', 'Asegúrate de haber creado la Base de Datos (Firestore) en la consola de Firebase en "Modo Prueba".', 'error');
    }
});

// --- BORRAR PEDIDO ---
window.completarPedido = (id, nombre) => {
    Swal.fire({
        title: '¿Entregado?',
        text: `¿Borrar pedido de ${nombre}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#2ed573',
        cancelButtonColor: '#d63031',
        confirmButtonText: 'Sí, borrar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            await deleteDoc(doc(db, "pedidos_cupido", id));
            Swal.fire('¡Listo!', 'Pedido completado.', 'success');
        }
    });
};