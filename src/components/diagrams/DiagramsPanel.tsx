/**
 * DiagramsPanel
 * Panel unificado que agrupa todos los diagramas técnicos de Cuban CAS.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Network, Lock, Server, Cloud, Database, FlaskConical } from 'lucide-react'
import { ArchitectureDiagram }   from '../ArchitectureDiagram'
import { AuthFlowDiagram }       from './AuthFlowDiagram'
import { ProxySequenceDiagram }  from './ProxySequenceDiagram'
import { DeploymentDiagram }     from './DeploymentDiagram'
import { ERDiagram }             from './ERDiagram'
import { ValidationDashboard }   from './ValidationDashboard'

type DiagramTab = 'architecture' | 'auth' | 'proxy' | 'deployment' | 'er' | 'validation'

const TABS = [
  { id: 'architecture', label: 'Componentes',   icon: Network,       desc: 'Diagrama de componentes por capas' },
  { id: 'auth',         label: 'Autenticación', icon: Lock,          desc: 'Flujo de login y registro'         },
  { id: 'proxy',        label: 'Proxy',         icon: Server,        desc: 'Secuencia del proxy multi-tenant'  },
  { id: 'deployment',   label: 'Despliegue',    icon: Cloud,         desc: 'Infraestructura cloud-native'      },
  { id: 'er',           label: 'DER',           icon: Database,      desc: 'Diagrama Entidad-Relación'         },
  { id: 'validation',   label: 'Validación',    icon: FlaskConical,  desc: 'Evidencias de rendimiento y RLS'   },
] as const

export function DiagramsPanel() {
  const [tab, setTab] = useState<DiagramTab>('architecture')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Diagramas Técnicos</h1>
        <p className="text-gray-400 text-sm mt-1">Documentación visual de la arquitectura Cuban CAS</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as DiagramTab)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                tab === t.id
                  ? 'bg-cyan-500/20 border-cyan-500/30'
                  : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
              }`}
            >
              <Icon className={`w-5 h-5 ${tab === t.id ? 'text-cyan-400' : 'text-gray-400'}`} />
              <div className="text-center">
                <p className={`text-xs font-semibold ${tab === t.id ? 'text-cyan-400' : 'text-white'}`}>
                  {t.label}
                </p>
                <p className="text-xs text-gray-500 hidden sm:block mt-0.5">{t.desc}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Contenido */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'architecture' && <ArchitectureDiagram />}
          {tab === 'auth'         && <AuthFlowDiagram />}
          {tab === 'proxy'        && <ProxySequenceDiagram />}
          {tab === 'deployment'   && <DeploymentDiagram />}
          {tab === 'er'           && <ERDiagram />}
          {tab === 'validation'   && <ValidationDashboard />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
