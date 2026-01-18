from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess

app = Flask(__name__)
CORS(app)  # Permitir solicitudes desde el frontend

@app.route("/solicitar-proteccion", methods=["POST"])
def solicitar_proteccion():
    data = request.json
    urls = data.get("urls", [])

    if not urls:
        return jsonify({
            "status": "error",
            "message": "No se proporcionaron URLs"
        }), 400

    # Pasar las URLs al script como argumentos
    # Convertir la lista de URLs a string separado por comas
    urls_str = ",".join(urls)
    
    try:
        # Ejecutar el script pasando las URLs como argumento
        result = subprocess.run(
            ["python", "cloudflare_protect.py", urls_str],
            capture_output=True,
            text=True,
            timeout=120  # 2 minutos de timeout
        )
        
        if result.returncode != 0:
            return jsonify({
                "status": "error",
                "message": f"Error al ejecutar el script: {result.stderr}"
            }), 500

        return jsonify({
            "status": "ok",
            "message": "Protección perimetral en proceso",
            "output": result.stdout
        })
    except subprocess.TimeoutExpired:
        return jsonify({
            "status": "error",
            "message": "El proceso tardó demasiado tiempo"
        }), 500
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error: {str(e)}"
        }), 500

if __name__ == "__main__":
    app.run(debug=True)

