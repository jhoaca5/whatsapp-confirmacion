const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function restoreSession() {
  const b64 = process.env.SESSION_B64;
  if (!b64) return;

  const sessionDir = path.join(__dirname, "auth_session");
  if (fs.existsSync(sessionDir) && fs.readdirSync(sessionDir).length > 0) {
    console.log("✅ Sesión ya existe, no se restaura.");
    return;
  }

  console.log("🔄 Restaurando sesión desde variable...");
  fs.writeFileSync("/tmp/session.b64", b64);
  execSync("base64 -d /tmp/session.b64 > /tmp/session.tar.gz");
  execSync("mkdir -p auth_session");
  execSync("tar -xzf /tmp/session.tar.gz -C .");
  console.log("✅ Sesión restaurada correctamente.");
}

restoreSession();
