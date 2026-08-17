import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StravaConnectionControl } from './StravaConnectionControl.tsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('StravaConnectionControl', () => {
  it('renders the connect link when disconnected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ connected: false, reason: 'missing_token' }),
      ),
    )

    render(<StravaConnectionControl />)

    expect(screen.getByText('Checking Strava')).toBeInTheDocument()

    const link = await screen.findByRole('link', { name: 'Connect Strava' })
    expect(link).toHaveAttribute('href', '/api/strava/auth/start')
  })

  it('renders connected state without token values', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          connected: true,
          grantedScopes: ['activity:read_all'],
          refreshed: false,
        }),
      ),
    )

    render(<StravaConnectionControl />)

    expect(await screen.findByText('Strava connected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument()
    expect(screen.queryByText('access-token')).not.toBeInTheDocument()
    expect(screen.queryByText('refresh-token')).not.toBeInTheDocument()
  })

  it('disconnects and returns to disconnected state', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          connected: true,
          grantedScopes: ['activity:read_all'],
          refreshed: false,
        }),
      )
      .mockResolvedValueOnce(Response.json({ disconnected: true }))

    vi.stubGlobal('fetch', fetchMock)

    render(<StravaConnectionControl />)

    fireEvent.click(await screen.findByRole('button', { name: 'Disconnect' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith('/api/strava/disconnect', {
        method: 'POST',
      })
    })

    expect(await screen.findByRole('link', { name: 'Connect Strava' })).toBeInTheDocument()
  })
})
