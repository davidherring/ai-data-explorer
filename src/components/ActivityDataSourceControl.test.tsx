import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ActivityDataSourceControl } from './ActivityDataSourceControl.tsx'

afterEach(() => {
  cleanup()
})

describe('ActivityDataSourceControl', () => {
  it('renders source selection and activity count', () => {
    render(
      <ActivityDataSourceControl
        source="demo"
        status="ready"
        activityCount={12}
        metadata={{ total: 12 }}
        onSourceChange={vi.fn()}
        onRefresh={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Activity data source')).toBeInTheDocument()
    expect(screen.getByLabelText('Data source')).toHaveValue('demo')
    expect(screen.getByText('12 activities')).toBeInTheDocument()
  })

  it('notifies when the source changes', () => {
    const onSourceChange = vi.fn()

    render(
      <ActivityDataSourceControl
        source="demo"
        status="ready"
        activityCount={12}
        metadata={{ total: 12 }}
        onSourceChange={onSourceChange}
        onRefresh={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('Data source'), {
      target: { value: 'strava' },
    })

    expect(onSourceChange).toHaveBeenCalledWith('strava')
  })

  it('renders not connected and error states', () => {
    const { rerender } = render(
      <ActivityDataSourceControl
        source="strava"
        status="notConnected"
        activityCount={0}
        metadata={undefined}
        onSourceChange={vi.fn()}
        onRefresh={vi.fn()}
      />,
    )

    expect(screen.getByText('Strava not connected')).toBeInTheDocument()

    rerender(
      <ActivityDataSourceControl
        source="strava"
        status="error"
        activityCount={0}
        metadata={undefined}
        error="Unable to load Strava activities."
        onSourceChange={vi.fn()}
        onRefresh={vi.fn()}
      />,
    )

    expect(screen.getByText('Unable to load Strava activities.')).toBeInTheDocument()
  })

  it('calls refresh', () => {
    const onRefresh = vi.fn()

    render(
      <ActivityDataSourceControl
        source="demo"
        status="ready"
        activityCount={12}
        metadata={{ total: 12 }}
        onSourceChange={vi.fn()}
        onRefresh={onRefresh}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(onRefresh).toHaveBeenCalledTimes(1)
  })
})
