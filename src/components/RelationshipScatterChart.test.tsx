import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  getMetricRelationshipPoints,
  relationshipBetweenMetrics,
} from '../analysis/metricRelationships.ts'
import { getMetricDefinition } from '../analysis/activityMetrics.ts'
import type { DayOfWeek, Activity } from '../data/activity.ts'
import type { MetricKey } from '../state/analysisState.ts'
import { RelationshipScatterChart } from './RelationshipScatterChart.tsx'
import { formatRelationshipPointTooltipTitle } from './chartTooltipText.ts'

describe('RelationshipScatterChart', () => {
  afterEach(() => {
    cleanup()
  })

  it('preserves default elevation gain vs average speed behavior', async () => {
    renderChart([activityA, activityB, activityC])

    expect(
      screen.getByLabelText('Elevation gain vs Average speed'),
    ).toBeInTheDocument()
    expect(screen.getByText('Elevation gain vs Average speed')).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('.relationship-chart-container svg')).toBeInTheDocument()
    })

    const tooltipText = formatRelationshipTooltip(
      activityA,
      'elevationGainFeet',
      'averageSpeedMph',
    )

    expect(tooltipText).toContain('Date: 2025-03-12')
    expect(tooltipText).toContain('Elevation gain: 1,250 ft')
    expect(tooltipText).toContain('Average speed: 15.2 mph')
    expect(tooltipText).toContain('Distance: 31.4 mi')
    expect(tooltipText).toContain('Moving time: 126 min')
    expect(tooltipText).toContain('Activity type: Ride')
    expect(getChartTitles()).toEqual([])
    expect(getCircleAriaLabels()).toContain(
      '2025-03-12, elevation gain 1,250 ft, average speed 15.2 mph',
    )
  })

  it('shows a year legend when valid plotted points span multiple years', async () => {
    renderChart([activityA, activityD, activityE])

    await waitFor(() => {
      expect(getLegendSwatchLabels()).toEqual(['2025', '2026'])
    })
  })

  it('does not show a year legend for single-year plotted points', async () => {
    renderChart([activityA, activityB, activityC])

    await waitFor(() => {
      expect(document.querySelector('.relationship-chart-container svg')).toBeInTheDocument()
    })

    expect(getLegendSwatchLabels()).toEqual([])
  })

  it('does not show a year legend when only one selected year has valid plotted points', async () => {
    renderChart([
      activityA,
      createActivity({
        id: 'invalid-2026',
        localDate: '2026-08-20',
        elevationGainFeet: Number.NaN,
      }),
    ])

    await waitFor(() => {
      expect(document.querySelector('.relationship-chart-container svg')).toBeInTheDocument()
    })

    expect(getLegendSwatchLabels()).toEqual([])
  })

  it('renders an empty chart state for empty selected activities', () => {
    renderChart([])

    expect(
      screen.getByLabelText('Elevation gain vs Average speed'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('No activities to plot for the current selection.'),
    ).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders a metric-specific invalid-pair state when selected activities have no valid pairs', () => {
    renderChart(
      [
        createActivity({
          id: 'invalid-a',
          localDate: '2025-01-01',
          distanceMiles: Number.NaN,
          averageSpeedMph: 14,
        }),
        createActivity({
          id: 'invalid-b',
          localDate: '2025-01-02',
          distanceMiles: 12,
          averageSpeedMph: Number.POSITIVE_INFINITY,
        }),
      ],
      'distanceMiles',
      'averageSpeedMph',
    )

    expect(
      screen.getByText(
        'No activities have valid distance and average speed values for the current selection.',
      ),
    ).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders a same-metric invalid-pair state with one metric label', () => {
    renderChart(
      [
        createActivity({
          id: 'invalid-a',
          localDate: '2025-01-01',
          averageSpeedMph: Number.NaN,
        }),
        createActivity({
          id: 'invalid-b',
          localDate: '2025-01-02',
          averageSpeedMph: Number.POSITIVE_INFINITY,
        }),
      ],
      'averageSpeedMph',
      'averageSpeedMph',
    )

    expect(
      screen.getByText(
        'No activities have valid average speed values for the current selection.',
      ),
    ).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders one valid point with a sparse relationship message', async () => {
    renderChart([activityA])

    expect(
      screen.getByText('Too few valid activities to calculate Pearson r.'),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('.relationship-chart-container svg')).toBeInTheDocument()
    })
  })

  it('renders two valid points with a sparse relationship message', async () => {
    renderChart([activityA, activityB])

    expect(
      screen.getByText('Too few valid activities to calculate Pearson r.'),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('.relationship-chart-container svg')).toBeInTheDocument()
    })
  })

  it('renders a normal scatter plot for three or more valid points', async () => {
    renderChart([activityA, activityB, activityC])

    expect(
      screen.queryByText('Too few valid activities to calculate Pearson r.'),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Relationship status')).toHaveTextContent(
      '3 activities · Pearson r =',
    )

    await waitFor(() => {
      expect(document.querySelector('.relationship-chart-container svg')).toBeInTheDocument()
    })
  })

  it('renders non-default distance vs average speed title and tooltip', async () => {
    renderChart([activityA, activityB, activityC], 'distanceMiles', 'averageSpeedMph')

    expect(
      screen.getByLabelText('Distance vs Average speed'),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    const tooltipText = formatRelationshipTooltip(
      activityA,
      'distanceMiles',
      'averageSpeedMph',
    )

    expect(tooltipText).toContain('Distance: 31.4 mi')
    expect(tooltipText).toContain('Average speed: 15.2 mph')
    expect(tooltipText).toContain('Elevation gain: 1,250 ft')
    expect(tooltipText).toContain('Moving time: 126 min')
    expect(countTextOccurrences(tooltipText, 'Distance:')).toBe(1)
  })

  it('renders moving time vs distance with metric formatting', async () => {
    renderChart([activityA, activityB, activityC], 'movingTimeMinutes', 'distanceMiles')

    expect(screen.getByLabelText('Moving time vs Distance')).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    const tooltipText = formatRelationshipTooltip(
      activityA,
      'movingTimeMinutes',
      'distanceMiles',
    )

    expect(tooltipText).toContain('Moving time: 126 min')
    expect(tooltipText).toContain('Distance: 31.4 mi')
    expect(tooltipText).toContain('Elevation gain: 1,250 ft')
    expect(countTextOccurrences(tooltipText, 'Moving time:')).toBe(1)
  })

  it('renders same-metric pairs and shows the metric once in tooltip', async () => {
    renderChart([activityA, activityB, activityC], 'distanceMiles', 'distanceMiles')

    expect(screen.getByLabelText('Distance vs Distance')).toBeInTheDocument()

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    expect(document.body.textContent).toContain('3 activities · Pearson r = 1.00')
    expect(
      countTextOccurrences(
        formatRelationshipTooltip(activityA, 'distanceMiles', 'distanceMiles'),
        'Distance:',
      ),
    ).toBe(1)
  })

  it('does not duplicate elevation context when elevation is an active metric', async () => {
    renderChart([activityA, activityB, activityC], 'distanceMiles', 'elevationGainFeet')

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    const tooltipText = formatRelationshipTooltip(
      activityA,
      'distanceMiles',
      'elevationGainFeet',
    )

    expect(tooltipText).toContain('Elevation gain: 1,250 ft')
    expect(
      countTextOccurrences(tooltipText, 'Elevation gain:'),
    ).toBe(1)
  })

  it('does not include invalid activities in plotted tooltip data', async () => {
    renderChart([
      activityA,
      createActivity({
        id: 'invalid-a',
        localDate: '2025-04-01',
        elevationGainFeet: Number.NaN,
        averageSpeedMph: 99,
      }),
      activityB,
      activityC,
    ])

    await waitFor(() => {
      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    const ariaLabels = getCircleAriaLabels().join('\n')

    expect(ariaLabels).toContain('2025-03-12')
    expect(ariaLabels).not.toContain('2025-04-01')
    expect(ariaLabels).not.toContain('average speed 99.0 mph')
  })

  it('renders observations when x variance is zero', async () => {
    renderChart(
      [
        createActivity({ id: 'zero-x-a', localDate: '2025-01-01', distanceMiles: 20, averageSpeedMph: 12 }),
        createActivity({ id: 'zero-x-b', localDate: '2025-01-02', distanceMiles: 20, averageSpeedMph: 14 }),
        createActivity({ id: 'zero-x-c', localDate: '2025-01-03', distanceMiles: 20, averageSpeedMph: 16 }),
      ],
      'distanceMiles',
      'averageSpeedMph',
    )

    expect(screen.getByLabelText('Relationship status')).toHaveTextContent(
      'Distance does not vary enough to calculate Pearson r.',
    )

    await waitFor(() => {
      expect(document.querySelector('.relationship-chart-container svg')).toBeInTheDocument()
    })
  })

  it('renders observations when y variance is zero', async () => {
    renderChart(
      [
        createActivity({ id: 'zero-y-a', localDate: '2025-01-01', distanceMiles: 10, movingTimeMinutes: 60 }),
        createActivity({ id: 'zero-y-b', localDate: '2025-01-02', distanceMiles: 20, movingTimeMinutes: 60 }),
        createActivity({ id: 'zero-y-c', localDate: '2025-01-03', distanceMiles: 30, movingTimeMinutes: 60 }),
      ],
      'distanceMiles',
      'movingTimeMinutes',
    )

    expect(screen.getByLabelText('Relationship status')).toHaveTextContent(
      'Moving time does not vary enough to calculate Pearson r.',
    )

    await waitFor(() => {
      expect(document.querySelector('.relationship-chart-container svg')).toBeInTheDocument()
    })
  })

  it('replaces Plot output when the metric pair changes', async () => {
    const { rerender } = renderChart([activityA, activityB, activityC])

    await waitFor(() => {
      expect(getCircleAriaLabels().join('\n')).toContain(
        'elevation gain 1,250 ft',
      )
    })

    rerender(
      createChartElement(
        [activityA, activityB, activityC],
        'movingTimeMinutes',
        'distanceMiles',
      ),
    )

    await waitFor(() => {
      expect(screen.getByText('Moving time vs Distance')).toBeInTheDocument()
    })

    expect(getCircleAriaLabels().join('\n')).toContain('moving time 126 min')
    expect(document.querySelectorAll('.relationship-chart-container svg')).toHaveLength(1)
  })

  it('replaces Plot output when activities change', async () => {
    const { rerender } = renderChart([activityA, activityB, activityC])

    await waitFor(() => {
      expect(getCircleAriaLabels().join('\n')).toContain('2025-03-12')
    })

    rerender(createChartElement([activityD, activityE, activityF]))

    await waitFor(() => {
      expect(getCircleAriaLabels().join('\n')).toContain('2026-07-04')
    })

    expect(getCircleAriaLabels().join('\n')).not.toContain('2025-03-12')
    expect(document.querySelectorAll('.relationship-chart-container svg')).toHaveLength(1)
  })
})

function renderChart(
  activities: Activity[],
  xMetric: MetricKey = 'elevationGainFeet',
  yMetric: MetricKey = 'averageSpeedMph',
) {
  return render(createChartElement(activities, xMetric, yMetric))
}

function createChartElement(
  activities: Activity[],
  xMetric: MetricKey = 'elevationGainFeet',
  yMetric: MetricKey = 'averageSpeedMph',
) {
  return (
    <RelationshipScatterChart
      activities={activities}
      totalActivityCount={activities.length}
      xMetric={xMetric}
      yMetric={yMetric}
      relationship={relationshipBetweenMetrics(activities, xMetric, yMetric)}
      points={getMetricRelationshipPoints(activities, xMetric, yMetric)}
    />
  )
}

function countTextOccurrences(text: string, searchText: string): number {
  return text.split(searchText).length - 1
}

function formatRelationshipTooltip(
  activity: Activity,
  xMetric: MetricKey,
  yMetric: MetricKey,
): string {
  const xDefinition = getMetricDefinition(xMetric)
  const yDefinition = getMetricDefinition(yMetric)

  return formatRelationshipPointTooltipTitle(
    {
      activity,
      x: activity[xMetric],
      y: activity[yMetric],
    },
    xMetric,
    yMetric,
    xDefinition,
    yDefinition,
  )
}

function getCircleAriaLabels(): string[] {
  return Array.from(
    document.querySelectorAll('.relationship-chart-container circle[aria-label]'),
  ).map((circle) => circle.getAttribute('aria-label') ?? '')
}

function getChartTitles(): string[] {
  return Array.from(
    document.querySelectorAll('.relationship-chart-container title'),
  ).map((title) => title.textContent ?? '')
}

function getLegendSwatchLabels(): string[] {
  return Array.from(document.querySelectorAll('span[class*="swatch"]')).map(
    (element) => element.textContent ?? '',
  )
}

const activityA = createActivity({
  id: 'activity-a',
  localDate: '2025-03-12',
  averageSpeedMph: 15.24,
  distanceMiles: 31.44,
  elevationGainFeet: 1250,
  movingTimeMinutes: 125.6,
  sportType: 'Ride',
})

const activityB = createActivity({
  id: 'activity-b',
  localDate: '2025-06-14',
  averageSpeedMph: 14.87,
  distanceMiles: 42,
  elevationGainFeet: 2200,
  movingTimeMinutes: 143,
  sportType: 'GravelRide',
})

const activityC = createActivity({
  id: 'activity-c',
  localDate: '2025-09-20',
  averageSpeedMph: 16.1,
  distanceMiles: 25.5,
  elevationGainFeet: 700,
  movingTimeMinutes: 95,
  sportType: 'Ride',
})

const activityD = createActivity({
  id: 'activity-d',
  localDate: '2026-07-04',
  averageSpeedMph: 16.01,
  distanceMiles: 40,
  elevationGainFeet: 1000,
  movingTimeMinutes: 130,
  sportType: 'Ride',
})

const activityE = createActivity({
  id: 'activity-e',
  localDate: '2026-08-04',
  averageSpeedMph: 15.2,
  distanceMiles: 38,
  elevationGainFeet: 1300,
  movingTimeMinutes: 132,
  sportType: 'Ride',
})

const activityF = createActivity({
  id: 'activity-f',
  localDate: '2026-09-04',
  averageSpeedMph: 14.9,
  distanceMiles: 37,
  elevationGainFeet: 1600,
  movingTimeMinutes: 149,
  sportType: 'Ride',
})

function createActivity(
  overrides: Partial<
    Pick<
      Activity,
      | 'id'
      | 'localDate'
      | 'averageSpeedMph'
      | 'distanceMiles'
      | 'elevationGainFeet'
      | 'movingTimeMinutes'
      | 'sportType'
    >
  > = {},
): Activity {
  const localDate = overrides.localDate ?? '2025-03-12'

  return {
    id: overrides.id ?? 'activity-a',
    startTime: `${localDate}T07:00:00-07:00`,
    localDate,
    year: Number(localDate.slice(0, 4)),
    month: Number(localDate.slice(5, 7)),
    weekOfYear: 1,
    dayOfWeek: 'wednesday' satisfies DayOfWeek,
    isWeekend: false,
    distanceMiles: overrides.distanceMiles ?? 20,
    movingTimeMinutes: overrides.movingTimeMinutes ?? 60,
    averageSpeedMph: overrides.averageSpeedMph ?? 15,
    elevationGainFeet: overrides.elevationGainFeet ?? 500,
    sportType: overrides.sportType ?? 'Ride',
    trainer: false,
    commute: false,
    manual: false,
  }
}
