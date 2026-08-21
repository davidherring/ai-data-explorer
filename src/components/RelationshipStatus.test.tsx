import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { MetricRelationshipResult } from '../analysis/metricRelationships.ts'
import type { MetricKey } from '../state/analysisState.ts'
import { RelationshipStatus } from './RelationshipStatus.tsx'

describe('RelationshipStatus', () => {
  afterEach(() => {
    cleanup()
  })

  it('formats ready Pearson values to two decimals', () => {
    renderStatus({
      status: 'ready',
      sampleCount: 5,
      validPairCount: 5,
      pearsonR: 0.3849,
    })

    expect(screen.getByLabelText('Relationship status')).toHaveTextContent(
      '5 activities · Pearson r = 0.38',
    )
  })

  it('formats negative Pearson values to two decimals', () => {
    renderStatus({
      status: 'ready',
      sampleCount: 5,
      validPairCount: 5,
      pearsonR: -0.3849,
    })

    expect(screen.getByLabelText('Relationship status')).toHaveTextContent(
      '5 activities · Pearson r = -0.38',
    )
  })

  it('uses valid activities wording when some selected activities are excluded', () => {
    renderStatus({
      status: 'ready',
      sampleCount: 7,
      validPairCount: 5,
      pearsonR: 0.25,
    })

    expect(screen.getByLabelText('Relationship status')).toHaveTextContent(
      '5 valid activities · Pearson r = 0.25',
    )
  })

  it('renders the insufficient-valid-pairs message without Pearson r', () => {
    renderStatus({
      status: 'insufficient-valid-pairs',
      sampleCount: 2,
      validPairCount: 2,
    })

    expect(screen.getByLabelText('Relationship status')).toHaveTextContent(
      'Too few valid activities to calculate Pearson r.',
    )
    expect(screen.queryByText(/Pearson r =/)).not.toBeInTheDocument()
  })

  it('renders the zero-x-variance message without Pearson r', () => {
    renderStatus(
      {
        status: 'zero-x-variance',
        sampleCount: 4,
        validPairCount: 4,
      },
      'distanceMiles',
      'averageSpeedMph',
    )

    expect(screen.getByLabelText('Relationship status')).toHaveTextContent(
      'Distance does not vary enough to calculate Pearson r.',
    )
    expect(screen.queryByText(/Pearson r =/)).not.toBeInTheDocument()
  })

  it('renders the zero-y-variance message without Pearson r', () => {
    renderStatus(
      {
        status: 'zero-y-variance',
        sampleCount: 4,
        validPairCount: 4,
      },
      'distanceMiles',
      'movingTimeMinutes',
    )

    expect(screen.getByLabelText('Relationship status')).toHaveTextContent(
      'Moving time does not vary enough to calculate Pearson r.',
    )
    expect(screen.queryByText(/Pearson r =/)).not.toBeInTheDocument()
  })
})

function renderStatus(
  overrides: Pick<
    MetricRelationshipResult,
    'status' | 'sampleCount' | 'validPairCount'
  > &
    Partial<Pick<MetricRelationshipResult, 'pearsonR'>>,
  xMetric: MetricKey = 'elevationGainFeet',
  yMetric: MetricKey = 'averageSpeedMph',
) {
  render(
    <RelationshipStatus
      relationship={{
        xMetric,
        yMetric,
        ...overrides,
      }}
      xMetric={xMetric}
      yMetric={yMetric}
    />,
  )
}
