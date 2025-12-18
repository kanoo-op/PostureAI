/**
 * Angle Smoothing Utility Module
 * Implements EMA filter with outlier rejection for real-time pose angle smoothing
 */

// ============================================
// Type Definitions
// ============================================

export interface SmoothingConfig {
  /** EMA smoothing factor (0.1-0.5). Lower = smoother but more latency. Default: 0.3 */
  alpha: number
  /** Maximum allowed angle jump between frames (degrees). Default: 30 */
  outlierThreshold: number
  /** Enable/disable smoothing. Default: true */
  enabled: boolean
}

export interface SmootherState {
  /** Previous smoothed value */
  previousValue: number | null
  /** Previous raw value for outlier detection */
  previousRawValue: number | null
  /** Count of consecutive outliers rejected */
  outlierCount: number
  /** Whether the smoother has been initialized */
  initialized: boolean
  /** Timestamp of last update for debugging */
  lastUpdateTime: number
}

export interface SmoothResult {
  /** The smoothed angle value */
  smoothedValue: number
  /** The original raw value */
  rawValue: number
  /** Whether this value was treated as an outlier */
  wasOutlier: boolean
  /** Current smoother state */
  state: SmootherState
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_SMOOTHING_CONFIG: SmoothingConfig = {
  alpha: 0.3,
  outlierThreshold: 30,
  enabled: true,
}

// ============================================
// AngleSmoother Class
// ============================================

export class AngleSmoother {
  private config: SmoothingConfig
  private state: SmootherState

  constructor(config: Partial<SmoothingConfig> = {}) {
    this.config = { ...DEFAULT_SMOOTHING_CONFIG, ...config }
    this.state = this.createInitialState()

    // Validate alpha range
    if (this.config.alpha < 0.1 || this.config.alpha > 0.5) {
      console.warn(`AngleSmoother: alpha ${this.config.alpha} out of recommended range (0.1-0.5), clamping`)
      this.config.alpha = Math.max(0.1, Math.min(0.5, this.config.alpha))
    }
  }

  private createInitialState(): SmootherState {
    return {
      previousValue: null,
      previousRawValue: null,
      outlierCount: 0,
      initialized: false,
      lastUpdateTime: 0,
    }
  }

  /**
   * Apply EMA smoothing to an angle value
   * EMA formula: smoothed = alpha * current + (1 - alpha) * previous
   */
  smooth(rawValue: number): SmoothResult {
    const currentTime = Date.now()

    // If disabled, return raw value
    if (!this.config.enabled) {
      return {
        smoothedValue: rawValue,
        rawValue,
        wasOutlier: false,
        state: this.state,
      }
    }

    // First value - initialize
    if (!this.state.initialized || this.state.previousValue === null) {
      this.state = {
        previousValue: rawValue,
        previousRawValue: rawValue,
        outlierCount: 0,
        initialized: true,
        lastUpdateTime: currentTime,
      }
      return {
        smoothedValue: rawValue,
        rawValue,
        wasOutlier: false,
        state: this.state,
      }
    }

    // Outlier detection
    const angleDiff = Math.abs(rawValue - this.state.previousRawValue!)
    const isOutlier = angleDiff > this.config.outlierThreshold

    let smoothedValue: number
    let wasOutlier = false

    if (isOutlier) {
      // Increment outlier count
      this.state.outlierCount++
      wasOutlier = true

      // If too many consecutive outliers (>3), accept the new value
      // This handles legitimate rapid movements
      if (this.state.outlierCount > 3) {
        smoothedValue = rawValue
        this.state.outlierCount = 0
      } else {
        // Reject outlier, use previous smoothed value
        smoothedValue = this.state.previousValue
      }
    } else {
      // Reset outlier count on valid value
      this.state.outlierCount = 0

      // Apply EMA filter
      smoothedValue = this.config.alpha * rawValue + (1 - this.config.alpha) * this.state.previousValue
    }

    // Update state
    this.state = {
      previousValue: smoothedValue,
      previousRawValue: rawValue,
      outlierCount: this.state.outlierCount,
      initialized: true,
      lastUpdateTime: currentTime,
    }

    return {
      smoothedValue,
      rawValue,
      wasOutlier,
      state: this.state,
    }
  }

  /**
   * Reset the smoother state (call when starting a new exercise session)
   */
  reset(): void {
    this.state = this.createInitialState()
  }

  /**
   * Get current smoother state for debugging
   */
  getState(): SmootherState {
    return { ...this.state }
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(config: Partial<SmoothingConfig>): void {
    this.config = { ...this.config, ...config }
    if (this.config.alpha < 0.1 || this.config.alpha > 0.5) {
      this.config.alpha = Math.max(0.1, Math.min(0.5, this.config.alpha))
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): SmoothingConfig {
    return { ...this.config }
  }
}

// ============================================
// AngleSmootherSet - Factory for multiple smoothers
// ============================================

export type AngleSmootherSetState<K extends string> = {
  [key in K]: SmootherState
}

export class AngleSmootherSet<K extends string> {
  private smoothers: Map<K, AngleSmoother> = new Map()
  private config: SmoothingConfig
  private angleKeys: K[]

  constructor(angleKeys: K[], config: Partial<SmoothingConfig> = {}) {
    this.angleKeys = angleKeys
    this.config = { ...DEFAULT_SMOOTHING_CONFIG, ...config }

    // Initialize a smoother for each angle
    for (const key of angleKeys) {
      this.smoothers.set(key, new AngleSmoother(this.config))
    }
  }

  /**
   * Smooth a single angle by key
   */
  smooth(key: K, rawValue: number): SmoothResult {
    const smoother = this.smoothers.get(key)
    if (!smoother) {
      throw new Error(`Unknown angle key: ${key}`)
    }
    return smoother.smooth(rawValue)
  }

  /**
   * Smooth multiple angles at once
   */
  smoothAll(rawValues: Record<K, number>): Record<K, SmoothResult> {
    const results = {} as Record<K, SmoothResult>
    for (const key of this.angleKeys) {
      if (key in rawValues) {
        results[key] = this.smooth(key, rawValues[key])
      }
    }
    return results
  }

  /**
   * Reset all smoothers
   */
  reset(): void {
    this.angleKeys.forEach((key) => {
      const smoother = this.smoothers.get(key)
      if (smoother) {
        smoother.reset()
      }
    })
  }

  /**
   * Get state of all smoothers
   */
  getState(): AngleSmootherSetState<K> {
    const state = {} as AngleSmootherSetState<K>
    this.angleKeys.forEach((key) => {
      const smoother = this.smoothers.get(key)
      if (smoother) {
        state[key] = smoother.getState()
      }
    })
    return state
  }

  /**
   * Update configuration for all smoothers
   */
  updateConfig(config: Partial<SmoothingConfig>): void {
    this.config = { ...this.config, ...config }
    this.angleKeys.forEach((key) => {
      const smoother = this.smoothers.get(key)
      if (smoother) {
        smoother.updateConfig(config)
      }
    })
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a smoother set for squat analysis angles
 */
export function createSquatSmootherSet(config?: Partial<SmoothingConfig>): AngleSmootherSet<
  'leftKneeAngle' | 'rightKneeAngle' | 'leftHipAngle' | 'rightHipAngle' |
  'torsoAngle' | 'leftAnkleAngle' | 'rightAnkleAngle' | 'neckAngle' | 'torsoRotationAngle'
> {
  return new AngleSmootherSet([
    'leftKneeAngle', 'rightKneeAngle',
    'leftHipAngle', 'rightHipAngle',
    'torsoAngle',
    'leftAnkleAngle', 'rightAnkleAngle',
    'neckAngle',
    'torsoRotationAngle',
  ], config)
}

/**
 * Create a smoother set for pushup analysis angles (UPDATED)
 * Now includes elbow valgus angles for comprehensive arm tracking and neck angle
 */
export function createPushupSmootherSet(config?: Partial<SmoothingConfig>): AngleSmootherSet<
  'leftElbowAngle' | 'rightElbowAngle' | 'bodyAlignmentAngle' | 'hipSagAngle' |
  'leftElbowValgus' | 'rightElbowValgus' | 'neckAngle'
> {
  return new AngleSmootherSet([
    'leftElbowAngle', 'rightElbowAngle',
    'bodyAlignmentAngle', 'hipSagAngle',
    'leftElbowValgus', 'rightElbowValgus',
    'neckAngle',
  ], config)
}

/**
 * Create a smoother set for lunge analysis angles
 */
export function createLungeSmootherSet(config?: Partial<SmoothingConfig>): AngleSmootherSet<
  'frontKneeAngle' | 'backKneeAngle' | 'frontHipAngle' | 'backHipAngle' | 'torsoAngle' | 'neckAngle' | 'backHipExtensionAngle' | 'torsoRotationAngle'
> {
  return new AngleSmootherSet([
    'frontKneeAngle', 'backKneeAngle',
    'frontHipAngle', 'backHipAngle',
    'torsoAngle',
    'neckAngle',
    'backHipExtensionAngle',
    'torsoRotationAngle',
  ], config)
}

/**
 * Create a smoother set for plank analysis angles
 */
export function createPlankSmootherSet(config?: Partial<SmoothingConfig>): AngleSmootherSet<
  'bodyAlignmentAngle' | 'hipDeviationAngle' | 'shoulderWristOffset' | 'neckAngle'
> {
  return new AngleSmootherSet([
    'bodyAlignmentAngle', 'hipDeviationAngle',
    'shoulderWristOffset', 'neckAngle',
  ], config)
}

/**
 * Create a smoother set for deadlift analysis angles
 */
export function createDeadliftSmootherSet(config?: Partial<SmoothingConfig>): AngleSmootherSet<
  'leftHipHingeAngle' | 'rightHipHingeAngle' | 'leftKneeAngle' | 'rightKneeAngle' |
  'spineAngle' | 'upperSpineAngle' | 'lowerSpineAngle' | 'neckAngle' | 'torsoRotationAngle'
> {
  return new AngleSmootherSet([
    'leftHipHingeAngle', 'rightHipHingeAngle',
    'leftKneeAngle', 'rightKneeAngle',
    'spineAngle', 'upperSpineAngle', 'lowerSpineAngle',
    'neckAngle',
    'torsoRotationAngle',
  ], config)
}

/**
 * Create a smoother set for overhead analysis angles
 */
export function createOverheadSmootherSet(config?: Partial<SmoothingConfig>): AngleSmootherSet<
  'leftShoulderAngle' | 'rightShoulderAngle' | 'leftWristAngle' | 'rightWristAngle' |
  'leftElevation' | 'rightElevation'
> {
  return new AngleSmootherSet([
    'leftShoulderAngle', 'rightShoulderAngle',
    'leftWristAngle', 'rightWristAngle',
    'leftElevation', 'rightElevation',
  ], config)
}
