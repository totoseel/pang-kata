export const CANVAS_WIDTH = 480
export const CANVAS_HEIGHT = 640
export const PLAYER_SPEED = 4
export const PLAYER_WIDTH = 32
export const PLAYER_HEIGHT = 48

export type BalloonSize = 'large' | 'medium' | 'small' | 'tiny'

export const GRAVITY = 0.3

export const BALLOON_RADIUS: Record<BalloonSize, number> = {
  large:  40,
  medium: 28,
  small:  18,
  tiny:   10,
}

export const BALLOON_VX: Record<BalloonSize, number> = {
  large:  2.0,
  medium: 2.5,
  small:  3.0,
  tiny:   3.5,
}

export const BALLOON_BOUNCE_VY: Record<BalloonSize, number> = {
  large:  -16,
  medium: -13,
  small:  -14,
  tiny:   -9.8,
}

export const BALLOON_COLOR: Record<BalloonSize, string> = {
  large:  '#ef4444',
  medium: '#f97316',
  small:  '#eab308',
  tiny:   '#a855f7',
}

export const NEXT_SIZE: Record<BalloonSize, BalloonSize | null> = {
  large:  'medium',
  medium: 'small',
  small:  'tiny',
  tiny:   null,
}

export const HARPOON_SPEED = 10

export const PLAYER_LIVES = 99
export const INVINCIBLE_FRAMES = 120

export const BALLOON_SCORE: Record<BalloonSize, number> = {
  large:  100,
  medium: 200,
  small:  300,
  tiny:   400,
}

export const STAGE_CLEAR_BONUS = 10_000
export const STAGE_CLEAR_FRAMES = 180
export const POPUP_FRAMES = 50

export type WeaponType = 'basic' | 'double' | 'power' | 'vulcan'

export const WEAPON_DURATION_FRAMES = 600
export const POWER_PIN_FRAMES = 120
export const VULCAN_FIRE_INTERVAL = 6

export const WEAPON_LABEL: Record<WeaponType, string> = {
  basic:  '🗡',
  double: '🔱',
  power:  '⚡',
  vulcan: '🚀',
}

export type ItemType =
  | 'clock' | 'star' | 'hourglass' | 'shield' | 'dynamite' | 'fruit'
  | 'weapon_double' | 'weapon_power' | 'weapon_vulcan'

export const ITEM_FALL_SPEED = 2
export const ITEM_SIZE = 28
export const ITEM_LIFETIME_FRAMES = 600
export const ITEM_DROP_CHANCE = 0.3
export const ITEM_EFFECT_FRAMES = 180
export const ITEM_SCORE_BONUS = 1_000

export const ITEM_COLOR: Record<ItemType, string> = {
  clock:         '#facc15',
  star:          '#fbbf24',
  hourglass:     '#60a5fa',
  shield:        '#34d399',
  dynamite:      '#f87171',
  fruit:         '#fb923c',
  weapon_double: '#818cf8',
  weapon_power:  '#fde68a',
  weapon_vulcan: '#6ee7b7',
}

export const ITEM_LABEL: Record<ItemType, string> = {
  clock:         '⏰',
  star:          '⭐',
  hourglass:     '⏳',
  shield:        '🛡',
  dynamite:      '💣',
  fruit:         '🍎',
  weapon_double: '🔱',
  weapon_power:  '⚡',
  weapon_vulcan: '🚀',
}
