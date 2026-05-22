const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const express = require("express");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const QRCode = require("qrcode");

const app = express();
app.use(express.json());

let currentQR = null;
let isConnected = false;

async function conectarWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_session");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
     currentQR = qr;
     console.log("\n📱 QR disponible en http://localhost:3000\n");
     qrcode.generate(qr, { small: true });
    }
    if (connection === "close") {
      isConnected = false;
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) conectarWhatsApp();
    }
    if (connection === "open") {
      isConnected = true;
      console.log("✅ WhatsApp conectado!");
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

async function enviarMensaje(celular, mensaje) {
  if (!isConnected || !sock) throw new Error("WhatsApp no está conectado");

  let numero = String(celular).replace(/\D/g, "");
  if (numero.length === 10 && numero.startsWith("3")) {
    numero = "57" + numero;
  }

  const jid = numero + "@s.whatsapp.net";
  await sock.sendMessage(jid, { text: mensaje });
  console.log(`📤 Mensaje enviado a ${jid}`);
  return { jid, mensaje };
}

app.get("/", async (req, res) => {
  if (isConnected) {
    return res.send("<h2 style='font-family:sans-serif;color:green'>✅ WhatsApp conectado correctamente</h2>");
  }
  if (!currentQR) {
    return res.send("<h2 style='font-family:sans-serif'>⏳ Generando QR, recarga en 5 segundos...</h2><script>setTimeout(()=>location.reload(),5000)</script>");
  }
  const qrImage = await QRCode.toDataURL(currentQR);
  res.send(`
    <html><body style="font-family:sans-serif;text-align:center;padding:40px">
    <h2>Escanea con WhatsApp</h2>
    <img src="${qrImage}" style="width:300px;height:300px"/>
    <p>WhatsApp → ⋮ → Dispositivos vinculados → Vincular dispositivo</p>
    <script>setTimeout(()=>location.reload(),30000)</script>
    </body></html>
  `);
});


app.post("/confirmar-pago", async (req, res) => {
  const { celular, nombre, valor, plan, fecha_pago, tipo } = req.body;

  if (!celular || !nombre) {
    return res.status(400).json({ error: "Faltan campos: celular, nombre" });
  }

  let mensaje;
  if (tipo === "transferencia") {
    mensaje =
      `✅ *Confirmación de Pago*\n\n` +
      `Hola *${nombre}*,\n\n` +
      `Hemos recibido tu transferencia correctamente.\n\n` +
      `📋 *Detalle:*\n` +
      `• Plan: ${plan}\n` +
      `• Valor: ${valor}\n` +
      `• Fecha: ${fecha_pago}\n\n` +
      `Gracias por tu pago. Tu servicio continúa activo. 🌐`;
  } else 
    mensaje =
      `✅ *Pago Registrado*\n\n` +
      `Hola *${nombre}*,\n\n` +
      `Tu pago ha sido registrado exitosamente.\n\n` +
      `📋 *Detalle:*\n` +
      `• Plan: ${plan}\n` +
      `• Valor: ${valor}\n` +
      `• Fecha: ${fecha_pago}\n\n` +
      `¡Gracias por mantenerte al día! 🎉`;
  }

  try {
    const resultado = await enviarMensaje(celular, mensaje);
    res.json({ ok: true, ...resultado });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

conectarWhatsApp().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Servidor en http://localhost:${PORT}`);
    console.log(`📡 Webhook: POST /confirmar-pago`);
  });
});
