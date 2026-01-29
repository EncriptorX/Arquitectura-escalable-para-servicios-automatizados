import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  Cloud,
  Clock,
  Eye,
  Globe,
  Lock,
  Server,
  Shield,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export type FeatureItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export type StepItem = {
  number: string;
  title: string;
  description: string;
};

export type TrustItem = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

export type TrustStat = {
  value: string;
  label: string;
};

export const homeFeatures: FeatureItem[] = [
  { icon: Shield, title: 'Protección DDoS', description: 'Defensa multicapa contra ataques DDoS' },
  { icon: Lock, title: 'WAF Avanzado', description: 'Firewall de aplicaciones web inteligente' },
  { icon: Activity, title: 'Anti-Bot', description: 'Filtrado de tráfico malicioso' },
  { icon: Zap, title: 'CDN Global', description: 'Optimización y distribución de contenido' },
  { icon: Globe, title: 'DNS Seguro', description: 'Protección a nivel de DNS' },
  { icon: Server, title: 'Reglas Custom', description: 'Políticas de seguridad personalizadas' },
  { icon: Eye, title: 'Monitoreo 24/7', description: 'Vigilancia continua de amenazas' },
  { icon: BarChart3, title: 'Auto-Mitigación', description: 'Respuesta automática a incidentes' },
];

export const homeBenefits: FeatureItem[] = [
  { icon: Clock, title: 'Protección 24/7', description: 'Seguridad continua sin interrupciones' },
  { icon: ShieldCheck, title: 'Reducción de Riesgos', description: 'Minimice la exposición a amenazas' },
  { icon: Zap, title: 'Alta Disponibilidad', description: 'Tiempo de actividad óptimo' },
  { icon: Cloud, title: 'Gestión Completa', description: 'Administración por expertos' },
];

export const homeSteps: StepItem[] = [
  { number: '01', title: 'Solicitud', description: 'Complete el formulario con sus datos' },
  { number: '02', title: 'Registro', description: 'Indique las URLs a proteger' },
  { number: '03', title: 'Configuración', description: 'Configuramos las políticas de seguridad' },
  { number: '04', title: 'Protección Activa', description: 'Su infraestructura queda protegida' },
];

export const csaasModeHighlights = [
  'Subdominio automático generado',
  'Sin cambios en su DNS',
  'SSL/TLS automático',
  'Protección inmediata',
  'Ideal para SaaS providers',
];

export const directModeHighlights = [
  'Usa sus dominios existentes',
  'Requiere delegación DNS',
  'Control total de DNS',
  'Configuración avanzada',
  'Ideal para infraestructura propia',
];

export const trustHighlights: TrustItem[] = [
  { icon: ShieldCheck, title: 'Tecnología Cloudflare', desc: 'Infraestructura líder mundial' },
  { icon: Lock, title: 'Confidencialidad Total', desc: 'Máximos estándares de privacidad' },
  { icon: Eye, title: 'Gestión Profesional', desc: 'Expertos certificados 24/7' },
];

export const trustStats: TrustStat[] = [
  { value: '99.99%', label: 'Disponibilidad' },
  { value: '<3ms', label: 'Latencia' },
  { value: '182 Tbps', label: 'Capacidad' },
];
