from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import requests
import os

app = Flask(__name__)
CORS(app)  # Permitir solicitudes desde el frontend

def validate_turnstile(token, ip=None):
    """
    Valida el token recibido con la API de Cloudflare Turnstile.
    """
    url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    
    # Asegúrate de tener esta variable de entorno configurada
    secret_key = os.getenv("TURNSTILE_SECRET_KEY")
    
    if not secret_key:
        print("Error: TURNSTILE_SECRET_KEY no está configurada en las variables de entorno.")
        return False

    data = {
        "secret": secret_key,
        "response": token
    }
    
    if ip:
        data["remoteip"] = ip

    try:
        r = requests.post(url, data=data, timeout=5)
        result = r.json()
        return result.get("success", False)
    except Exception as e:
        print(f"Error conectando con Cloudflare Turnstile: {e}")
        return False

@app.route("/health", methods=["GET"])
def health():
    """Endpoint de salud para verificar que el backend esté funcionando"""
    return jsonify({
        "status": "ok",
        "message": "Backend Flask funcionando correctamente"
    })

@app.route("/solicitar-proteccion", methods=["POST"])
def solicitar_proteccion():
    try:
        data = request.json
        
        if not data:
            return jsonify({
                "status": "error",
                "message": "No se recibieron datos en la solicitud"
            }), 400
        
        # --- INICIO VERIFICACIÓN TURNSTILE ---
        token = data.get("turnstileToken")
        
        if not token:
             return jsonify({
                "status": "error",
                "message": "Falta el token de seguridad (Turnstile)"
            }), 400

        # Validamos el token pasando la IP del cliente
        if not validate_turnstile(token, request.remote_addr):
            return jsonify({
                "status": "error", 
                "message": "Verificación de seguridad fallida (Captcha inválido)"
            }), 403
        # --- FIN VERIFICACIÓN TURNSTILE ---

        urls = data.get("urls", [])

        if not urls:
            return jsonify({
                "status": "error",
                "message": "No se proporcionaron URLs"
            }), 400

        # Pasar las URLs al script como argumentos
        # Convertir la lista de URLs a string separado por comas
        urls_str = ",".join(urls)
        
        # Ejecutar el script pasando las URLs como argumento
        result = subprocess.run(
            ["python", "cloudflare_protect.py", urls_str],
            capture_output=True,
            text=True,
            timeout=120  # 2 minutos de timeout
        )
        
        if result.returncode != 0:
            error_msg = result.stderr if result.stderr else "Error desconocido al ejecutar el script"
            print(f"Error del script: {error_msg}")
            print(f"Output del script: {result.stdout}")
            return jsonify({
                "status": "error",
                "message": f"Error al ejecutar el script: {error_msg[:200]}"  # Limitar longitud
            }), 500

        return jsonify({
            "status": "ok",
            "message": "Protección perimetral en proceso",
            "output": result.stdout
        })

    except subprocess.TimeoutExpired:
        return jsonify({
            "status": "error",
            "message": "El proceso tardó demasiado tiempo (más de 2 minutos)"
        }), 500
    except FileNotFoundError:
        return jsonify({
            "status": "error",
            "message": "No se encontró el script cloudflare_protect.py o Python no está instalado"
        }), 500
    except Exception as e:
        print(f"Error en el backend: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Error interno del servidor: {str(e)}"
        }), 500

if __name__ == "__main__":
    app.run(debug=True)