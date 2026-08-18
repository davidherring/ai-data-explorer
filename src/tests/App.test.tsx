import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App.tsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('App shell', () => {
  it('renders the state-driven trend workspace', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ connected: false, reason: 'missing_token' }),
      ),
    )

    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Interactive AI Data Explorer' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Analysis workspace')).toBeInTheDocument()
    expect(screen.getByText('Selection / analysis controls')).toBeInTheDocument()
    expect(
      await screen.findByText('12 of 12 rides selected'),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText('Average speed over calendar time'),
    ).toBeInTheDocument()
    expect(screen.getByText('Selection ready for trend view.')).toBeInTheDocument()
    expect(screen.getByText('View: trend')).toBeInTheDocument()
    expect(screen.getByLabelText('AI conversation panel')).toBeInTheDocument()
    expect(screen.getByLabelText('Summary and status')).toBeInTheDocument()
  })

  it('updates selected ride count when a filter control changes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ connected: false, reason: 'missing_token' }),
      ),
    )

    render(<App />)

    expect(
      await screen.findByText('12 of 12 rides selected'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('2025'))

    expect(screen.getByText('3 of 12 rides selected')).toBeInTheDocument()
    expect(document.body.textContent).toContain('2025-05-21')
    expect(document.body.textContent).not.toContain('2024-02-07')
  })

  it('shows an empty selection state when filters match no rides', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ connected: false, reason: 'missing_token' }),
      ),
    )

    render(<App />)

    expect(
      await screen.findByText('12 of 12 rides selected'),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Start'), {
      target: { value: '2030-01-01' },
    })

    expect(screen.getByText('0 of 12 rides selected')).toBeInTheDocument()
    expect(
      screen.getByText('No rides match the current filters.'),
    ).toBeInTheDocument()
  })
})
