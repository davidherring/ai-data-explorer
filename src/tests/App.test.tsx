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
    expect(screen.getByRole('group', { name: 'Visualization view' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trend' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Relationship' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByText('Selection ready.')).toBeInTheDocument()
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

  it('switches between Trend and Relationship views without changing selection', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'Relationship' }))

    expect(screen.getByText('View: relationship')).toBeInTheDocument()
    expect(screen.getByLabelText('Elevation gain vs average speed')).toBeInTheDocument()
    expect(
      screen.queryByText('Relationship scatter view will render here.'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('Average speed over calendar time'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('12 of 12 rides selected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Relationship' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Trend' }))

    expect(screen.getByText('View: trend')).toBeInTheDocument()
    expect(
      screen.getByLabelText('Average speed over calendar time'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Relationship scatter view will render here.'),
    ).not.toBeInTheDocument()
  })

  it('keeps filtering active while Relationship is selected', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'Relationship' }))
    fireEvent.click(screen.getByLabelText('2025'))

    expect(screen.getByText('3 of 12 rides selected')).toBeInTheDocument()
    expect(screen.getByText('View: relationship')).toBeInTheDocument()
    expect(
      screen.getByLabelText('Elevation gain vs average speed'),
    ).toBeInTheDocument()
  })
})
