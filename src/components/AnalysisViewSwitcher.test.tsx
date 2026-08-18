import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AnalysisViewSwitcher } from './AnalysisViewSwitcher.tsx'

describe('AnalysisViewSwitcher', () => {
  afterEach(() => {
    cleanup()
  })

  it('marks Trend as active', () => {
    render(<AnalysisViewSwitcher activeView="trend" onViewChange={() => {}} />)

    expect(screen.getByRole('group', { name: 'Visualization view' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trend' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Relationship' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('marks Relationship as active', () => {
    render(<AnalysisViewSwitcher activeView="relationship" onViewChange={() => {}} />)

    expect(screen.getByRole('button', { name: 'Trend' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Relationship' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('invokes the callback when Trend is clicked', () => {
    const onViewChange = vi.fn()
    render(
      <AnalysisViewSwitcher
        activeView="relationship"
        onViewChange={onViewChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Trend' }))

    expect(onViewChange).toHaveBeenCalledWith('trend')
  })

  it('invokes the callback when Relationship is clicked', () => {
    const onViewChange = vi.fn()
    render(<AnalysisViewSwitcher activeView="trend" onViewChange={onViewChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Relationship' }))

    expect(onViewChange).toHaveBeenCalledWith('relationship')
  })
})
