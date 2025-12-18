import {
  Point3D,
  Vector3D,
  createVector,
  vectorMagnitude,
  normalizeVector,
  dotProduct,
  crossProduct,
  calculate3DAngle,
  calculateAngleWithVertical,
  calculateAngleWithHorizontal,
  distance3D,
  distance2D,
  midpoint,
  calculate2DAngle,
  projectToXYPlane,
  projectToXZPlane,
  projectToYZPlane,
  centroid,
  angleBetweenSegments,
  pointToLineDistance,
  isAngleInRange,
  angleDifference,
  symmetryScore,
  keypointToPoint3D,
  isValidKeypoint,
  calculateTorsoRotation,
} from '../pose3DUtils'

describe('Basic Vector Operations', () => {
  describe('createVector', () => {
    test('should create vector from two points', () => {
      const p1: Point3D = { x: 1, y: 2, z: 3 }
      const p2: Point3D = { x: 4, y: 6, z: 8 }
      const result = createVector(p1, p2)
      expect(result).toEqual({ x: 3, y: 4, z: 5 })
    })

    test('should handle negative coordinates', () => {
      const p1: Point3D = { x: -1, y: -2, z: -3 }
      const p2: Point3D = { x: 1, y: 2, z: 3 }
      const result = createVector(p1, p2)
      expect(result).toEqual({ x: 2, y: 4, z: 6 })
    })

    test('should return zero vector for same points', () => {
      const p: Point3D = { x: 5, y: 5, z: 5 }
      const result = createVector(p, p)
      expect(result).toEqual({ x: 0, y: 0, z: 0 })
    })
  })

  describe('vectorMagnitude', () => {
    test('should calculate magnitude of unit vectors', () => {
      expect(vectorMagnitude({ x: 1, y: 0, z: 0 })).toBe(1)
      expect(vectorMagnitude({ x: 0, y: 1, z: 0 })).toBe(1)
      expect(vectorMagnitude({ x: 0, y: 0, z: 1 })).toBe(1)
    })

    test('should calculate magnitude of 3-4-5 triangle vector', () => {
      expect(vectorMagnitude({ x: 3, y: 4, z: 0 })).toBe(5)
    })

    test('should return 0 for zero vector', () => {
      expect(vectorMagnitude({ x: 0, y: 0, z: 0 })).toBe(0)
    })

    test('should handle negative components', () => {
      expect(vectorMagnitude({ x: -3, y: -4, z: 0 })).toBe(5)
    })
  })

  describe('normalizeVector', () => {
    test('should normalize vector to unit length', () => {
      const v: Vector3D = { x: 3, y: 4, z: 0 }
      const result = normalizeVector(v)
      expect(result.x).toBeCloseTo(0.6)
      expect(result.y).toBeCloseTo(0.8)
      expect(result.z).toBeCloseTo(0)
      expect(vectorMagnitude(result)).toBeCloseTo(1)
    })

    test('should return zero vector for zero input', () => {
      const result = normalizeVector({ x: 0, y: 0, z: 0 })
      expect(result).toEqual({ x: 0, y: 0, z: 0 })
    })

    test('should handle already unit vectors', () => {
      const v: Vector3D = { x: 1, y: 0, z: 0 }
      const result = normalizeVector(v)
      expect(result).toEqual({ x: 1, y: 0, z: 0 })
    })
  })

  describe('dotProduct', () => {
    test('should return 0 for perpendicular vectors', () => {
      const v1: Vector3D = { x: 1, y: 0, z: 0 }
      const v2: Vector3D = { x: 0, y: 1, z: 0 }
      expect(dotProduct(v1, v2)).toBe(0)
    })

    test('should return positive for same direction vectors', () => {
      const v1: Vector3D = { x: 1, y: 0, z: 0 }
      const v2: Vector3D = { x: 2, y: 0, z: 0 }
      expect(dotProduct(v1, v2)).toBe(2)
    })

    test('should return negative for opposite direction vectors', () => {
      const v1: Vector3D = { x: 1, y: 0, z: 0 }
      const v2: Vector3D = { x: -1, y: 0, z: 0 }
      expect(dotProduct(v1, v2)).toBe(-1)
    })

    test('should calculate correctly for general vectors', () => {
      const v1: Vector3D = { x: 1, y: 2, z: 3 }
      const v2: Vector3D = { x: 4, y: 5, z: 6 }
      // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
      expect(dotProduct(v1, v2)).toBe(32)
    })
  })

  describe('crossProduct', () => {
    test('should return perpendicular vector', () => {
      const v1: Vector3D = { x: 1, y: 0, z: 0 }
      const v2: Vector3D = { x: 0, y: 1, z: 0 }
      const result = crossProduct(v1, v2)
      expect(result).toEqual({ x: 0, y: 0, z: 1 })
    })

    test('should return zero for parallel vectors', () => {
      const v1: Vector3D = { x: 1, y: 2, z: 3 }
      const v2: Vector3D = { x: 2, y: 4, z: 6 }
      const result = crossProduct(v1, v2)
      expect(result.x).toBeCloseTo(0)
      expect(result.y).toBeCloseTo(0)
      expect(result.z).toBeCloseTo(0)
    })

    test('should be anti-commutative', () => {
      const v1: Vector3D = { x: 1, y: 2, z: 3 }
      const v2: Vector3D = { x: 4, y: 5, z: 6 }
      const r1 = crossProduct(v1, v2)
      const r2 = crossProduct(v2, v1)
      expect(r1.x).toBeCloseTo(-r2.x)
      expect(r1.y).toBeCloseTo(-r2.y)
      expect(r1.z).toBeCloseTo(-r2.z)
    })
  })
})

describe('calculate3DAngle', () => {
  describe('standard angles', () => {
    test('should return 90 degrees for perpendicular vectors', () => {
      const p1: Point3D = { x: 1, y: 0, z: 0 }
      const p2: Point3D = { x: 0, y: 0, z: 0 } // vertex
      const p3: Point3D = { x: 0, y: 1, z: 0 }
      expect(calculate3DAngle(p1, p2, p3)).toBeCloseTo(90)
    })

    test('should return 180 degrees for collinear points (straight line)', () => {
      const p1: Point3D = { x: -1, y: 0, z: 0 }
      const p2: Point3D = { x: 0, y: 0, z: 0 }
      const p3: Point3D = { x: 1, y: 0, z: 0 }
      expect(calculate3DAngle(p1, p2, p3)).toBeCloseTo(180)
    })

    test('should return 0 degrees for vectors in same direction', () => {
      const p1: Point3D = { x: 1, y: 0, z: 0 }
      const p2: Point3D = { x: 0, y: 0, z: 0 }
      const p3: Point3D = { x: 2, y: 0, z: 0 }
      expect(calculate3DAngle(p1, p2, p3)).toBeCloseTo(0)
    })

    test('should return 60 degrees for equilateral triangle', () => {
      const p1: Point3D = { x: 1, y: 0, z: 0 }
      const p2: Point3D = { x: 0, y: 0, z: 0 }
      const p3: Point3D = { x: 0.5, y: Math.sqrt(3) / 2, z: 0 }
      expect(calculate3DAngle(p1, p2, p3)).toBeCloseTo(60)
    })

    test('should return 45 degrees for appropriate angle', () => {
      const p1: Point3D = { x: 1, y: 0, z: 0 }
      const p2: Point3D = { x: 0, y: 0, z: 0 }
      const p3: Point3D = { x: 1, y: 1, z: 0 }
      expect(calculate3DAngle(p1, p2, p3)).toBeCloseTo(45)
    })

    test('should return 120 degrees for obtuse angle', () => {
      const p1: Point3D = { x: 1, y: 0, z: 0 }
      const p2: Point3D = { x: 0, y: 0, z: 0 }
      const p3: Point3D = { x: -0.5, y: Math.sqrt(3) / 2, z: 0 }
      expect(calculate3DAngle(p1, p2, p3)).toBeCloseTo(120)
    })
  })

  describe('edge cases', () => {
    test('should return 0 when first point equals vertex (zero vector)', () => {
      const p1: Point3D = { x: 0, y: 0, z: 0 }
      const p2: Point3D = { x: 0, y: 0, z: 0 }
      const p3: Point3D = { x: 1, y: 0, z: 0 }
      expect(calculate3DAngle(p1, p2, p3)).toBe(0)
    })

    test('should return 0 when third point equals vertex (zero vector)', () => {
      const p1: Point3D = { x: 1, y: 0, z: 0 }
      const p2: Point3D = { x: 0, y: 0, z: 0 }
      const p3: Point3D = { x: 0, y: 0, z: 0 }
      expect(calculate3DAngle(p1, p2, p3)).toBe(0)
    })

    test('should return 0 when all points are the same', () => {
      const p: Point3D = { x: 5, y: 5, z: 5 }
      expect(calculate3DAngle(p, p, p)).toBe(0)
    })

    test('should handle very small vectors', () => {
      const p1: Point3D = { x: 0.0001, y: 0, z: 0 }
      const p2: Point3D = { x: 0, y: 0, z: 0 }
      const p3: Point3D = { x: 0, y: 0.0001, z: 0 }
      expect(calculate3DAngle(p1, p2, p3)).toBeCloseTo(90)
    })

    test('should handle 3D angles correctly', () => {
      const p1: Point3D = { x: 1, y: 0, z: 0 }
      const p2: Point3D = { x: 0, y: 0, z: 0 }
      const p3: Point3D = { x: 0, y: 0, z: 1 }
      expect(calculate3DAngle(p1, p2, p3)).toBeCloseTo(90)
    })
  })
})

describe('calculateAngleWithVertical', () => {
  describe('boundary values', () => {
    test('should return 0 degrees for perfectly vertical upward vector', () => {
      const p1: Point3D = { x: 0, y: 1, z: 0 }  // bottom
      const p2: Point3D = { x: 0, y: 0, z: 0 }  // top (Y decreases upward)
      expect(calculateAngleWithVertical(p1, p2)).toBeCloseTo(0)
    })

    test('should return 180 degrees for perfectly vertical downward vector', () => {
      const p1: Point3D = { x: 0, y: 0, z: 0 }
      const p2: Point3D = { x: 0, y: 1, z: 0 }  // Y increases = downward
      expect(calculateAngleWithVertical(p1, p2)).toBeCloseTo(180)
    })

    test('should return 90 degrees for horizontal vector', () => {
      const p1: Point3D = { x: 0, y: 0, z: 0 }
      const p2: Point3D = { x: 1, y: 0, z: 0 }
      expect(calculateAngleWithVertical(p1, p2)).toBeCloseTo(90)
    })

    test('should return 90 degrees for Z-axis vector', () => {
      const p1: Point3D = { x: 0, y: 0, z: 0 }
      const p2: Point3D = { x: 0, y: 0, z: 1 }
      expect(calculateAngleWithVertical(p1, p2)).toBeCloseTo(90)
    })
  })

  describe('intermediate angles', () => {
    test('should return 45 degrees for diagonal vector', () => {
      const p1: Point3D = { x: 0, y: 1, z: 0 }
      const p2: Point3D = { x: 1, y: 0, z: 0 }
      expect(calculateAngleWithVertical(p1, p2)).toBeCloseTo(45)
    })
  })

  describe('edge cases', () => {
    test('should return 0 for zero-length vector', () => {
      const p: Point3D = { x: 0, y: 0, z: 0 }
      expect(calculateAngleWithVertical(p, p)).toBe(0)
    })
  })
})

describe('calculateAngleWithHorizontal', () => {
  describe('boundary values', () => {
    test('should return 0 degrees for horizontal right vector', () => {
      const p1: Point3D = { x: 0, y: 0, z: 0 }
      const p2: Point3D = { x: 1, y: 0, z: 0 }
      expect(calculateAngleWithHorizontal(p1, p2)).toBeCloseTo(0)
    })

    test('should return positive angle for upward vector', () => {
      const p1: Point3D = { x: 0, y: 0, z: 0 }
      const p2: Point3D = { x: 1, y: -1, z: 0 }  // Y decreases = upward
      const angle = calculateAngleWithHorizontal(p1, p2)
      expect(angle).toBeCloseTo(45)
    })

    test('should return negative angle for downward vector', () => {
      const p1: Point3D = { x: 0, y: 0, z: 0 }
      const p2: Point3D = { x: 1, y: 1, z: 0 }  // Y increases = downward
      const angle = calculateAngleWithHorizontal(p1, p2)
      expect(angle).toBeCloseTo(-45)
    })

    test('should return 90 degrees for vertical upward vector', () => {
      const p1: Point3D = { x: 0, y: 0, z: 0 }
      const p2: Point3D = { x: 0, y: -1, z: 0 }
      expect(Math.abs(calculateAngleWithHorizontal(p1, p2))).toBeCloseTo(90)
    })
  })

  describe('edge cases', () => {
    test('should return 0 for zero-length vector', () => {
      const p: Point3D = { x: 0, y: 0, z: 0 }
      expect(calculateAngleWithHorizontal(p, p)).toBe(0)
    })
  })
})

describe('Distance Functions', () => {
  describe('distance3D', () => {
    test('should calculate distance for 3-4-5 triangle', () => {
      const p1: Point3D = { x: 0, y: 0, z: 0 }
      const p2: Point3D = { x: 3, y: 4, z: 0 }
      expect(distance3D(p1, p2)).toBe(5)
    })

    test('should return 0 for same point', () => {
      const p: Point3D = { x: 5, y: 5, z: 5 }
      expect(distance3D(p, p)).toBe(0)
    })

    test('should handle negative coordinates', () => {
      const p1: Point3D = { x: -1, y: -1, z: -1 }
      const p2: Point3D = { x: 1, y: 1, z: 1 }
      expect(distance3D(p1, p2)).toBeCloseTo(Math.sqrt(12))
    })

    test('should include Z coordinate', () => {
      const p1: Point3D = { x: 0, y: 0, z: 0 }
      const p2: Point3D = { x: 0, y: 0, z: 5 }
      expect(distance3D(p1, p2)).toBe(5)
    })
  })

  describe('distance2D', () => {
    test('should ignore Z coordinate', () => {
      const p1: Point3D = { x: 0, y: 0, z: 100 }
      const p2: Point3D = { x: 3, y: 4, z: 200 }
      expect(distance2D(p1, p2)).toBe(5)
    })

    test('should return 0 for same XY position', () => {
      const p1: Point3D = { x: 5, y: 5, z: 0 }
      const p2: Point3D = { x: 5, y: 5, z: 100 }
      expect(distance2D(p1, p2)).toBe(0)
    })
  })
})

describe('midpoint', () => {
  test('should calculate midpoint correctly', () => {
    const p1: Point3D = { x: 0, y: 0, z: 0 }
    const p2: Point3D = { x: 10, y: 10, z: 10 }
    const result = midpoint(p1, p2)
    expect(result).toEqual({ x: 5, y: 5, z: 5 })
  })

  test('should handle negative coordinates', () => {
    const p1: Point3D = { x: -10, y: -10, z: -10 }
    const p2: Point3D = { x: 10, y: 10, z: 10 }
    const result = midpoint(p1, p2)
    expect(result).toEqual({ x: 0, y: 0, z: 0 })
  })

  test('should return same point for identical inputs', () => {
    const p: Point3D = { x: 5, y: 5, z: 5 }
    const result = midpoint(p, p)
    expect(result).toEqual({ x: 5, y: 5, z: 5 })
  })
})

describe('Projection Functions', () => {
  const p: Point3D = { x: 1, y: 2, z: 3 }

  test('projectToXYPlane should set z to 0', () => {
    expect(projectToXYPlane(p)).toEqual({ x: 1, y: 2, z: 0 })
  })

  test('projectToXZPlane should set y to 0', () => {
    expect(projectToXZPlane(p)).toEqual({ x: 1, y: 0, z: 3 })
  })

  test('projectToYZPlane should set x to 0', () => {
    expect(projectToYZPlane(p)).toEqual({ x: 0, y: 2, z: 3 })
  })
})

describe('centroid', () => {
  test('should return origin for empty array', () => {
    expect(centroid([])).toEqual({ x: 0, y: 0, z: 0 })
  })

  test('should return same point for single point', () => {
    const p: Point3D = { x: 5, y: 5, z: 5 }
    expect(centroid([p])).toEqual(p)
  })

  test('should calculate centroid of multiple points', () => {
    const points: Point3D[] = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 0, y: 10, z: 0 },
      { x: 0, y: 0, z: 10 },
    ]
    const result = centroid(points)
    expect(result.x).toBeCloseTo(2.5)
    expect(result.y).toBeCloseTo(2.5)
    expect(result.z).toBeCloseTo(2.5)
  })
})

describe('angleBetweenSegments', () => {
  test('should return 0 for parallel segments', () => {
    const result = angleBetweenSegments(
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 1, y: 1, z: 0 }
    )
    expect(result).toBeCloseTo(0)
  })

  test('should return 90 for perpendicular segments', () => {
    const result = angleBetweenSegments(
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 }
    )
    expect(result).toBeCloseTo(90)
  })

  test('should return 0 for zero-length first segment', () => {
    const p: Point3D = { x: 0, y: 0, z: 0 }
    const result = angleBetweenSegments(p, p, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })
    expect(result).toBe(0)
  })

  test('should return 0 for zero-length second segment', () => {
    const p: Point3D = { x: 0, y: 0, z: 0 }
    const result = angleBetweenSegments({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, p, p)
    expect(result).toBe(0)
  })
})

describe('pointToLineDistance', () => {
  test('should return 0 for point on line', () => {
    const point: Point3D = { x: 0.5, y: 0, z: 0 }
    const lineStart: Point3D = { x: 0, y: 0, z: 0 }
    const lineEnd: Point3D = { x: 1, y: 0, z: 0 }
    expect(pointToLineDistance(point, lineStart, lineEnd)).toBeCloseTo(0)
  })

  test('should calculate perpendicular distance correctly', () => {
    const point: Point3D = { x: 0.5, y: 1, z: 0 }
    const lineStart: Point3D = { x: 0, y: 0, z: 0 }
    const lineEnd: Point3D = { x: 1, y: 0, z: 0 }
    expect(pointToLineDistance(point, lineStart, lineEnd)).toBeCloseTo(1)
  })

  test('should return distance to start point for zero-length line', () => {
    const point: Point3D = { x: 3, y: 4, z: 0 }
    const linePoint: Point3D = { x: 0, y: 0, z: 0 }
    expect(pointToLineDistance(point, linePoint, linePoint)).toBe(5)
  })

  test('should handle 3D distance calculation', () => {
    const point: Point3D = { x: 0, y: 1, z: 1 }
    const lineStart: Point3D = { x: 0, y: 0, z: 0 }
    const lineEnd: Point3D = { x: 1, y: 0, z: 0 }
    const distance = pointToLineDistance(point, lineStart, lineEnd)
    expect(distance).toBeCloseTo(Math.sqrt(2))
  })
})

describe('calculate2DAngle', () => {
  test('should return 90 for perpendicular 2D vectors', () => {
    const p1: Point3D = { x: 1, y: 0, z: 999 }
    const p2: Point3D = { x: 0, y: 0, z: 999 }
    const p3: Point3D = { x: 0, y: 1, z: 999 }
    expect(calculate2DAngle(p1, p2, p3)).toBeCloseTo(90)
  })

  test('should ignore Z coordinate', () => {
    const p1: Point3D = { x: 1, y: 0, z: 0 }
    const p2: Point3D = { x: 0, y: 0, z: 100 }
    const p3: Point3D = { x: 0, y: 1, z: 200 }
    expect(calculate2DAngle(p1, p2, p3)).toBeCloseTo(90)
  })

  test('should return 0 for zero vectors', () => {
    const p: Point3D = { x: 0, y: 0, z: 0 }
    expect(calculate2DAngle(p, p, p)).toBe(0)
  })

  test('should return 180 for collinear points', () => {
    const p1: Point3D = { x: -1, y: 0, z: 0 }
    const p2: Point3D = { x: 0, y: 0, z: 0 }
    const p3: Point3D = { x: 1, y: 0, z: 0 }
    expect(calculate2DAngle(p1, p2, p3)).toBeCloseTo(180)
  })

  test('should return 0 when first vector is zero', () => {
    const p2: Point3D = { x: 5, y: 5, z: 0 }
    const p3: Point3D = { x: 10, y: 10, z: 0 }
    expect(calculate2DAngle(p2, p2, p3)).toBe(0)
  })

  test('should return 0 when second vector is zero', () => {
    const p1: Point3D = { x: 0, y: 0, z: 0 }
    const p2: Point3D = { x: 5, y: 5, z: 0 }
    expect(calculate2DAngle(p1, p2, p2)).toBe(0)
  })
})

describe('isAngleInRange', () => {
  test('should return true for angle within range', () => {
    expect(isAngleInRange(45, 30, 60)).toBe(true)
  })

  test('should return true for angle at minimum (inclusive)', () => {
    expect(isAngleInRange(30, 30, 60)).toBe(true)
  })

  test('should return true for angle at maximum (inclusive)', () => {
    expect(isAngleInRange(60, 30, 60)).toBe(true)
  })

  test('should return false for angle below range', () => {
    expect(isAngleInRange(29, 30, 60)).toBe(false)
  })

  test('should return false for angle above range', () => {
    expect(isAngleInRange(61, 30, 60)).toBe(false)
  })
})

describe('angleDifference', () => {
  test('should return absolute difference', () => {
    expect(angleDifference(90, 45)).toBe(45)
    expect(angleDifference(45, 90)).toBe(45)
  })

  test('should return 0 for equal angles', () => {
    expect(angleDifference(45, 45)).toBe(0)
  })

  test('should handle negative angles', () => {
    expect(angleDifference(-45, 45)).toBe(90)
  })
})

describe('symmetryScore', () => {
  test('should return 100 for identical angles', () => {
    expect(symmetryScore(90, 90)).toBe(100)
  })

  test('should return 0 for 30+ degree difference', () => {
    expect(symmetryScore(0, 30)).toBe(0)
    expect(symmetryScore(0, 45)).toBe(0)
  })

  test('should return 50 for 15 degree difference', () => {
    expect(symmetryScore(90, 75)).toBe(50)
  })

  test('should be symmetric (order independent)', () => {
    expect(symmetryScore(90, 80)).toBe(symmetryScore(80, 90))
  })

  test('should scale linearly', () => {
    expect(symmetryScore(90, 87)).toBe(90)  // 3 degree diff = 90%
    expect(symmetryScore(90, 84)).toBe(80)  // 6 degree diff = 80%
    expect(symmetryScore(90, 81)).toBe(70)  // 9 degree diff = 70%
  })
})

describe('keypointToPoint3D', () => {
  test('should convert keypoint with z coordinate', () => {
    const keypoint = { x: 1, y: 2, z: 3, score: 0.9 }
    const result = keypointToPoint3D(keypoint)
    expect(result).toEqual({ x: 1, y: 2, z: 3 })
  })

  test('should default z to 0 when missing', () => {
    const keypoint = { x: 1, y: 2, score: 0.9 }
    const result = keypointToPoint3D(keypoint)
    expect(result).toEqual({ x: 1, y: 2, z: 0 })
  })

  test('should handle undefined z', () => {
    const keypoint = { x: 1, y: 2, z: undefined, score: 0.9 }
    const result = keypointToPoint3D(keypoint)
    expect(result).toEqual({ x: 1, y: 2, z: 0 })
  })
})

describe('isValidKeypoint', () => {
  test('should return true for high confidence', () => {
    expect(isValidKeypoint({ score: 0.9 })).toBe(true)
  })

  test('should return true for exactly minimum score', () => {
    expect(isValidKeypoint({ score: 0.5 })).toBe(true)
  })

  test('should return false for low confidence', () => {
    expect(isValidKeypoint({ score: 0.3 })).toBe(false)
  })

  test('should return false for undefined keypoint', () => {
    expect(isValidKeypoint(undefined)).toBe(false)
  })

  test('should use custom minimum score threshold', () => {
    expect(isValidKeypoint({ score: 0.7 }, 0.8)).toBe(false)
    expect(isValidKeypoint({ score: 0.9 }, 0.8)).toBe(true)
  })

  test('should handle missing score (default to 0)', () => {
    expect(isValidKeypoint({})).toBe(false)
  })
})

describe('calculateTorsoRotation', () => {
  test('should return 0 for aligned shoulders and hips', () => {
    const result = calculateTorsoRotation(
      { x: 0, y: 0, z: 0 },   // leftShoulder
      { x: 1, y: 0, z: 0 },   // rightShoulder
      { x: 0, y: 1, z: 0 },   // leftHip
      { x: 1, y: 1, z: 0 }    // rightHip
    )
    expect(result).toBeCloseTo(0)
  })

  test('should return 0 for zero shoulder width', () => {
    const result = calculateTorsoRotation(
      { x: 0.5, y: 0, z: 0 },
      { x: 0.5, y: 0, z: 0 },  // Same as left shoulder
      { x: 0, y: 1, z: 0 },
      { x: 1, y: 1, z: 0 }
    )
    expect(result).toBe(0)
  })

  test('should return 0 for zero hip width', () => {
    const result = calculateTorsoRotation(
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0.5, y: 1, z: 0 },
      { x: 0.5, y: 1, z: 0 }   // Same as left hip
    )
    expect(result).toBe(0)
  })

  test('should detect rotation when shoulders are rotated relative to hips', () => {
    // Shoulders rotated 45 degrees relative to hips in XZ plane
    const result = calculateTorsoRotation(
      { x: 0, y: 0, z: -0.5 },   // leftShoulder forward
      { x: 1, y: 0, z: 0.5 },    // rightShoulder back
      { x: 0, y: 1, z: 0 },      // leftHip centered
      { x: 1, y: 1, z: 0 }       // rightHip centered
    )
    expect(result).toBeGreaterThan(0)
  })

  test('should handle 90 degree rotation', () => {
    const result = calculateTorsoRotation(
      { x: 0.5, y: 0, z: -0.5 },   // leftShoulder
      { x: 0.5, y: 0, z: 0.5 },    // rightShoulder (90 degrees rotated)
      { x: 0, y: 1, z: 0 },        // leftHip
      { x: 1, y: 1, z: 0 }         // rightHip
    )
    expect(result).toBeCloseTo(90)
  })
})
