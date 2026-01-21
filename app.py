from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import requests
import os

app = Flask(__name__)
CORS(app)

def validate_turnstile(token, ip=None):
    """Valida el token recibido con la API de Cloudflare Turnstile."""
    secret_key = os.getenv("TURNSTILE_SECRET_KEY")
    
    if not secret_key:
        return False, "TURNSTILE_SECRET_KEY no está configurada en el backend."

    data = {"secret": secret_key, "response": token}
    if ip:
        data["remoteip"] = ip

    try:
        r = requests.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data=data,
            timeout=5
        )
        result = r.json()
        
        if result.get("success"):
            return True, None
        
        codes = result.get("error-codes", result.get("error_codes", []))
        msg = "Verificación Turnstile fallida"
        if codes:
            msg += f". Códigos: {', '.join(codes)}"
        return False, msg
    except Exception as e:
        return False, f"No se pudo validar Turnstile: {str(e)}"

@app.route("/health", methods=["GET"])
def health():
    """Endpoint de salud para verificar que el backend esté funcionando"""
    return jsonify({
        "status": "ok",
        "message": "Backend Flask funcionando correctamente"
    })

@app.route('/solicitar-proteccion', methods=['POST'])
def solicitar_proteccion():
    try:
        data = request.json
        
        if not data:
            return jsonify({"status": "error", "message": "No se recibieron datos"}), 400
        
        token = data.get("turnstileToken")
        if not token:
            return jsonify({"status": "error", "message": "Falta el token de seguridad"}), 400

        ok, err = validate_turnstile(token, request.remote_addr)
        if not ok:
            status_code = 500 if err and "TURNSTILE_SECRET_KEY" in err else 403
            return jsonify({"status": "error", "message": err or "Verificación fallida"}), status_code

        urls = data.get("urls", [])
        if not urls:
            return jsonify({"status": "error", "message": "No se proporcionaron URLs"}), 400

        result = subprocess.run(
            ["python", "cloudflare_protect.py", ",".join(urls)],
            capture_output=True,
            text=True,
            timeout=120
        )
        
        if result.returncode != 0:
            error_msg = result.stderr or "Error desconocido al ejecutar el script"
            return jsonify({
                "status": "error",
                "message": f"Error al ejecutar el script: {error_msg[:200]}"
            }), 500

        return jsonify({
            "status": "ok",
            "message": "Protección perimetral en proceso",
            "output": result.stdout
        })

    except subprocess.TimeoutExpired:
        return jsonify({"status": "error", "message": "Timeout: proceso tardó más de 2 minutos"}), 500
    except FileNotFoundError:
        return jsonify({"status": "error", "message": "Script cloudflare_protect.py no encontrado"}), 500
    except Exception as e:
        return jsonify({"status": "error", "message": f"Error interno: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True)