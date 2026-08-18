import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { MetricRelationshipResult } from '../analysis/metricRelationships.ts'
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
      '5 rides · Pearson r = 0.38',
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
      '5 rides · Pearson r = -0.38',
    )
  })

  it('uses valid rides wording when some selected rides are excluded', () => {
    renderStatus({
      status: 'ready',
      sampleCount: 7,
      validPairCount: 5,
      pearsonR: 0.25,
    })

    expect(screen.getByLabelText('Relationship status')).toHaveTextContent(
      '5 valid rides · Pearson r = 0.25',
    )
  })

  it('renders the insufficient-valid-pairs message without Pearson r', () => {
    renderStatus({
      status: 'insufficient-valid-pairs',
      sampleCount: 2,
      validPairCount: 2,
    })

    expect(screen.getByLabelText('Relationship status')).toHaveTextContent(
      'Too few valid rides to calculate Pearson r.',
    )
    expect(screen.queryByText(/Pearson r =/)).not.toBeInTheDocument()
  })

  it('renders the zero-x-variance message without Pearson r', () => {
    renderStatus({
      status: 'zero-x-variance',
      sampleCount: 4,
      validPairCount: 4,
    })

    expect(screen.getByLabelText('Relationship status')).toHaveTextContent(
      'Elevation does not vary enough to calculate Pearson r.',
    )
    expect(screen.queryByText(/Pearson r =/)).not.toBeInTheDocument()
  })

  it('renders the zero-y-variance message without Pearson r', () => {
    renderStatus({
      status: 'zero-y-variance',
      sampleCount: 4,
      validPairCount: 4,
    })

    expect(screen.getByLabelText('Relationship status')).toHaveTextContent(
      'Average speed does not vary enough to calculate Pearson r.',
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
) {
  render(
    <RelationshipStatus
      relationship={{
        xMetric: 'elevationGainFeet',
        yMetric: 'averageSpeedMph',
        ...overrides,
      }}
    />,
  )
}
