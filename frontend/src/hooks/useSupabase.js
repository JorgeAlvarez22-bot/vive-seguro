import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

/**
 * Hook genérico para consultar Supabase.
 * @param {Function} queryFn  función que recibe supabase y devuelve una query
 * @param {Array}    deps     dependencias para re-ejecutar la consulta
 */
export function useSupabase(queryFn, deps = []) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    queryFn(supabase)
      .then(({ data: result, error: err }) => {
        if (cancelled) return
        if (err) setError(err.message)
        else     setData(result)
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error }
}
