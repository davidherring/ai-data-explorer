import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App.tsx'
import { reconcileSelectedYears } from '../state/yearSelection.ts'
import { loadDemoActivities } from '../data/demoDataset.ts'

const demoActivities = loadDemoActivities()
const demoActivityCount = demoActivities.length
const selectedDemoYear = Math.max(
  ...Array.from(new Set(demoActivities.map((activity) => activity.year))),
)
const selectedDemoYearActivities = demoActivities.filter(
  (activity) => activity.year === selectedDemoYear,
)
const selectedDemoYearActivity = selectedDemoYearActivities[0]
const selectedDemoYearOtherActivity = demoActivities.find(
  (activity) => activity.year !== selectedDemoYear,
)
const allDemoActivitiesSelectedText = `${demoActivityCount} of ${demoActivityCount} activities selected`
const selectedDemoYearText = `${selectedDemoYearActivities.length} of ${demoActivityCount} activities selected`
const emptyDemoSelectionText = `0 of ${demoActivityCount} activities selected`

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
      await screen.findByText(allDemoActivitiesSelectedText),
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
    expect(screen.getByLabelText('Trend metric')).toHaveValue('averageSpeedMph')
    expect(screen.getByText('Selection ready.')).toBeInTheDocument()
    expect(screen.getByText('View: trend')).toBeInTheDocument()
    expect(screen.getByLabelText('AI conversation panel')).toBeInTheDocument()
    expect(screen.getByLabelText('Summary and status')).toBeInTheDocument()
  })

  it('updates selected activity count when a filter control changes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ connected: false, reason: 'missing_token' }),
      ),
    )

    render(<App />)

    expect(
      await screen.findByText(allDemoActivitiesSelectedText),
    ).toBeInTheDocument()

    clearAllYears()
    fireEvent.click(screen.getByLabelText(String(selectedDemoYear)))

    expect(screen.getByText(selectedDemoYearText)).toBeInTheDocument()
    expect(document.body.textContent).toContain(
      selectedDemoYearActivity?.localDate,
    )
    expect(document.body.textContent).not.toContain(
      selectedDemoYearOtherActivity?.localDate,
    )
  })

  it('updates the Trend chart when the metric selector changes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ connected: false, reason: 'missing_token' }),
      ),
    )

    render(<App />)

    expect(
      await screen.findByLabelText('Average speed over calendar time'),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Trend metric'), {
      target: { value: 'distanceMiles' },
    })

    expect(screen.getByLabelText('Distance over calendar time')).toBeInTheDocument()
    expect(
      screen.queryByLabelText('Average speed over calendar time'),
    ).not.toBeInTheDocument()
  })

  it('shows an empty selection state when filters match no activities', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ connected: false, reason: 'missing_token' }),
      ),
    )

    render(<App />)

    expect(
      await screen.findByText(allDemoActivitiesSelectedText),
    ).toBeInTheDocument()
    clearAllYears()
    fireEvent.click(screen.getByLabelText(String(selectedDemoYear)))
    expect(screen.getByText(selectedDemoYearText)).toBeInTheDocument()
    openMoreFilters()

    fireEvent.change(screen.getByLabelText('Start'), {
      target: { value: '2030-01-01' },
    })

    expect(screen.getByText(emptyDemoSelectionText)).toBeInTheDocument()
    expect(
      screen.getByText('No activities match the current filters.'),
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
      await screen.findByText(allDemoActivitiesSelectedText),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Relationship' }))

    expect(screen.getByText('View: relationship')).toBeInTheDocument()
    expect(screen.getByLabelText('Elevation gain vs Average speed')).toBeInTheDocument()
    expect(
      screen.queryByText('Relationship scatter view will render here.'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('Average speed over calendar time'),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Relationship X metric')).toHaveValue(
      'elevationGainFeet',
    )
    expect(screen.getByLabelText('Relationship Y metric')).toHaveValue(
      'averageSpeedMph',
    )
    expect(screen.getByText(allDemoActivitiesSelectedText)).toBeInTheDocument()
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

  it('updates the Relationship chart when metric selectors change', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ connected: false, reason: 'missing_token' }),
      ),
    )

    render(<App />)

    expect(
      await screen.findByText(allDemoActivitiesSelectedText),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Relationship' }))
    expect(screen.getByLabelText('Elevation gain vs Average speed')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Relationship X metric'), {
      target: { value: 'distanceMiles' },
    })

    expect(screen.getByLabelText('Distance vs Average speed')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Relationship Y metric'), {
      target: { value: 'distanceMiles' },
    })

    expect(screen.getByLabelText('Distance vs Distance')).toBeInTheDocument()
    expect(screen.getByLabelText('Relationship X metric')).toHaveValue(
      'distanceMiles',
    )
    expect(screen.getByLabelText('Relationship Y metric')).toHaveValue(
      'distanceMiles',
    )
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
      await screen.findByText(allDemoActivitiesSelectedText),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Relationship' }))
    clearAllYears()
    fireEvent.click(screen.getByLabelText(String(selectedDemoYear)))

    expect(screen.getByText(selectedDemoYearText)).toBeInTheDocument()
    expect(screen.getByText('View: relationship')).toBeInTheDocument()
    expect(
      screen.getByLabelText('Elevation gain vs Average speed'),
    ).toBeInTheDocument()
  })
})

describe('reconcileSelectedYears', () => {
  it('selects all available years on first ready load', () => {
    expect(
      reconcileSelectedYears({
        availableYears: [2025, 2023, 2024],
        selectedYears: [],
        source: 'demo',
      }),
    ).toEqual([2023, 2024, 2025])
  })

  it('selects all years on source change', () => {
    expect(
      reconcileSelectedYears({
        availableYears: [2020, 2021],
        previousAvailableYears: [2024, 2025],
        previousSource: 'demo',
        selectedYears: [2025],
        source: 'strava',
      }),
    ).toEqual([2020, 2021])
  })

  it('preserves narrowed same-source selections and removes unavailable years', () => {
    expect(
      reconcileSelectedYears({
        availableYears: [2024, 2026],
        previousAvailableYears: [2024, 2025, 2026],
        previousSource: 'strava',
        selectedYears: [2025, 2026],
        source: 'strava',
      }),
    ).toEqual([2026])
  })

  it('auto-adds new same-source years only when previous selection was all years', () => {
    expect(
      reconcileSelectedYears({
        availableYears: [2024, 2025, 2026],
        previousAvailableYears: [2024, 2025],
        previousSource: 'strava',
        selectedYears: [2024, 2025],
        source: 'strava',
      }),
    ).toEqual([2024, 2025, 2026])
  })
})

function clearAllYears() {
  fireEvent.click(
    within(screen.getByLabelText('Year selection actions')).getByRole('button', {
      name: 'Clear all',
    }),
  )
}

function openMoreFilters() {
  fireEvent.click(screen.getByText(/^More Filters/))
}
