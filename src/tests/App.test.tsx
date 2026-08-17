import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App.tsx'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App shell', () => {
  it('renders the state-driven workspace placeholders', async () => {
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
      await screen.findByText('12 normalized rides available.'),
    ).toBeInTheDocument()
    expect(screen.getByText('12 rides currently selected.')).toBeInTheDocument()
    expect(
      screen.getByText('Current view: trend; metric: averageSpeedMph.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Selection: 12 of 12 rides')).toBeInTheDocument()
    expect(screen.getByText('View: trend')).toBeInTheDocument()
    expect(screen.getByLabelText('AI conversation panel')).toBeInTheDocument()
    expect(screen.getByLabelText('Summary and status')).toBeInTheDocument()
  })
})
