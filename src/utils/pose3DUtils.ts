/**
 * 3D Pose Analysis Utility Functions
 * 포즈 분석을 위한 3D 기하학 계산 유틸리티
 */

export interface Point3D {
  x: number
  y: number
  z: number
}

export interface Vector3D {
  x: number
  y: number
  z: number
}

// ============================================
// 기본 벡터 연산
// ============================================

/**
 * 두 점으로 벡터 생성 (p1 -> p2)
 */
export function createVector(p1: Point3D, p2: Point3D): Vector3D {
  return {
    x: p2.x - p1.x,
    y: p2.y - p1.y,
    z: p2.z - p1.z,
  }
}

/**
 * 벡터의 크기(길이) 계산
 */
export function vectorMagnitude(v: Vector3D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
}

/**
 * 벡터 정규화 (단위 벡터로 변환)
 */
export function normalizeVector(v: Vector3D): Vector3D {
  const mag = vectorMagnitude(v)
  if (mag === 0) {
    return { x: 0, y: 0, z: 0 }
  }
  return {
    x: v.x / mag,
    y: v.y / mag,
    z: v.z / mag,
  }
}

/**
 * 두 벡터의 내적 (dot product)
 */
export function dotProduct(v1: Vector3D, v2: Vector3D): number {
  return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z
}

/**
 * 두 벡터의 외적 (cross product)
 */
export function crossProduct(v1: Vector3D, v2: Vector3D): Vector3D {
  return {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  }
}

// ============================================
// 핵심 계산 함수
// ============================================

/**
 * 세 점으로 이루어진 3D 각도 계산 (p2가 꼭짓점)
 *
 * @param p1 - 첫 번째 점
 * @param p2 - 꼭짓점 (각도의 중심)
 * @param p3 - 세 번째 점
 * @returns 각도 (도, degree 단위, 0-180)
 *
 * @example
 * // 무릎 각도 계산 (엉덩이 - 무릎 - 발목)
 * const kneeAngle = calculate3DAngle(hip, knee, ankle)
 */
export function calculate3DAngle(p1: Point3D, p2: Point3D, p3: Point3D): number {
  // p2에서 p1으로 향하는 벡터
  const v1 = createVector(p2, p1)
  // p2에서 p3으로 향하는 벡터
  const v2 = createVector(p2, p3)

  const mag1 = vectorMagnitude(v1)
  const mag2 = vectorMagnitude(v2)

  // 벡터 크기가 0이면 각도 계산 불가
  if (mag1 === 0 || mag2 === 0) {
    return 0
  }

  // 내적을 이용한 각도 계산: cos(θ) = (v1 · v2) / (|v1| × |v2|)
  const cosAngle = dotProduct(v1, v2) / (mag1 * mag2)

  // 부동소수점 오차로 인해 -1~1 범위를 벗어날 수 있으므로 클램프
  const clampedCos = Math.max(-1, Math.min(1, cosAngle))

  // 라디안을 도(degree)로 변환
  const angleRad = Math.acos(clampedCos)
  const angleDeg = angleRad * (180 / Math.PI)

  return angleDeg
}

/**
 * 수직선(Y축)과의 각도 계산
 *
 * @param p1 - 시작점 (아래)
 * @param p2 - 끝점 (위)
 * @returns 수직선과의 각도 (도, degree 단위, 0-180)
 *
 * @example
 * // 척추가 얼마나 기울어졌는지 확인
 * const spineAngle = calculateAngleWithVertical(hip, shoulder)
 * // 0도 = 완전히 수직, 90도 = 수평
 */
export function calculateAngleWithVertical(p1: Point3D, p2: Point3D): number {
  // p1에서 p2로 향하는 벡터
  const v = createVector(p1, p2)

  // 수직 벡터 (위쪽 방향, Y축 음의 방향 - 화면 좌표계 기준)
  // 일반적인 화면 좌표계에서 Y는 아래로 증가하므로 위쪽은 -Y
  const vertical: Vector3D = { x: 0, y: -1, z: 0 }

  const mag = vectorMagnitude(v)

  if (mag === 0) {
    return 0
  }

  const cosAngle = dotProduct(v, vertical) / mag

  const clampedCos = Math.max(-1, Math.min(1, cosAngle))
  const angleRad = Math.acos(clampedCos)
  const angleDeg = angleRad * (180 / Math.PI)

  return angleDeg
}

/**
 * 수평선(X축)과의 각도 계산
 *
 * @param p1 - 시작점
 * @param p2 - 끝점
 * @returns 수평선과의 각도 (도, degree 단위, -90 ~ 90)
 */
export function calculateAngleWithHorizontal(p1: Point3D, p2: Point3D): number {
  const v = createVector(p1, p2)
  const horizontal: Vector3D = { x: 1, y: 0, z: 0 }

  const mag = vectorMagnitude(v)

  if (mag === 0) {
    return 0
  }

  const cosAngle = dotProduct(v, horizontal) / mag
  const clampedCos = Math.max(-1, Math.min(1, cosAngle))
  const angleRad = Math.acos(clampedCos)
  let angleDeg = angleRad * (180 / Math.PI)

  // Y 방향에 따라 부호 결정
  if (v.y > 0) {
    angleDeg = -angleDeg
  }

  return angleDeg
}

/**
 * 두 점 사이의 3D 거리 계산
 *
 * @param p1 - 첫 번째 점
 * @param p2 - 두 번째 점
 * @returns 두 점 사이의 유클리드 거리
 */
export function distance3D(p1: Point3D, p2: Point3D): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const dz = p2.z - p1.z

  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * 두 점 사이의 2D 거리 계산 (Z 무시)
 */
export function distance2D(p1: Point3D, p2: Point3D): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y

  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 두 점의 중점 계산
 *
 * @param p1 - 첫 번째 점
 * @param p2 - 두 번째 점
 * @returns 두 점의 중점
 */
export function midpoint(p1: Point3D, p2: Point3D): Point3D {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
    z: (p1.z + p2.z) / 2,
  }
}

// ============================================
// 고급 분석 함수
// ============================================

/**
 * 2D 각도 계산 (Z 좌표 무시)
 */
export function calculate2DAngle(p1: Point3D, p2: Point3D, p3: Point3D): number {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y }
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y }

  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y)
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y)

  if (mag1 === 0 || mag2 === 0) {
    return 0
  }

  const dot = v1.x * v2.x + v1.y * v2.y
  const cosAngle = dot / (mag1 * mag2)
  const clampedCos = Math.max(-1, Math.min(1, cosAngle))

  return Math.acos(clampedCos) * (180 / Math.PI)
}

/**
 * 평면에 대한 점의 투영
 * XY 평면 (정면 뷰)에 투영
 */
export function projectToXYPlane(p: Point3D): Point3D {
  return { x: p.x, y: p.y, z: 0 }
}

/**
 * XZ 평면 (상단 뷰)에 투영
 */
export function projectToXZPlane(p: Point3D): Point3D {
  return { x: p.x, y: 0, z: p.z }
}

/**
 * YZ 평면 (측면 뷰)에 투영
 */
export function projectToYZPlane(p: Point3D): Point3D {
  return { x: 0, y: p.y, z: p.z }
}

/**
 * 여러 점의 무게 중심 계산
 */
export function centroid(points: Point3D[]): Point3D {
  if (points.length === 0) {
    return { x: 0, y: 0, z: 0 }
  }

  const sum = points.reduce(
    (acc, p) => ({
      x: acc.x + p.x,
      y: acc.y + p.y,
      z: acc.z + p.z,
    }),
    { x: 0, y: 0, z: 0 }
  )

  return {
    x: sum.x / points.length,
    y: sum.y / points.length,
    z: sum.z / points.length,
  }
}

/**
 * 두 선분 사이의 각도 계산
 * 선분1: p1 -> p2
 * 선분2: p3 -> p4
 */
export function angleBetweenSegments(
  p1: Point3D,
  p2: Point3D,
  p3: Point3D,
  p4: Point3D
): number {
  const v1 = createVector(p1, p2)
  const v2 = createVector(p3, p4)

  const mag1 = vectorMagnitude(v1)
  const mag2 = vectorMagnitude(v2)

  if (mag1 === 0 || mag2 === 0) {
    return 0
  }

  const cosAngle = dotProduct(v1, v2) / (mag1 * mag2)
  const clampedCos = Math.max(-1, Math.min(1, cosAngle))

  return Math.acos(clampedCos) * (180 / Math.PI)
}

/**
 * 점이 두 점을 잇는 선분 위에서 얼마나 떨어져 있는지 계산
 * (선분에 대한 수직 거리)
 */
export function pointToLineDistance(
  point: Point3D,
  lineStart: Point3D,
  lineEnd: Point3D
): number {
  const lineVec = createVector(lineStart, lineEnd)
  const pointVec = createVector(lineStart, point)

  const lineMag = vectorMagnitude(lineVec)

  if (lineMag === 0) {
    return distance3D(point, lineStart)
  }

  // 외적의 크기를 선분 길이로 나누면 수직 거리
  const cross = crossProduct(lineVec, pointVec)
  const crossMag = vectorMagnitude(cross)

  return crossMag / lineMag
}

// ============================================
// 포즈 분석 특화 함수
// ============================================

/**
 * 관절 각도가 정상 범위 내에 있는지 확인
 */
export function isAngleInRange(
  angle: number,
  minAngle: number,
  maxAngle: number
): boolean {
  return angle >= minAngle && angle <= maxAngle
}

/**
 * 각도 차이 계산 (절대값)
 */
export function angleDifference(angle1: number, angle2: number): number {
  return Math.abs(angle1 - angle2)
}

/**
 * 좌우 대칭성 점수 계산 (0-100)
 * 두 각도가 비슷할수록 높은 점수
 */
export function symmetryScore(leftAngle: number, rightAngle: number): number {
  const diff = Math.abs(leftAngle - rightAngle)
  // 차이가 0이면 100점, 30도 이상 차이나면 0점
  const score = Math.max(0, 100 - (diff / 30) * 100)
  return Math.round(score)
}

/**
 * BlazePose keypoint를 Point3D로 변환
 */
export function keypointToPoint3D(keypoint: {
  x: number
  y: number
  z?: number
  score?: number
}): Point3D {
  return {
    x: keypoint.x,
    y: keypoint.y,
    z: keypoint.z ?? 0,
  }
}

/**
 * 유효한 keypoint인지 확인
 */
export function isValidKeypoint(
  keypoint: { score?: number } | undefined,
  minScore: number = 0.5
): boolean {
  return keypoint !== undefined && (keypoint.score ?? 0) >= minScore
}

/**
 * Calculate torso rotation angle in the transverse (horizontal) plane
 * Compares the orientation of shoulder line vs hip line when viewed from above
 *
 * @param leftShoulder - Left shoulder 3D position
 * @param rightShoulder - Right shoulder 3D position
 * @param leftHip - Left hip 3D position
 * @param rightHip - Right hip 3D position
 * @returns Rotation angle in degrees (0 = aligned, positive = shoulders rotated relative to hips)
 */
export function calculateTorsoRotation(
  leftShoulder: Point3D,
  rightShoulder: Point3D,
  leftHip: Point3D,
  rightHip: Point3D
): number {
  // Project points to XZ plane (top-down view / transverse plane)
  const leftShoulderXZ = projectToXZPlane(leftShoulder)
  const rightShoulderXZ = projectToXZPlane(rightShoulder)
  const leftHipXZ = projectToXZPlane(leftHip)
  const rightHipXZ = projectToXZPlane(rightHip)

  // Calculate shoulder and hip line widths in XZ plane
  const shoulderWidth = distance3D(leftShoulderXZ, rightShoulderXZ)
  const hipWidth = distance3D(leftHipXZ, rightHipXZ)

  // Edge case: if shoulder or hip width is near zero (user facing directly toward/away from camera)
  // return 0 rotation as we cannot reliably calculate rotation
  if (shoulderWidth < 0.01 || hipWidth < 0.01) {
    return 0
  }

  // Calculate angle between shoulder line and hip line in XZ plane
  const rotationAngle = angleBetweenSegments(
    leftShoulderXZ,
    rightShoulderXZ,
    leftHipXZ,
    rightHipXZ
  )

  return Math.round(rotationAngle * 10) / 10
}

// ============================================
// Torso Segment Calculation Functions
// ============================================

/**
 * Calculate upper torso segment angle (neck/ear to shoulder)
 * Uses nose/ear keypoints for head reference and shoulder center
 *
 * @returns Angle with vertical in degrees (0 = upright, positive = forward lean)
 */
export function calculateUpperTorsoAngle(
  nose: Point3D,
  leftEar: Point3D,
  rightEar: Point3D,
  leftShoulder: Point3D,
  rightShoulder: Point3D
): number {
  // Head reference point (center between ears, or nose if ears unavailable)
  const headCenter = midpoint(leftEar, rightEar)
  const shoulderCenter = midpoint(leftShoulder, rightShoulder)

  // Use nose Y to adjust head center for forward/backward tilt
  const neckPoint: Point3D = {
    x: headCenter.x,
    y: (headCenter.y + shoulderCenter.y) / 2,  // Estimated neck position
    z: headCenter.z,
  }

  // Suppress unused variable warning - nose could be used for more accurate tilt in future
  void nose

  return calculateAngleWithVertical(shoulderCenter, neckPoint)
}

/**
 * Calculate mid torso segment angle (shoulder center to mid-spine)
 * Mid-spine is estimated at 40% from shoulders toward hips
 *
 * @returns Angle with vertical in degrees
 */
export function calculateMidTorsoAngle(
  leftShoulder: Point3D,
  rightShoulder: Point3D,
  leftHip: Point3D,
  rightHip: Point3D
): number {
  const shoulderCenter = midpoint(leftShoulder, rightShoulder)
  const hipCenter = midpoint(leftHip, rightHip)

  // Estimate mid-spine at 40% from shoulder to hip
  const midSpine: Point3D = {
    x: shoulderCenter.x + (hipCenter.x - shoulderCenter.x) * 0.4,
    y: shoulderCenter.y + (hipCenter.y - shoulderCenter.y) * 0.4,
    z: shoulderCenter.z + (hipCenter.z - shoulderCenter.z) * 0.4,
  }

  return calculateAngleWithVertical(midSpine, shoulderCenter)
}

/**
 * Calculate lower torso segment angle (mid-spine to hip center)
 *
 * @returns Angle with vertical in degrees
 */
export function calculateLowerTorsoAngle(
  leftShoulder: Point3D,
  rightShoulder: Point3D,
  leftHip: Point3D,
  rightHip: Point3D
): number {
  const shoulderCenter = midpoint(leftShoulder, rightShoulder)
  const hipCenter = midpoint(leftHip, rightHip)

  // Estimate mid-spine at 40% from shoulder to hip
  const midSpine: Point3D = {
    x: shoulderCenter.x + (hipCenter.x - shoulderCenter.x) * 0.4,
    y: shoulderCenter.y + (hipCenter.y - shoulderCenter.y) * 0.4,
    z: shoulderCenter.z + (hipCenter.z - shoulderCenter.z) * 0.4,
  }

  return calculateAngleWithVertical(hipCenter, midSpine)
}

/**
 * 2D fallback for upper torso angle when z-coordinates unavailable
 */
export function calculateUpperTorsoAngle2D(
  nose: Point3D,
  leftEar: Point3D,
  rightEar: Point3D,
  leftShoulder: Point3D,
  rightShoulder: Point3D
): number {
  const headCenter = { x: (leftEar.x + rightEar.x) / 2, y: (leftEar.y + rightEar.y) / 2, z: 0 }
  const shoulderCenter = { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2, z: 0 }
  const neckPoint = { x: headCenter.x, y: (headCenter.y + shoulderCenter.y) / 2, z: 0 }

  // Suppress unused variable warning - nose could be used for more accurate tilt in future
  void nose

  return calculateAngleWithVertical(shoulderCenter, neckPoint)
}

/**
 * 2D fallback for mid/lower torso angles
 */
export function calculateTorsoSegmentAngles2D(
  leftShoulder: Point3D,
  rightShoulder: Point3D,
  leftHip: Point3D,
  rightHip: Point3D
): { mid: number; lower: number } {
  const shoulderCenter = { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2, z: 0 }
  const hipCenter = { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2, z: 0 }
  const midSpine = {
    x: shoulderCenter.x + (hipCenter.x - shoulderCenter.x) * 0.4,
    y: shoulderCenter.y + (hipCenter.y - shoulderCenter.y) * 0.4,
    z: 0,
  }

  return {
    mid: calculateAngleWithVertical(midSpine, shoulderCenter),
    lower: calculateAngleWithVertical(hipCenter, midSpine),
  }
}

/**
 * Check if 3D z-coordinates are available and valid
 */
export function has3DCoordinates(points: Point3D[]): boolean {
  return points.every(p => p.z !== 0 && p.z !== undefined && !isNaN(p.z))
}
