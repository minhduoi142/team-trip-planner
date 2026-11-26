import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudRainWind,
  CloudSun,
  Snowflake,
  Sun,
  Thermometer,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WeatherCondition } from '@/types/weather'

/** Chỉ icon mang màu, lấy từ token (docs/ui-slop-audit.md P3-LT-15): nắng = warning, mưa/tuyết = info, mây = muted. */
const ICONS: Record<WeatherCondition, { icon: LucideIcon; color: string }> = {
  CLEAR: { icon: Sun, color: 'text-warning' },
  PARTLY_CLOUDY: { icon: CloudSun, color: 'text-warning' },
  CLOUDY: { icon: Cloud, color: 'text-muted-foreground' },
  FOG: { icon: CloudFog, color: 'text-muted-foreground' },
  DRIZZLE: { icon: CloudDrizzle, color: 'text-info' },
  RAIN: { icon: CloudRain, color: 'text-info' },
  HEAVY_RAIN: { icon: CloudRainWind, color: 'text-info' },
  SNOW: { icon: Snowflake, color: 'text-info' },
  THUNDERSTORM: { icon: CloudLightning, color: 'text-warning' },
  UNKNOWN: { icon: Thermometer, color: 'text-muted-foreground' },
}

interface WeatherIconProps {
  condition: WeatherCondition
  className?: string
  /** false: dùng màu chữ hiện tại (vd trên viên ngày đang chọn) */
  colored?: boolean
}

export function WeatherIcon({ condition, className, colored = true }: WeatherIconProps) {
  const { icon: Icon, color } = ICONS[condition]
  return <Icon aria-hidden="true" className={cn('shrink-0', colored && color, className)} />
}
