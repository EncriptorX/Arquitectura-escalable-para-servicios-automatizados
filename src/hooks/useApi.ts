/**
 * useApi — Hook unificado para llamadas a Edge Functions
 * ─────────────────────────────────────────────────────────────────────────────
 * Centraliza: autenticación JWT, manejo de errores, estados loading/error,
 * y evita duplicar lógica de fetch en cada componente.
 *
 * Uso:
 *   const { call, loading, error } = useApi()
 *   const data = await call<Report[]>('ai-reports', 'generate', { domainId, reportType })
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

interface CallOptions {
  method?: HttpMethod
  params?: Record<string, string>   // query params para GET
  body?: unknown                     // body para POST/PUT/PATCH
  signal?: AbortSignal
}

interface ApiState<T> {
  data:    T | null
  loading: boolean
  error:   string | null
}

interface UseApiReturn {
  loading: boolean
  error:   string | null
  /** Llama a una Edge Function de Supabase */
  call: <T>(functionName: string, path?: string, body?: unknown, options?: CallOptions) => Promise<T>
  /** Llama a cualquier URL con autenticación JWT */
  fetch: <T>(url: string, options?: CallOptions) => Promise<T>
  reset: () => void
}

export function useApi(): UseApiReturn {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
  }, [])

  /**
   * Obtiene el JWT de la sesión activa.
   * Lanza si no hay sesión — el componente debe manejar esto.
   */
  const getToken = async (): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('No hay sesión activa')
    return session.access_token
  }

  /**
   * Llama a una Edge Function de Supabase.
   * @param functionName  Nombre de la función (ej: 'ai-reports')
   * @param path          Ruta dentro de la función (ej: 'generate')
   * @param body          Body del request
   * @param options       Opciones adicionales
   */
  const call = useCallback(async <T>(
    functionName: string,
    path     = '',
    body?:   unknown,
    options: CallOptions = {}
  ): Promise<T> => {
    setLoading(true)
    setError(null)

    try {
      const token      = await getToken()
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const url        = `${supabaseUrl}/functions/v1/${functionName}${path ? `/${path}` : ''}`

      const method = options.method ?? (body ? 'POST' : 'GET')

      const response = await globalThis.fetch(url, {
        method,
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body:   body ? JSON.stringify(body) : undefined,
        signal: options.signal,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: response.statusText }))
        const msg = errData.error ?? errData.message ?? `Error ${response.status}`
        throw new Error(msg)
      }

      return (await response.json()) as T

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Fetch genérico con JWT adjunto.
   */
  const fetchWithAuth = useCallback(async <T>(
    url:     string,
    options: CallOptions = {}
  ): Promise<T> => {
    setLoading(true)
    setError(null)

    try {
      const token  = await getToken()
      const method = options.method ?? (options.body ? 'POST' : 'GET')

      let finalUrl = url
      if (options.params) {
        const qs = new URLSearchParams(options.params).toString()
        finalUrl  = `${url}?${qs}`
      }

      const response = await globalThis.fetch(finalUrl, {
        method,
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body:   options.body ? JSON.stringify(options.body) : undefined,
        signal: options.signal,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(errData.error ?? `Error ${response.status}`)
      }

      return (await response.json()) as T

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, call, fetch: fetchWithAuth, reset }
}

/**
 * Hook para cargar datos al montar el componente.
 * Evita el patrón useEffect + useState repetido en cada vista.
 *
 * Uso:
 *   const { data, loading, error, refetch } = useApiData(
 *     () => call<Report[]>('ai-reports', 'list'),
 *     [organization?.id]
 *   )
 */
export function useApiData<T>(
  fetcher: () => Promise<T>,
  deps:    React.DependencyList = []
): ApiState<T> & { refetch: () => void } {
  const [state, setState] = useState<ApiState<T>>({
    data: null, loading: true, error: null,
  })

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const data = await fetcher()
      setState({ data, loading: false, error: null })
    } catch (err: unknown) {
      setState({ data: null, loading: false, error: err instanceof Error ? err.message : 'Error' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  // Ejecutar al montar y cuando cambien las dependencias
  useState(() => { load() })

  return { ...state, refetch: load }
}
