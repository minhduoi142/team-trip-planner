import { createCn } from 'cn/config'

/**
 * `cn` biết các token riêng trong index.css, để class sau ghi đè được class trước
 * (vd `shadow-sm` rồi `shadow-flat` thì giữ `shadow-flat`; `text-2xs` là cỡ chữ chứ không phải màu chữ).
 */
export const cn = createCn({
  extend: {
    theme: {
      shadow: ['flat', 'raised', 'cta', 'cta-destructive', 'overlay', 'sunken', 'pressed'],
      radius: ['control', 'item', 'surface', 'overlay'],
      text: ['2xs'],
      ease: ['out-soft', 'press'],
    },
  },
})
