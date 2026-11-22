/** Đồng bộ với backend: com.tripplanner.common.ErrorCode */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'INVALID_DATE_RANGE'
  | 'INVALID_ROLE'
  | 'INVALID_TRANSFER'
  | 'DATE_OUT_OF_RANGE'
  | 'INVALID_TRIP_LENGTH'
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_GOOGLE_TOKEN'
  | 'FORBIDDEN'
  | 'NOT_TRIP_MEMBER'
  | 'NOT_FOUND'
  | 'TRIP_NOT_FOUND'
  | 'INVITE_NOT_FOUND'
  | 'MEMBER_NOT_FOUND'
  | 'CONFLICT'
  | 'USERNAME_TAKEN'
  | 'OWNER_CANNOT_LEAVE'
  | 'CANNOT_CHANGE_OWNER_ROLE'
  | 'NO_PLANNED_RANGE'
  | 'AVAILABILITY_LOCKED'
  | 'ALREADY_LOCKED'
  | 'NOT_LOCKED'
  | 'GOOGLE_LOGIN_NOT_CONFIGURED'
  | 'INTERNAL_ERROR'

/** ProblemDetail (RFC 9457) + trường mở rộng của GlobalExceptionHandler */
export interface ProblemDetail {
  type: string
  title: string
  status: number
  detail: string
  instance?: string
  code: ErrorCode
  fieldErrors?: Record<string, string>
}

/** java.time.LocalDate → "YYYY-MM-DD" */
export type IsoDate = string
/** java.time.Instant → ISO-8601 UTC */
export type IsoInstant = string
