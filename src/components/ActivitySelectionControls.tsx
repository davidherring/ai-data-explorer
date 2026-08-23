import { useEffect, useState } from 'react'
import type { Activity, DayOfWeek } from '../data/activity.ts'
import {
  defaultAnalysisState,
  defaultRecurringDateRange,
  type ActivitySelection,
  type DateRange,
  type MonthDay,
  type NumericRange,
  type RecurringDateRange,
} from '../state/analysisState.ts'

type ActivitySelectionControlsProps = {
  activities: Activity[]
  selection: ActivitySelection
  onSelectionChange: (selection: ActivitySelection) => void
}

const daysOfWeek = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const satisfies readonly DayOfWeek[]

export function ActivitySelectionControls({
  activities,
  selection,
  onSelectionChange,
}: ActivitySelectionControlsProps) {
  const availableYears = getAvailableYears(activities)
  const availableSportTypes = getAvailableSportTypes(activities)
  const [recurringStartInput, setRecurringStartInput] = useState(
    formatMonthDay(selection.recurringDateRange?.start),
  )
  const [recurringEndInput, setRecurringEndInput] = useState(
    formatMonthDay(selection.recurringDateRange?.end),
  )

  useEffect(() => {
    setRecurringStartInput(formatMonthDay(selection.recurringDateRange?.start))
    setRecurringEndInput(formatMonthDay(selection.recurringDateRange?.end))
  }, [selection.recurringDateRange])

  return (
    <form className="selection-controls" aria-label="Activity selection controls">
      <fieldset className="control-group control-group-years control-group-compact">
        <legend>Years</legend>
        <div className="checkbox-row">
          {availableYears.map((year) => (
            <label className="checkbox-pill" key={year}>
              <input
                type="checkbox"
                checked={selection.years?.includes(year) ?? false}
                onChange={() => {
                  onSelectionChange(updateYears(selection, year))
                }}
              />
              <span>{year}</span>
            </label>
          ))}
        </div>
        <p className="control-help">Select at least one year to include activities.</p>
      </fieldset>

      <fieldset className="control-group control-group-date">
        <legend>Date range</legend>
        <div className="bounds-row">
          <label>
            <span>Start</span>
            <input
              type="date"
              value={selection.dateRange?.start ?? ''}
              onChange={(event) => {
                onSelectionChange(
                  updateDateRange(selection, 'start', event.currentTarget.value),
                )
              }}
            />
          </label>
          <label>
            <span>End</span>
            <input
              type="date"
              value={selection.dateRange?.end ?? ''}
              onChange={(event) => {
                onSelectionChange(
                  updateDateRange(selection, 'end', event.currentTarget.value),
                )
              }}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="control-group control-group-seasonal-window">
        <legend>Seasonal window</legend>
        <div className="bounds-row">
          <label>
            <span>Season start</span>
            <input
              inputMode="numeric"
              placeholder="MM-DD"
              value={recurringStartInput}
              onChange={(event) => {
                const value = event.currentTarget.value
                setRecurringStartInput(value)
                commitRecurringDateRange(selection, value, recurringEndInput, onSelectionChange)
              }}
            />
          </label>
          <label>
            <span>Season end</span>
            <input
              inputMode="numeric"
              placeholder="MM-DD"
              value={recurringEndInput}
              onChange={(event) => {
                const value = event.currentTarget.value
                setRecurringEndInput(value)
                commitRecurringDateRange(selection, recurringStartInput, value, onSelectionChange)
              }}
            />
          </label>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            setRecurringStartInput(formatMonthDay(defaultRecurringDateRange.start))
            setRecurringEndInput(formatMonthDay(defaultRecurringDateRange.end))
            onSelectionChange({
              ...selection,
              recurringDateRange: cloneRecurringDateRange(defaultRecurringDateRange),
            })
          }}
        >
          Reset seasonal window
        </button>
      </fieldset>

      <fieldset className="control-group control-group-days control-group-compact">
        <legend>Day filters</legend>
        <div className="day-checkboxes" aria-label="Specific days of week">
          <span>Specific days</span>
          <div className="checkbox-row">
            {daysOfWeek.map((day) => (
              <label className="checkbox-pill" key={day}>
                <input
                  type="checkbox"
                  checked={selection.daysOfWeek.includes(day)}
                  onChange={() => {
                    onSelectionChange(updateDaysOfWeek(selection, day))
                  }}
                />
                <span>{formatDayOfWeek(day)}</span>
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="control-group control-group-distance">
        <legend>Distance</legend>
        <div className="bounds-row">
          <label>
            <span>Min mi</span>
            <input
              inputMode="decimal"
              type="number"
              value={selection.distanceMiles?.min ?? ''}
              onChange={(event) => {
                onSelectionChange(
                  updateNumericRange(
                    selection,
                    'distanceMiles',
                    'min',
                    event.currentTarget.value,
                  ),
                )
              }}
            />
          </label>
          <label>
            <span>Max mi</span>
            <input
              inputMode="decimal"
              type="number"
              value={selection.distanceMiles?.max ?? ''}
              onChange={(event) => {
                onSelectionChange(
                  updateNumericRange(
                    selection,
                    'distanceMiles',
                    'max',
                    event.currentTarget.value,
                  ),
                )
              }}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="control-group control-group-elevation">
        <legend>Elevation</legend>
        <div className="bounds-row">
          <label>
            <span>Min ft</span>
            <input
              inputMode="decimal"
              type="number"
              value={selection.elevationGainFeet?.min ?? ''}
              onChange={(event) => {
                onSelectionChange(
                  updateNumericRange(
                    selection,
                    'elevationGainFeet',
                    'min',
                    event.currentTarget.value,
                  ),
                )
              }}
            />
          </label>
          <label>
            <span>Max ft</span>
            <input
              inputMode="decimal"
              type="number"
              value={selection.elevationGainFeet?.max ?? ''}
              onChange={(event) => {
                onSelectionChange(
                  updateNumericRange(
                    selection,
                    'elevationGainFeet',
                    'max',
                    event.currentTarget.value,
                  ),
                )
              }}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="control-group control-group-actions">
        <legend>Sport type</legend>
        <label>
          <span>Type</span>
          <select
            value={selection.sportType ?? ''}
            onChange={(event) => {
              onSelectionChange(updateSportType(selection, event.currentTarget.value))
            }}
          >
            <option value="">All types</option>
            {availableSportTypes.map((sportType) => (
              <option key={sportType} value={sportType}>
                {sportType}
              </option>
            ))}
          </select>
        </label>
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            onSelectionChange(defaultAnalysisState.selection)
          }}
        >
          Reset filters
        </button>
      </fieldset>
    </form>
  )
}

function getAvailableYears(activities: readonly Activity[]): number[] {
  return Array.from(new Set(activities.map((activity) => activity.year))).sort(
    (left, right) => right - left,
  )
}

function getAvailableSportTypes(activities: readonly Activity[]): string[] {
  return Array.from(new Set(activities.map((activity) => activity.sportType))).sort((left, right) =>
    left.localeCompare(right),
  )
}

function updateYears(
  selection: ActivitySelection,
  selectedYear: number,
): ActivitySelection {
  const selectedYears = new Set(selection.years ?? [])

  if (selectedYears.has(selectedYear)) {
    selectedYears.delete(selectedYear)
  } else {
    selectedYears.add(selectedYear)
  }

  const years = Array.from(selectedYears).sort((left, right) => left - right)

  return {
    ...selection,
    years,
  }
}

function updateDateRange(
  selection: ActivitySelection,
  bound: keyof DateRange,
  value: string,
): ActivitySelection {
  const nextDateRange = {
    ...selection.dateRange,
    [bound]: value === '' ? undefined : value,
  }

  return withOptionalValue(
    selection,
    'dateRange',
    nextDateRange.start === undefined && nextDateRange.end === undefined
      ? undefined
      : nextDateRange,
  )
}

function commitRecurringDateRange(
  selection: ActivitySelection,
  startInput: string,
  endInput: string,
  onSelectionChange: (selection: ActivitySelection) => void,
): void {
  const range = parseRecurringDateRange(startInput, endInput)

  if (range === undefined) {
    return
  }

  onSelectionChange({
    ...selection,
    recurringDateRange: range,
  })
}

function updateDaysOfWeek(
  selection: ActivitySelection,
  selectedDay: DayOfWeek,
): ActivitySelection {
  const selectedDays = new Set(selection.daysOfWeek)

  if (selectedDays.has(selectedDay)) {
    selectedDays.delete(selectedDay)
  } else {
    selectedDays.add(selectedDay)
  }

  const days = daysOfWeek.filter((day) => selectedDays.has(day))

  return {
    ...selection,
    daysOfWeek: days,
  }
}

function updateNumericRange(
  selection: ActivitySelection,
  rangeKey: 'distanceMiles' | 'elevationGainFeet',
  bound: keyof NumericRange,
  value: string,
): ActivitySelection {
  const parsedValue = Number(value)
  const nextValue = value === '' || !Number.isFinite(parsedValue) ? undefined : parsedValue
  const nextRange = {
    ...selection[rangeKey],
    [bound]: nextValue,
  }

  return withOptionalValue(
    selection,
    rangeKey,
    nextRange.min === undefined && nextRange.max === undefined
      ? undefined
      : nextRange,
  )
}

function updateSportType(
  selection: ActivitySelection,
  sportType: string,
): ActivitySelection {
  return withOptionalValue(selection, 'sportType', sportType === '' ? undefined : sportType)
}

function withOptionalValue<Key extends keyof ActivitySelection>(
  selection: ActivitySelection,
  key: Key,
  value: ActivitySelection[Key] | undefined,
): ActivitySelection {
  const nextSelection = { ...selection }

  if (value === undefined) {
    delete nextSelection[key]
  } else {
    nextSelection[key] = value
  }

  return nextSelection
}

function parseRecurringDateRange(
  startInput: string,
  endInput: string,
): RecurringDateRange | undefined {
  const start = parseMonthDayInput(startInput)
  const end = parseMonthDayInput(endInput)

  if (
    start === undefined ||
    end === undefined ||
    compareMonthDay(start, end) > 0
  ) {
    return undefined
  }

  return {
    type: 'recurring-month-day',
    start,
    end,
  }
}

function parseMonthDayInput(value: string): MonthDay | undefined {
  const match = /^(\d{2})-(\d{2})$/.exec(value)

  if (!match) {
    return undefined
  }

  const month = Number(match[1])
  const day = Number(match[2])
  const monthDay = { month, day }

  return isValidMonthDay(monthDay) ? monthDay : undefined
}

function formatMonthDay(monthDay: MonthDay | undefined): string {
  if (monthDay === undefined) {
    return ''
  }

  return `${monthDay.month.toString().padStart(2, '0')}-${monthDay.day
    .toString()
    .padStart(2, '0')}`
}

function isValidMonthDay(monthDay: MonthDay): boolean {
  return (
    Number.isInteger(monthDay.month) &&
    Number.isInteger(monthDay.day) &&
    monthDay.month >= 1 &&
    monthDay.month <= 12 &&
    monthDay.day >= 1 &&
    monthDay.day <= getDaysInMonth(monthDay.month)
  )
}

function getDaysInMonth(month: number): number {
  switch (month) {
    case 2:
      return 29
    case 4:
    case 6:
    case 9:
    case 11:
      return 30
    default:
      return 31
  }
}

function compareMonthDay(left: MonthDay, right: MonthDay): number {
  return left.month - right.month || left.day - right.day
}

function formatDayOfWeek(day: DayOfWeek): string {
  return `${day.slice(0, 1).toUpperCase()}${day.slice(1, 3)}`
}

function cloneRecurringDateRange(
  recurringDateRange: RecurringDateRange,
): RecurringDateRange {
  return {
    type: 'recurring-month-day',
    start: { ...recurringDateRange.start },
    end: { ...recurringDateRange.end },
  }
}
