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

const ICONS: Record<WeatherCondition, { icon: LucideIcon; color: string }> = {
  CLEAR: { icon: Sun, color: 'text-amber-500' },
  PARTLY_CLOUDY: { icon: CloudSun, color: 'text-amber-500' },
  CLOUDY: { icon: Cloud, color: 'text-slate-500' },
  FOG: { icon: CloudFog, color: 'text-slate-500' },
  DRIZZLE: { icon: CloudDrizzle, color: 'text-sky-500' },
  RAIN: { icon: CloudRain, color: 'text-sky-600' },
  HEAVY_RAIN: { icon: CloudRainWind, color: 'text-blue-700' },
  SNOW: { icon: Snowflake, color: 'text-cyan-500' },
  THUNDERSTORM: { icon: CloudLightning, color: 'text-violet-600' },
  UNKNOWN: { icon: Thermometer, color: 'text-muted-foreground' },
}

interface WeatherIconProps {
  condition: WeatherCondition
  className?: string
  /** false: dùng màu chữ hiện tại (vd trên viên ngày đang chọn nền hồng) */
  colored?: boolean
}

export function WeatherIcon({ condition, className, colored = true }: WeatherIconProps) {
  const { icon: Icon, color } = ICONS[condition]
  return <Icon aria-hidden="true" className={cn('shrink-0', colored && color, className)} />
}
