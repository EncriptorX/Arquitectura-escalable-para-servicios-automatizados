#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script optimizado para verificar protección perimetral de Cloudflare
Ejecutar después de usar el formulario web
"""

import os
import json
import urllib.request
import sys
from typing import Optional, Dict, List, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import lru_cache
from dotenv import load_dotenv


# ===============================
# Configuración
# ===============================
class Config:
    """Configuración centralizada"""
    API_TIMEOUT = 10
    MAX_WORKERS = 5
    
    @staticmethod
    @lru_cache(maxsize=1)
    def get_symbols():
        """Obtiene símbolos (cached)"""
        use_emojis = sys.platform != 'win32' or os.getenv('PYTHONIOENCODING', '').lower() == 'utf-8'
        return {
            'CHECK': "✅" if use_emojis else "[OK]",
            'CROSS': "❌" if use_emojis else "[X]",
            'WARN': "⚠️" if use_emojis else "[!]",
            'INFO': "ℹ️" if use_emojis else "[i]"
        }


# ===============================
# Cliente de Cloudflare API (Optimizado)
# ===============================
class CloudflareClient:
    """Cliente optimizado para API de Cloudflare con caché y batch requests"""
    
    def __init__(self, api_token: str, zone_id: str):
        self.api_token = api_token
        self.zone_id = zone_id
        self.base_url = "https://api.cloudflare.com/client/v4"
        self._cache = {}
    
    def _get_headers(self) -> Dict[str, str]:
        """Headers reutilizables"""
        return {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
    
    def request(self, method: str, endpoint: str, data: Optional[Dict] = None, use_cache: bool = True) -> Optional[Dict]:
        """Petición HTTP con caché opcional"""
        cache_key = f"{method}:{endpoint}"
        
        # Usar caché para GET requests
        if use_cache and method == "GET" and cache_key in self._cache:
            return self._cache[cache_key]
        
        url = f"{self.base_url}/{endpoint}"
        
        try:
            data_encoded = json.dumps(data).encode('utf-8') if data else None
            req = urllib.request.Request(url, data=data_encoded, headers=self._get_headers(), method=method)
            
            with urllib.request.urlopen(req, timeout=Config.API_TIMEOUT) as response:
                result = json.loads(response.read().decode('utf-8'))
                
                # Cachear GET requests exitosos
                if use_cache and method == "GET" and result:
                    self._cache[cache_key] = result
                
                return result
        except Exception:
            return None
    
    def batch_get_settings(self, settings: List[str]) -> Dict[str, Optional[Dict]]:
        """Obtiene múltiples settings en paralelo"""
        results = {}
        
        with ThreadPoolExecutor(max_workers=Config.MAX_WORKERS) as executor:
            future_to_setting = {
                executor.submit(self.request, "GET", f"zones/{self.zone_id}/settings/{setting}"): setting
                for setting in settings
            }
            
            for future in as_completed(future_to_setting):
                setting = future_to_setting[future]
                try:
                    results[setting] = future.result()
                except Exception:
                    results[setting] = None
        
        return results


# ===============================
# Verificador Optimizado
# ===============================
class ProtectionVerifier:
    """Verificador optimizado con procesamiento paralelo"""
    
    def __init__(self, client: CloudflareClient):
        self.client = client
        self.symbols = Config.get_symbols()
    
    def _print_section(self, title: str, icon: str = ""):
        """Imprime encabezado de sección"""
        print(f"\n{'=' * 70}\n{icon} {title}\n{'=' * 70}")
    
    def verify_zone_info(self) -> Optional[str]:
        """Verifica información de la zona"""
        self._print_section("INFORMACIÓN DE LA ZONA", "📋")
        
        res = self.client.request("GET", f"zones/{self.client.zone_id}")
        if res and res.get("success"):
            zona = res["result"]
            print(f"{self.symbols['CHECK']} Zona: {zona['name']}")
            print(f"   Status: {zona['status']}")
            print(f"   Plan: {zona['plan']['name']}")
            return zona['name']
        
        print(f"{self.symbols['CROSS']} No se pudo obtener información de la zona")
        return None
    
    def verify_dns_records(self, domain_filter: Optional[str] = None) -> bool:
        """Verifica registros DNS"""
        self._print_section("REGISTROS DNS", "🌐")
        
        res = self.client.request("GET", f"zones/{self.client.zone_id}/dns_records")
        if not res or not res.get("success"):
            print(f"{self.symbols['CROSS']} No se pudieron obtener registros DNS")
            return False
        
        records = res["result"]
        if not records:
            print(f"{self.symbols['WARN']} No hay registros DNS")
            return False
        
        # Filtrar y procesar
        filtered = [r for r in records if not domain_filter or r['name'] == domain_filter]
        
        if not filtered and domain_filter:
            print(f"{self.symbols['WARN']} Dominio '{domain_filter}' no encontrado")
            return False
        
        for record in filtered:
            proxied = record.get("proxied")
            icon = "🟠" if proxied else "⚪"
            status = "PROTEGIDO" if proxied else "SIN PROTECCIÓN"
            
            print(f"\n{icon} {record['name']}")
            print(f"   Tipo: {record['type']} | IP: {record['content']} | Estado: {status}")
            
            if proxied:
                print(f"   {self.symbols['CHECK']} Protegido por Cloudflare")
        
        return True
    
    def verify_all_settings(self) -> Dict[str, bool]:
        """Verifica todos los settings en paralelo (optimizado)"""
        settings_to_check = ['ssl', 'always_use_https', 'waf', 'security_level']
        
        # Obtener todos los settings en paralelo
        results = self.client.batch_get_settings(settings_to_check)
        
        verification_results = {}
        
        # SSL
        self._print_section("CONFIGURACIÓN SSL/TLS", "🔒")
        ssl_res = results.get('ssl')
        if ssl_res and ssl_res.get("success"):
            ssl_mode = ssl_res["result"]["value"]
            is_strict = ssl_mode == "strict"
            print(f"Modo SSL: {ssl_mode.upper()}")
            print(f"{self.symbols['CHECK'] if is_strict else self.symbols['WARN']} {'Configurado correctamente' if is_strict else 'Se recomienda modo STRICT'}")
            verification_results['ssl'] = is_strict
        else:
            verification_results['ssl'] = False
        
        # HTTPS Redirect
        self._print_section("REDIRECCIÓN HTTPS", "🔄")
        https_res = results.get('always_use_https')
        if https_res and https_res.get("success"):
            https_mode = https_res["result"]["value"]
            is_on = https_mode == "on"
            print(f"Always Use HTTPS: {https_mode.upper()}")
            print(f"{self.symbols['CHECK'] if is_on else self.symbols['CROSS']} {'Activado' if is_on else 'Desactivado'}")
            verification_results['https'] = is_on
        else:
            verification_results['https'] = False
        
        # WAF
        self._print_section("WEB APPLICATION FIREWALL", "🛡️")
        waf_res = results.get('waf')
        if waf_res and waf_res.get("success"):
            waf_mode = waf_res["result"]["value"]
            is_on = waf_mode == "on"
            print(f"Estado WAF: {waf_mode.upper()}")
            print(f"{self.symbols['CHECK'] if is_on else self.symbols['CROSS']} {'Activado' if is_on else 'Desactivado'}")
            verification_results['waf'] = is_on
        else:
            verification_results['waf'] = False
        
        # Security Level
        self._print_section("PROTECCIÓN DDoS", "🚨")
        sec_res = results.get('security_level')
        if sec_res and sec_res.get("success"):
            sec_level = sec_res["result"]["value"]
            is_high = sec_level == "high"
            print(f"Security Level: {sec_level.upper()}")
            print(f"{self.symbols['CHECK'] if is_high else self.symbols['WARN']} {'Nivel alto' if is_high else 'Se recomienda nivel HIGH'}")
            verification_results['ddos'] = is_high
        else:
            verification_results['ddos'] = False
        
        return verification_results
    
    def verify_firewall_rules(self) -> Optional[bool]:
        """Verifica reglas de firewall"""
        self._print_section("REGLAS DE FIREWALL", "🔥")
        
        res = self.client.request("GET", f"zones/{self.client.zone_id}/firewall/rules")
        
        if not res:
            print(f"{self.symbols['WARN']} Firewall Rules no disponible")
            return None
        
        if not res.get("success"):
            errors = res.get("errors", [])
            if errors and errors[0].get("code") == 1003:
                print(f"{self.symbols['WARN']} Limitación de plan")
                return None
            return False
        
        rules = res["result"]
        cas_rule = next((r for r in rules if "CAS Auto-Provisioned" in r.get("description", "")), None)
        
        if cas_rule:
            print(f"{self.symbols['CHECK']} Regla CAS encontrada")
            print(f"   Estado: {'Activa' if not cas_rule.get('paused') else 'Pausada'}")
            return True
        
        print(f"{self.symbols['WARN']} Regla CAS no encontrada")
        return False


# ===============================
# Generador de Resumen Optimizado
# ===============================
class SummaryGenerator:
    """Generador optimizado de resúmenes"""
    
    @staticmethod
    def generate(results: Dict[str, Optional[bool]]):
        """Genera resumen optimizado"""
        symbols = Config.get_symbols()
        
        # Clasificar resultados
        active = sum(1 for v in results.values() if v is True)
        inactive = sum(1 for v in results.values() if v is False)
        limited = sum(1 for v in results.values() if v is None)
        total = active + inactive
        
        print(f"\n{'=' * 70}\n📊 RESUMEN\n{'=' * 70}")
        print(f"\n📈 Estadísticas: {active}/{total} activos | {inactive} inactivos | {limited} limitados")
        
        # Evaluación
        if total == 0:
            level = "DESCONOCIDO"
        elif active == total:
            level = "ÓPTIMO 🎉"
        elif active >= total * 0.7:
            level = "BUENO"
        else:
            level = "MEJORABLE"
        
        print(f"\n🎯 Nivel de seguridad: {level}")
        
        # Detalles
        if active > 0:
            print(f"\n{symbols['CHECK']} Activos:")
            for name, value in results.items():
                if value is True:
                    print(f"   • {name}")
        
        if inactive > 0:
            print(f"\n{symbols['CROSS']} Inactivos:")
            for name, value in results.items():
                if value is False:
                    print(f"   • {name}")


# ===============================
# Función Principal Optimizada
# ===============================
def main():
    """Función principal optimizada"""
    load_dotenv()
    
    CF_API_TOKEN = os.getenv("CF_API_TOKEN", "")
    CF_ZONE_ID = os.getenv("CF_ZONE_ID", "")
    
    symbols = Config.get_symbols()
    
    print(f"{'=' * 70}\nVERIFICACIÓN DE PROTECCIÓN CLOUDFLARE\n{'=' * 70}")
    
    if not CF_API_TOKEN or not CF_ZONE_ID:
        print(f"\n{symbols['CROSS']} Credenciales no configuradas")
        sys.exit(1)
    
    print(f"{symbols['CHECK']} Credenciales OK")
    
    # Crear cliente y verificador
    client = CloudflareClient(CF_API_TOKEN, CF_ZONE_ID)
    verifier = ProtectionVerifier(client)
    
    # Verificar zona
    zone_name = verifier.verify_zone_info()
    if not zone_name:
        sys.exit(1)
    
    # Preguntar por dominio
    print(f"\nDominio a verificar (Enter para todos): ", end='')
    domain = input().strip() or None
    
    # Ejecutar verificaciones (optimizado con procesamiento paralelo)
    results = {}
    
    # DNS (secuencial, necesita ser primero)
    results["DNS Proxy"] = verifier.verify_dns_records(domain)
    
    # Settings en paralelo
    settings_results = verifier.verify_all_settings()
    results.update({
        "SSL/TLS": settings_results.get('ssl', False),
        "HTTPS Redirect": settings_results.get('https', False),
        "WAF": settings_results.get('waf', False),
        "DDoS": settings_results.get('ddos', False)
    })
    
    # Firewall rules
    results["Firewall Rules"] = verifier.verify_firewall_rules()
    
    # Generar resumen
    SummaryGenerator.generate(results)
    
    print(f"\n{symbols['CHECK']} Verificación completada")


if __name__ == "__main__":
    main()



# ===============================
# Cliente de Cloudflare API
# ===============================
class CloudflareClient:
    """Cliente para interactuar con la API de Cloudflare"""
    
    def __init__(self, api_token: str, zone_id: str):
        self.api_token = api_token
        self.zone_id = zone_id
        self.base_url = "https://api.cloudflare.com/client/v4"
    
    def request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Optional[Dict]:
        """Realiza una petición a la API de Cloudflare"""
        url = f"{self.base_url}/{endpoint}"
        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
        
        try:
            data_encoded = json.dumps(data).encode('utf-8') if data else None
            req = urllib.request.Request(url, data=data_encoded, headers=headers, method=method)
            
            with urllib.request.urlopen(req, timeout=10) as response:
                return json.loads(response.read().decode('utf-8'))
        except Exception as e:
            print(f"{symbols.CROSS} Error: {e}")
            return None
    
    def get_zone_info(self) -> Optional[Dict]:
        """Obtiene información de la zona"""
        return self.request("GET", f"zones/{self.zone_id}")
    
    def get_dns_records(self) -> Optional[Dict]:
        """Obtiene registros DNS"""
        return self.request("GET", f"zones/{self.zone_id}/dns_records")
    
    def get_ssl_setting(self) -> Optional[Dict]:
        """Obtiene configuración SSL"""
        return self.request("GET", f"zones/{self.zone_id}/settings/ssl")
    
    def get_https_redirect_setting(self) -> Optional[Dict]:
        """Obtiene configuración de redirección HTTPS"""
        return self.request("GET", f"zones/{self.zone_id}/settings/always_use_https")
    
    def get_waf_setting(self) -> Optional[Dict]:
        """Obtiene configuración WAF"""
        return self.request("GET", f"zones/{self.zone_id}/settings/waf")
    
    def get_security_level_setting(self) -> Optional[Dict]:
        """Obtiene nivel de seguridad"""
        return self.request("GET", f"zones/{self.zone_id}/settings/security_level")
    
    def get_firewall_rules(self) -> Optional[Dict]:
        """Obtiene reglas de firewall"""
        return self.request("GET", f"zones/{self.zone_id}/firewall/rules")


# ===============================
# Verificadores
# ===============================
class ProtectionVerifier:
    """Verifica las protecciones de Cloudflare"""
    
    def __init__(self, client: CloudflareClient):
        self.client = client
    
    def print_section(self, title: str, icon: str = ""):
        """Imprime un encabezado de sección"""
        print("\n" + "=" * 70)
        print(f"{icon} {title}")
        print("=" * 70)
    
    def verify_zone_info(self) -> Optional[str]:
        """Verifica información de la zona"""
        self.print_section("INFORMACIÓN DE LA ZONA", "📋")
        
        res = self.client.get_zone_info()
        if res and res.get("success"):
            zona = res["result"]
            print(f"{symbols.CHECK} Zona: {zona['name']}")
            print(f"   Status: {zona['status']}")
            print(f"   Plan: {zona['plan']['name']}")
            print(f"   Nameservers:")
            for ns in zona.get("name_servers", []):
                print(f"      - {ns}")
            return zona['name']
        else:
            print(f"{symbols.CROSS} No se pudo obtener información de la zona")
            return None
    
    def verify_dns_records(self, domain_filter: Optional[str] = None) -> bool:
        """Verifica registros DNS"""
        self.print_section("REGISTROS DNS", "🌐")
        
        res = self.client.get_dns_records()
        if not res or not res.get("success"):
            print(f"{symbols.CROSS} No se pudieron obtener los registros DNS")
            return False
        
        records = res["result"]
        if not records:
            print(f"{symbols.WARN} No hay registros DNS configurados")
            return False
        
        found = False
        for record in records:
            if domain_filter and record['name'] != domain_filter:
                continue
            
            found = True
            proxy_icon = "🟠" if record.get("proxied") else "⚪"
            proxy_text = "PROXIED (Protegido)" if record.get("proxied") else "DNS Only (Sin protección)"
            
            print(f"\n{proxy_icon} {record['name']}")
            print(f"   Tipo: {record['type']}")
            print(f"   Apunta a: {record['content']}")
            print(f"   Estado: {proxy_text}")
            print(f"   TTL: {record['ttl']}")
            
            if record.get("proxied"):
                print(f"   {symbols.CHECK} Este dominio ESTÁ PROTEGIDO por Cloudflare")
            else:
                print(f"   {symbols.WARN} Este dominio NO está protegido (proxy desactivado)")
        
        if domain_filter and not found:
            print(f"{symbols.WARN} No se encontró el dominio '{domain_filter}'")
            print("   Posibles causas:")
            print("   1. El dominio no se procesó correctamente")
            print("   2. El dominio no pertenece a esta zona")
            print("   3. Hubo un error al crear el registro")
            return False
        
        return found
    
    def verify_ssl(self) -> bool:
        """Verifica configuración SSL/TLS"""
        self.print_section("CONFIGURACIÓN SSL/TLS", "🔒")
        
        res = self.client.get_ssl_setting()
        if not res or not res.get("success"):
            print(f"{symbols.CROSS} No se pudo verificar la configuración SSL")
            print("   CAUSA: Error de comunicación con Cloudflare API")
            return False
        
        ssl_mode = res["result"]["value"]
        print(f"Modo SSL: {ssl_mode.upper()}")
        
        if ssl_mode == "strict":
            print(f"{symbols.CHECK} SSL CONFIGURADO EN MODO FULL (STRICT)")
            print("\n   Características:")
            print("   ✓ Cifrado end-to-end (Cliente → Cloudflare → Servidor)")
            print("   ✓ Certificado válido requerido en el servidor origen")
            print("   ✓ Máxima seguridad en la comunicación")
            return True
        else:
            print(f"{symbols.WARN} SSL en modo '{ssl_mode.upper()}' (se recomienda 'STRICT')")
            print("\n   Modos disponibles:")
            print("   - OFF: Sin cifrado (NO RECOMENDADO)")
            print("   - FLEXIBLE: Cifrado solo Cliente → Cloudflare")
            print("   - FULL: Cifrado completo pero sin validar certificado")
            print("   - STRICT: Cifrado completo con certificado válido (RECOMENDADO)")
            return False
    
    def verify_https_redirect(self) -> bool:
        """Verifica redirección HTTPS"""
        self.print_section("REDIRECCIÓN HTTPS AUTOMÁTICA", "🔄")
        
        res = self.client.get_https_redirect_setting()
        if not res or not res.get("success"):
            print(f"{symbols.CROSS} No se pudo verificar la redirección HTTPS")
            return False
        
        https_mode = res["result"]["value"]
        print(f"Always Use HTTPS: {https_mode.upper()}")
        
        if https_mode == "on":
            print(f"{symbols.CHECK} REDIRECCIÓN HTTPS ACTIVADA")
            print("\n   Funcionamiento:")
            print("   ✓ Todo el tráfico HTTP se redirige automáticamente a HTTPS")
            print("   ✓ Redirección 301 (permanente) a nivel de edge")
            return True
        else:
            print(f"{symbols.CROSS} REDIRECCIÓN HTTPS DESACTIVADA")
            print("   IMPACTO: Los usuarios pueden acceder por HTTP sin cifrado")
            print("   ACCIÓN: Activa 'Always Use HTTPS' inmediatamente")
            return False
    
    def verify_waf(self) -> bool:
        """Verifica WAF"""
        self.print_section("WEB APPLICATION FIREWALL (WAF)", "🛡️")
        
        res = self.client.get_waf_setting()
        if not res or not res.get("success"):
            print(f"{symbols.CROSS} No se pudo verificar el WAF")
            return False
        
        waf_mode = res["result"]["value"]
        print(f"Estado WAF: {waf_mode.upper()}")
        
        if waf_mode == "on":
            print(f"{symbols.CHECK} WAF ACTIVADO - Protección contra ataques web")
            print("\n   Protecciones incluidas:")
            print("   ✓ SQL Injection - Previene inyección de código SQL")
            print("   ✓ XSS (Cross-Site Scripting) - Bloquea scripts maliciosos")
            print("   ✓ CSRF - Protege contra falsificación de peticiones")
            return True
        else:
            print(f"{symbols.CROSS} WAF DESACTIVADO")
            print("   IMPACTO: Tu sitio está vulnerable a ataques web comunes")
            return False
    
    def verify_security_level(self) -> bool:
        """Verifica nivel de seguridad DDoS"""
        self.print_section("PROTECCIÓN DDoS", "🚨")
        
        res = self.client.get_security_level_setting()
        if not res or not res.get("success"):
            print(f"{symbols.CROSS} No se pudo verificar el Security Level")
            return False
        
        sec_level = res["result"]["value"]
        print(f"Security Level: {sec_level.upper()}")
        
        if sec_level == "high":
            print(f"{symbols.CHECK} PROTECCIÓN DDoS EN NIVEL ALTO")
            print("\n   Protecciones activas:")
            print("   ✓ DDoS Layer 3/4 - Protección a nivel de red y transporte")
            print("   ✓ DDoS Layer 7 - Protección a nivel de aplicación")
            return True
        else:
            print(f"{symbols.WARN} Security Level en '{sec_level.upper()}' (se recomienda 'HIGH')")
            return False
    
    def verify_firewall_rules(self) -> Optional[bool]:
        """Verifica reglas de firewall personalizadas"""
        self.print_section("REGLAS DE FIREWALL PERSONALIZADAS", "🔥")
        
        res = self.client.get_firewall_rules()
        
        if not res:
            print(f"{symbols.WARN} LIMITACIÓN DE PLAN: Firewall Rules no disponible")
            print("   Nota: Las protecciones básicas (WAF, DDoS) siguen activas")
            return None
        
        if not res.get("success"):
            errors = res.get("errors", [])
            if errors and errors[0].get("code") == 1003:
                print(f"{symbols.WARN} LIMITACIÓN DE PLAN: Firewall Rules no disponible")
                return None
            print(f"{symbols.CROSS} No se pudieron obtener las reglas de firewall")
            return False
        
        rules = res["result"]
        if not rules:
            print(f"{symbols.WARN} No hay reglas de firewall configuradas")
            return None
        
        print(f"Total de reglas: {len(rules)}")
        
        # Buscar regla CAS
        cas_rule = next((r for r in rules if "CAS Auto-Provisioned" in r.get("description", "")), None)
        
        if cas_rule:
            print(f"\n{symbols.CHECK} Regla de CAS encontrada:")
            print(f"   Descripción: {cas_rule['description']}")
            print(f"   Acción: {cas_rule['action']}")
            print(f"   Estado: {'Activa' if not cas_rule.get('paused') else 'Pausada'}")
            return True
        else:
            print(f"\n{symbols.WARN} No se encontró la regla de firewall de CAS")
            return False


# ===============================
# Generador de Resumen
# ===============================
class SummaryGenerator:
    """Genera resumen de verificación"""
    
    @staticmethod
    def generate(results: Dict[str, Optional[bool]]):
        """Genera resumen de resultados"""
        print("\n" + "=" * 70)
        print("📊 RESUMEN DE PROTECCIÓN PERIMETRAL")
        print("=" * 70)
        
        active = {k: v for k, v in results.items() if v is True}
        inactive = {k: v for k, v in results.items() if v is False}
        limited = {k: v for k, v in results.items() if v is None}
        
        total = len([r for r in results.values() if r is not None])
        successful = len(active)
        
        print(f"\n📈 Estadísticas:")
        print(f"   Total de controles verificados: {len(results)}")
        print(f"   Controles activos: {len(active)}")
        print(f"   Controles inactivos: {len(inactive)}")
        print(f"   Limitaciones de plan: {len(limited)}")
        
        if active:
            print(f"\n{symbols.CHECK} CONTROLES ACTIVOS:")
            for name in active.keys():
                print(f"   {symbols.CHECK} {name}")
        
        if inactive:
            print(f"\n{symbols.CROSS} CONTROLES INACTIVOS:")
            for name in inactive.keys():
                print(f"   {symbols.CROSS} {name}")
        
        if limited:
            print(f"\n{symbols.WARN} LIMITACIONES TÉCNICAS:")
            for name in limited.keys():
                print(f"   {symbols.WARN} {name}")
        
        print("\n" + "=" * 70)
        print("🎯 EVALUACIÓN GENERAL")
        print("=" * 70)
        
        if total == 0:
            print(f"{symbols.WARN} No se pudieron verificar controles")
        elif successful == total:
            print("🎉 ¡EXCELENTE! Todas las protecciones disponibles están activas")
            print("   Nivel de seguridad: ÓPTIMO")
        elif successful >= total * 0.7:
            print(f"{symbols.CHECK} BIEN - La mayoría de las protecciones están activas")
            print("   Nivel de seguridad: BUENO")
        else:
            print(f"{symbols.WARN} ATENCIÓN - Pocas protecciones están activas")
            print("   Nivel de seguridad: MEJORABLE")


# ===============================
# Función Principal
# ===============================
def main():
    """Función principal"""
    # Cargar variables de entorno
    load_dotenv()
    
    CF_API_TOKEN = os.getenv("CF_API_TOKEN", "")
    CF_ZONE_ID = os.getenv("CF_ZONE_ID", "")
    
    print("=" * 70)
    print("VERIFICACIÓN DE PROTECCIÓN PERIMETRAL CLOUDFLARE")
    print("=" * 70)
    
    # Verificar credenciales
    if not CF_API_TOKEN or not CF_ZONE_ID:
        print(f"\n{symbols.CROSS} Credenciales no configuradas")
        print("   Configura CF_API_TOKEN y CF_ZONE_ID en el archivo .env")
        sys.exit(1)
    
    print(f"{symbols.CHECK} Credenciales configuradas")
    
    # Crear cliente y verificador
    client = CloudflareClient(CF_API_TOKEN, CF_ZONE_ID)
    verifier = ProtectionVerifier(client)
    
    # Obtener info de zona
    zone_name = verifier.verify_zone_info()
    if not zone_name:
        sys.exit(1)
    
    # Preguntar por dominio
    print(f"\n¿Qué dominio deseas verificar?")
    print(f"Ejemplos: {zone_name}, app.{zone_name}, api.{zone_name}")
    domain = input("Dominio (Enter para ver todos): ").strip() or None
    
    # Ejecutar verificaciones
    results = {
        "DNS con Proxy": verifier.verify_dns_records(domain),
        "SSL/TLS Strict": verifier.verify_ssl(),
        "Force HTTPS": verifier.verify_https_redirect(),
        "WAF": verifier.verify_waf(),
        "DDoS Protection": verifier.verify_security_level(),
        "Firewall Rules": verifier.verify_firewall_rules()
    }
    
    # Generar resumen
    SummaryGenerator.generate(results)
    
    print(f"\n{symbols.CHECK} Verificación completada")
    print(f"\n{symbols.INFO} TIP: Ejecuta este script después de cada cambio")


if __name__ == "__main__":
    main()
