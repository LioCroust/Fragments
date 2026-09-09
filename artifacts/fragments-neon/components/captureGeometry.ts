export type CapturePoint = { x: number; y: number };

type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type Segment = {
  start: CapturePoint;
  end: CapturePoint;
  horizontal: boolean;
};

type Cell = {
  column: number;
  row: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  area: number;
  claimed: boolean;
  beforeComponent: number;
  component: number;
};

const EPSILON = 1e-5;

const pointInPolygon = (point: CapturePoint, polygon: CapturePoint[]) => {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const intersects = (
      (currentPoint.y > point.y) !== (previousPoint.y > point.y)
      && point.x < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y))
        / (previousPoint.y - currentPoint.y || 1e-9) + currentPoint.x
    );
    if (intersects) inside = !inside;
  }
  return inside;
};

const simplifyPath = (path: CapturePoint[]) => {
  const deduplicated: CapturePoint[] = [];
  path.forEach((point) => {
    const previous = deduplicated[deduplicated.length - 1];
    if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) > EPSILON) {
      deduplicated.push({ ...point });
    }
  });

  const orthogonal: CapturePoint[] = [];
  deduplicated.forEach((point) => {
    const previous = orthogonal[orthogonal.length - 1];
    if (!previous) {
      orthogonal.push({ ...point });
      return;
    }
    const dx = point.x - previous.x;
    const dy = point.y - previous.y;
    const next = Math.abs(dx) >= Math.abs(dy)
      ? { x: point.x, y: previous.y }
      : { x: previous.x, y: point.y };
    if (Math.hypot(next.x - previous.x, next.y - previous.y) > EPSILON) {
      orthogonal.push(next);
    }
  });

  const simplified: CapturePoint[] = [];
  orthogonal.forEach((point) => {
    while (simplified.length >= 2) {
      const first = simplified[simplified.length - 2];
      const second = simplified[simplified.length - 1];
      const sameVertical = Math.abs(first.x - second.x) <= EPSILON
        && Math.abs(second.x - point.x) <= EPSILON;
      const sameHorizontal = Math.abs(first.y - second.y) <= EPSILON
        && Math.abs(second.y - point.y) <= EPSILON;
      if (!sameVertical && !sameHorizontal) break;
      simplified.pop();
    }
    simplified.push({ ...point });
  });
  return simplified;
};

const pathSegments = (path: CapturePoint[]) => {
  const simplified = simplifyPath(path);
  const segments: Segment[] = [];
  for (let index = 1; index < simplified.length; index += 1) {
    const start = simplified[index - 1];
    const end = simplified[index];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (Math.hypot(dx, dy) <= EPSILON) continue;
    const horizontal = Math.abs(dx) >= Math.abs(dy);
    segments.push({ start: { ...start }, end: { ...end }, horizontal });
  }
  return segments;
};

const polygonSegments = (polygon: CapturePoint[]) => {
  const segments: Segment[] = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    if (Math.hypot(end.x - start.x, end.y - start.y) <= EPSILON) continue;
    const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
    if (
      horizontal
        ? Math.abs(end.y - start.y) <= EPSILON
        : Math.abs(end.x - start.x) <= EPSILON
    ) {
      segments.push({ start: { ...start }, end: { ...end }, horizontal });
    }
  }
  return segments;
};

const perimeterSegments = (bounds: Bounds): Segment[] => [
  {
    start: { x: bounds.left, y: bounds.top },
    end: { x: bounds.right, y: bounds.top },
    horizontal: true,
  },
  {
    start: { x: bounds.right, y: bounds.top },
    end: { x: bounds.right, y: bounds.bottom },
    horizontal: false,
  },
  {
    start: { x: bounds.right, y: bounds.bottom },
    end: { x: bounds.left, y: bounds.bottom },
    horizontal: true,
  },
  {
    start: { x: bounds.left, y: bounds.bottom },
    end: { x: bounds.left, y: bounds.top },
    horizontal: false,
  },
];

const closestPointOnSegment = (point: CapturePoint, segment: Segment) => {
  if (segment.horizontal) {
    return {
      x: Math.max(
        Math.min(segment.start.x, segment.end.x),
        Math.min(Math.max(segment.start.x, segment.end.x), point.x),
      ),
      y: segment.start.y,
    };
  }
  return {
    x: segment.start.x,
    y: Math.max(
      Math.min(segment.start.y, segment.end.y),
      Math.min(Math.max(segment.start.y, segment.end.y), point.y),
    ),
  };
};

const snapEndpointToBoundary = (
  point: CapturePoint,
  adjacent: CapturePoint,
  boundaries: Segment[],
  tolerance: number,
) => {
  const horizontalTravel = Math.abs(point.x - adjacent.x) >= Math.abs(point.y - adjacent.y);
  const alignedCandidates = boundaries.flatMap((segment) => {
    if (horizontalTravel && !segment.horizontal) {
      const minY = Math.min(segment.start.y, segment.end.y) - EPSILON;
      const maxY = Math.max(segment.start.y, segment.end.y) + EPSILON;
      if (point.y >= minY && point.y <= maxY && Math.abs(point.x - segment.start.x) <= tolerance) {
        return [{ x: segment.start.x, y: point.y }];
      }
    } else if (!horizontalTravel && segment.horizontal) {
      const minX = Math.min(segment.start.x, segment.end.x) - EPSILON;
      const maxX = Math.max(segment.start.x, segment.end.x) + EPSILON;
      if (point.x >= minX && point.x <= maxX && Math.abs(point.y - segment.start.y) <= tolerance) {
        return [{ x: point.x, y: segment.start.y }];
      }
    }
    return [];
  });

  const nearestAligned = alignedCandidates
    .map((candidate) => ({
      point: candidate,
      distance: Math.hypot(candidate.x - point.x, candidate.y - point.y),
    }))
    .sort((first, second) => first.distance - second.distance)[0];
  if (nearestAligned) return nearestAligned.point;

  const nearest = boundaries
    .map((segment) => {
      const candidate = closestPointOnSegment(point, segment);
      return {
        point: candidate,
        distance: Math.hypot(candidate.x - point.x, candidate.y - point.y),
      };
    })
    .filter((candidate) => candidate.distance <= tolerance)
    .sort((first, second) => first.distance - second.distance)[0];
  return nearest?.point ?? point;
};

const uniqueSorted = (values: number[]) => {
  const sorted = values.slice().sort((first, second) => first - second);
  const unique: number[] = [];
  sorted.forEach((value) => {
    if (unique.length === 0 || Math.abs(value - unique[unique.length - 1]) > EPSILON) {
      unique.push(value);
    }
  });
  return unique;
};

const overlapLength = (firstStart: number, firstEnd: number, secondStart: number, secondEnd: number) => (
  Math.min(Math.max(firstStart, firstEnd), Math.max(secondStart, secondEnd))
  - Math.max(Math.min(firstStart, firstEnd), Math.min(secondStart, secondEnd))
);

const edgeBlocked = (
  horizontal: boolean,
  coordinate: number,
  rangeStart: number,
  rangeEnd: number,
  barriers: Segment[],
) => barriers.some((segment) => {
  if (segment.horizontal !== horizontal) return false;
  const segmentCoordinate = horizontal ? segment.start.y : segment.start.x;
  if (Math.abs(segmentCoordinate - coordinate) > EPSILON) return false;
  const segmentStart = horizontal ? segment.start.x : segment.start.y;
  const segmentEnd = horizontal ? segment.end.x : segment.end.y;
  return overlapLength(rangeStart, rangeEnd, segmentStart, segmentEnd) > EPSILON;
});

const cellsToMergedPolygons = (selectedCells: Cell[]) => {
  const rows = new Map<string, Cell[]>();
  selectedCells.forEach((cell) => {
    const key = `${cell.y1}:${cell.y2}`;
    const row = rows.get(key) ?? [];
    row.push(cell);
    rows.set(key, row);
  });

  const horizontalRects: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  rows.forEach((rowCells) => {
    const sorted = rowCells.slice().sort((first, second) => first.x1 - second.x1);
    let current = {
      x1: sorted[0].x1,
      y1: sorted[0].y1,
      x2: sorted[0].x2,
      y2: sorted[0].y2,
    };
    sorted.slice(1).forEach((cell) => {
      if (Math.abs(cell.x1 - current.x2) <= EPSILON) {
        current.x2 = cell.x2;
      } else {
        horizontalRects.push(current);
        current = { x1: cell.x1, y1: cell.y1, x2: cell.x2, y2: cell.y2 };
      }
    });
    horizontalRects.push(current);
  });

  const merged: typeof horizontalRects = [];
  horizontalRects
    .sort((first, second) => first.y1 - second.y1 || first.x1 - second.x1)
    .forEach((rect) => {
      const previous = merged.find((candidate) => (
        Math.abs(candidate.x1 - rect.x1) <= EPSILON
        && Math.abs(candidate.x2 - rect.x2) <= EPSILON
        && Math.abs(candidate.y2 - rect.y1) <= EPSILON
      ));
      if (previous) previous.y2 = rect.y2;
      else merged.push({ ...rect });
    });

  return merged.map((rect) => [
    { x: rect.x1, y: rect.y1 },
    { x: rect.x2, y: rect.y1 },
    { x: rect.x2, y: rect.y2 },
    { x: rect.x1, y: rect.y2 },
  ]);
};

export const buildOrthogonalCaptureRegions = ({
  trail,
  protectedTrails,
  claimedPolygons,
  bounds,
  contactTolerance,
}: {
  trail: CapturePoint[];
  protectedTrails: CapturePoint[][];
  claimedPolygons: CapturePoint[][];
  bounds: Bounds;
  contactTolerance: number;
}) => {
  if (trail.length < 2) return null;

  const existingBoundaries = [
    ...perimeterSegments(bounds),
    ...protectedTrails.flatMap(pathSegments),
    ...claimedPolygons.flatMap(polygonSegments),
  ];
  const snappedTrail = simplifyPath(trail);
  if (snappedTrail.length < 2) return null;
  const originalStart = snappedTrail[0];
  const snappedStart = snapEndpointToBoundary(
    snappedTrail[0],
    snappedTrail[1],
    existingBoundaries,
    contactTolerance,
  );
  if (
    Math.abs(snappedStart.x - snappedTrail[1].x) > EPSILON
    && Math.abs(snappedStart.y - snappedTrail[1].y) > EPSILON
  ) {
    const horizontalTravel = Math.abs(snappedTrail[1].x - originalStart.x)
      >= Math.abs(snappedTrail[1].y - originalStart.y);
    const connector = horizontalTravel
      ? { x: snappedStart.x, y: originalStart.y }
      : { x: originalStart.x, y: snappedStart.y };
    snappedTrail.splice(0, 1, snappedStart, connector);
  } else {
    snappedTrail[0] = snappedStart;
  }
  const selfContactBoundaries = pathSegments(snappedTrail).slice(0, -2);
  const lastIndex = snappedTrail.length - 1;
  const originalEnd = snappedTrail[lastIndex];
  const snappedEnd = snapEndpointToBoundary(
    originalEnd,
    snappedTrail[lastIndex - 1],
    [...existingBoundaries, ...selfContactBoundaries],
    contactTolerance,
  );
  if (
    Math.abs(snappedEnd.x - snappedTrail[lastIndex - 1].x) > EPSILON
    && Math.abs(snappedEnd.y - snappedTrail[lastIndex - 1].y) > EPSILON
  ) {
    const horizontalTravel = Math.abs(originalEnd.x - snappedTrail[lastIndex - 1].x)
      >= Math.abs(originalEnd.y - snappedTrail[lastIndex - 1].y);
    const connector = horizontalTravel
      ? { x: snappedEnd.x, y: originalEnd.y }
      : { x: originalEnd.x, y: snappedEnd.y };
    snappedTrail.splice(lastIndex, 1, connector, snappedEnd);
  } else {
    snappedTrail[lastIndex] = snappedEnd;
  }
  const canonicalTrail = simplifyPath(snappedTrail);
  const newSegments = pathSegments(canonicalTrail);
  if (newSegments.length === 0) return null;

  const barriers = [
    ...perimeterSegments(bounds),
    ...protectedTrails.flatMap(pathSegments),
    ...claimedPolygons.flatMap(polygonSegments),
    ...newSegments,
  ];
  const xCoordinates = uniqueSorted([
    bounds.left,
    bounds.right,
    ...barriers.flatMap((segment) => [segment.start.x, segment.end.x]),
    ...claimedPolygons.flatMap((polygon) => polygon.map((point) => point.x)),
  ].filter((value) => value >= bounds.left - EPSILON && value <= bounds.right + EPSILON));
  const yCoordinates = uniqueSorted([
    bounds.top,
    bounds.bottom,
    ...barriers.flatMap((segment) => [segment.start.y, segment.end.y]),
    ...claimedPolygons.flatMap((polygon) => polygon.map((point) => point.y)),
  ].filter((value) => value >= bounds.top - EPSILON && value <= bounds.bottom + EPSILON));

  const cells: Cell[] = [];
  const cellByCoordinate = new Map<string, Cell>();
  for (let row = 0; row < yCoordinates.length - 1; row += 1) {
    for (let column = 0; column < xCoordinates.length - 1; column += 1) {
      const x1 = xCoordinates[column];
      const x2 = xCoordinates[column + 1];
      const y1 = yCoordinates[row];
      const y2 = yCoordinates[row + 1];
      if (x2 - x1 <= EPSILON || y2 - y1 <= EPSILON) continue;
      const center = { x: (x1 + x2) * 0.5, y: (y1 + y2) * 0.5 };
      const cell: Cell = {
        column,
        row,
        x1,
        y1,
        x2,
        y2,
        area: (x2 - x1) * (y2 - y1),
        claimed: claimedPolygons.some((polygon) => pointInPolygon(center, polygon)),
        beforeComponent: -1,
        component: -1,
      };
      cells.push(cell);
      cellByCoordinate.set(`${column}:${row}`, cell);
    }
  }

  const labelComponents = (
    componentKey: 'beforeComponent' | 'component',
    passBarriers: Segment[],
  ) => {
    const componentAreas: number[] = [];
    let componentCount = 0;
    cells.forEach((cell) => {
      cell[componentKey] = -1;
    });
    cells.forEach((root) => {
      if (root.claimed || root[componentKey] >= 0) return;
      const queue = [root];
      root[componentKey] = componentCount;
      let area = 0;
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const cell = queue[cursor];
        area += cell.area;
        const neighbors = [
          {
            cell: cellByCoordinate.get(`${cell.column - 1}:${cell.row}`),
            blocked: edgeBlocked(false, cell.x1, cell.y1, cell.y2, passBarriers),
          },
          {
            cell: cellByCoordinate.get(`${cell.column + 1}:${cell.row}`),
            blocked: edgeBlocked(false, cell.x2, cell.y1, cell.y2, passBarriers),
          },
          {
            cell: cellByCoordinate.get(`${cell.column}:${cell.row - 1}`),
            blocked: edgeBlocked(true, cell.y1, cell.x1, cell.x2, passBarriers),
          },
          {
            cell: cellByCoordinate.get(`${cell.column}:${cell.row + 1}`),
            blocked: edgeBlocked(true, cell.y2, cell.x1, cell.x2, passBarriers),
          },
        ];
        neighbors.forEach(({ cell: neighbor, blocked }) => {
          if (!neighbor || blocked || neighbor.claimed || neighbor[componentKey] >= 0) return;
          neighbor[componentKey] = componentCount;
          queue.push(neighbor);
        });
      }
      componentAreas.push(area);
      componentCount += 1;
    });
    return componentAreas;
  };

  labelComponents('beforeComponent', existingBoundaries);
  const componentAreas = labelComponents('component', barriers);
  const postComponentsByParent = new Map<number, Set<number>>();
  cells.forEach((cell) => {
    if (cell.claimed || cell.component < 0 || cell.beforeComponent < 0) return;
    const touchesNewTrail = (
      edgeBlocked(false, cell.x1, cell.y1, cell.y2, newSegments)
      || edgeBlocked(false, cell.x2, cell.y1, cell.y2, newSegments)
      || edgeBlocked(true, cell.y1, cell.x1, cell.x2, newSegments)
      || edgeBlocked(true, cell.y2, cell.x1, cell.x2, newSegments)
    );
    if (!touchesNewTrail) return;
    const postComponents = postComponentsByParent.get(cell.beforeComponent) ?? new Set<number>();
    postComponents.add(cell.component);
    postComponentsByParent.set(cell.beforeComponent, postComponents);
  });

  const newlySeparatedComponents = new Set<number>();
  postComponentsByParent.forEach((postComponents) => {
    if (postComponents.size < 2) return;
    postComponents.forEach((component) => newlySeparatedComponents.add(component));
  });
  if (newlySeparatedComponents.size < 2) return null;
  const selectedComponent = [...newlySeparatedComponents]
    .sort((first, second) => (
      componentAreas[first] - componentAreas[second] || first - second
    ))[0];
  if (selectedComponent === undefined) return null;

  const selectedCells = cells.filter((cell) => cell.component === selectedComponent);
  return {
    regions: cellsToMergedPolygons(selectedCells),
    area: componentAreas[selectedComponent],
    protectedTrail: canonicalTrail,
  };
};