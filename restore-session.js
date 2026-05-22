const fs = require("fs");
const { execSync } = require("child_process");

function restoreSession() {
  const b64 = process.env.SESSION_B64;
  if (!b64) {
    console.log("⚠️ No hay SESSION_B64, usando sesión local.");
    return;
  }

  const credsPath = "auth_session/creds.json";
  if (fs.existsSync(credsPath)) {
    console.log("✅ Sesión ya existe en Volume.");
    return;
  }

  console.log("🔄 Restaurando sesión desde SESSION_B64...");
  try {
    fs.writeFileSync("/tmp/session.b64", b64);
    execSync("base64 -d /tmp/session.b64 > /tmp/session.tar.gz");
    execSync("mkdir -p auth_session");
    execSync("tar -xzf /tmp/session.tar.gz --strip-components=1 -C auth_session/");
    console.log("✅ Sesión restaurada. Archivos:");
    console.log(execSync("ls auth_session/").toString());
  } catch (err) {
    console.error("❌ Error restaurando sesión:", err.message);
  }
}

restoreSession();
