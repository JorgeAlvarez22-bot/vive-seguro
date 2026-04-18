import { useState } from 'react'

const ML_API = import.meta.env.VITE_ML_API_URL

export function useMLPredict() {
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function predict(formData) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${ML_API}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}))
        throw new Error(detail?.detail || `Error ${res.status}`)
      }
      const json = await res.json()
      setResult(json)
      return json
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { predict, result, loading, error }
}
