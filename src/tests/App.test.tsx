import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App.tsx'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App shell', () => {
  it('renders the Phase 2 workspace placeholders', () => {
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
    expect(screen.getByLabelText('AI conversation panel')).toBeInTheDocument()
    expect(screen.getByLabelText('Summary and status')).toBeInTheDocument()
  })
})
