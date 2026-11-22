/** Id cho dnd-kit: item trong danh sách và viên ngày (vùng thả). */
export const itemDndId = (itemId: number) => `item-${itemId}`
export const dayDndId = (dayId: number) => `day-${dayId}`

export const parseItemDndId = (id: string | number) =>
  typeof id === 'string' && id.startsWith('item-') ? Number(id.slice(5)) : null

export const parseDayDndId = (id: string | number) =>
  typeof id === 'string' && id.startsWith('day-') ? Number(id.slice(4)) : null
