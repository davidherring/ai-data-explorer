import { useEffect, useState } from 'react'

type StravaConnectionStatus =
  | {
      connected: true
      grantedScopes: string[]
      refreshed: boolean
    }
  | {
      connected: false
      reason?: string
    }

type RequestState = 'loading' | 'ready' | 'error'

export function StravaConnectionControl() {
  const [requestState, setRequestState] = useState<RequestState>('loading')
  const [status, setStatus] = useState<StravaConnectionStatus>({
    connected: false,
  })

  useEffect(() => {
    let active = true

    async function loadStatus() {
      try {
        const response = await fetch('/api/strava/status')
        const nextStatus = (await response.json()) as StravaConnectionStatus

        if (active) {
          setStatus(nextStatus)
          setRequestState('ready')
        }
      } catch {
        if (active) {
          setStatus({ connected: false })
          setRequestState('error')
        }
      }
    }

    void loadStatus()

    return () => {
      active = false
    }
  }, [])

  async function disconnect() {
    setRequestState('loading')

    try {
      await fetch('/api/strava/disconnect', { method: 'POST' })
      setStatus({ connected: false })
      setRequestState('ready')
    } catch {
      setRequestState('error')
    }
  }

  if (requestState === 'loading') {
    return <span className="connection-status">Checking Strava</span>
  }

  if (status.connected) {
    return (
      <div className="connection-control">
        <span className="connection-status">Strava connected</span>
        <button className="secondary-button" type="button" onClick={disconnect}>
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="connection-control">
      {requestState === 'error' ? (
        <span className="connection-status">Strava status unavailable</span>
      ) : null}
      <a className="connect-link" href="/api/strava/auth/start">
        Connect Strava
      </a>
    </div>
  )
}

