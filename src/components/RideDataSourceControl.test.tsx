import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RideDataSourceControl } from './RideDataSourceControl.tsx'

afterEach(() => {
  cleanup()
})

describe('RideDataSourceControl', () => {
  it('renders source selection and ride count', () => {
    render(
      <RideDataSourceControl
        source="demo"
        status="ready"
        rideCount={12}
        metadata={{ total: 12 }}
        onSourceChange={vi.fn()}
        onRefresh={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Ride data source')).toBeInTheDocument()
    expect(screen.getByLabelText('Data source')).toHaveValue('demo')
    expect(screen.getByText('12 rides')).toBeInTheDocument()
  })

  it('notifies when the source changes', () => {
    const onSourceChange = vi.fn()

    render(
      <RideDataSourceControl
        source="demo"
        status="ready"
        rideCount={12}
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
      <RideDataSourceControl
        source="strava"
        status="notConnected"
        rideCount={0}
        metadata={undefined}
        onSourceChange={vi.fn()}
        onRefresh={vi.fn()}
      />,
    )

    expect(screen.getByText('Strava not connected')).toBeInTheDocument()

    rerender(
      <RideDataSourceControl
        source="strava"
        status="error"
        rideCount={0}
        metadata={undefined}
        error="Unable to load Strava rides."
        onSourceChange={vi.fn()}
        onRefresh={vi.fn()}
      />,
    )

    expect(screen.getByText('Unable to load Strava rides.')).toBeInTheDocument()
  })

  it('calls refresh', () => {
    const onRefresh = vi.fn()

    render(
      <RideDataSourceControl
        source="demo"
        status="ready"
        rideCount={12}
        metadata={{ total: 12 }}
        onSourceChange={vi.fn()}
        onRefresh={onRefresh}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(onRefresh).toHaveBeenCalledTimes(1)
  })
})
