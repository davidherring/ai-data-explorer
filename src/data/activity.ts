export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type Activity = {
  id: string

  startTime: string
  localDate: string

  year: number
  month: number
  weekOfYear: number
  dayOfWeek: DayOfWeek
  isWeekend: boolean

  distanceMiles: number
  movingTimeMinutes: number
  elapsedTimeMinutes: number

  averageSpeedMph: number
  elevationGainFeet: number

  temperatureF?: number

  sportType: string

  trainer: boolean
  commute: boolean
  manual: boolean
}
