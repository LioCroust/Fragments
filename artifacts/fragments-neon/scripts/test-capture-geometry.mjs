import assert from 'node:assert/strict';
import {
  buildOrthogonalCaptureRegions,
  captureRegionsOverlapCircle,
} from '../components/captureGeometry.ts';

const bounds = { left: 0, top: 0, right: 100, bottom: 100 };
const run = (trail, protectedTrails = [], claimedPolygons = []) => (
  buildOrthogonalCaptureRegions({
    trail,
    protectedTrails,
    claimedPolygons,
    bounds,
    contactTolerance: 3,
  })
);

const polygonArea = (polygon) => Math.abs(polygon.reduce((sum, point, index) => {
  const next = polygon[(index + 1) % polygon.length];
  return sum + point.x * next.y - next.x * point.y;
}, 0) * 0.5);

const assertOrthogonal = (regions) => regions.forEach((polygon) => polygon.forEach((point, index) => {
  const next = polygon[(index + 1) % polygon.length];
  assert.ok(
    Math.abs(point.x - next.x) < 1e-6 || Math.abs(point.y - next.y) < 1e-6,
    `Unexpected diagonal: ${JSON.stringify(point)} -> ${JSON.stringify(next)}`,
  );
}));

const assertOrthogonalPath = (path) => path.slice(1).forEach((point, index) => {
  const previous = path[index];
  assert.ok(
    Math.abs(previous.x - point.x) < 1e-6 || Math.abs(previous.y - point.y) < 1e-6,
    `Unexpected path diagonal: ${JSON.stringify(previous)} -> ${JSON.stringify(point)}`,
  );
});

const firstCapture = run([{ x: 30, y: 100 }, { x: 30, y: 0 }]);
assert.ok(firstCapture);
assert.equal(firstCapture.area, 3000);
assert.equal(firstCapture.regions.reduce((sum, polygon) => sum + polygonArea(polygon), 0), 3000);
assertOrthogonal(firstCapture.regions);

const secondCapture = run(
  [{ x: 30.8, y: 50 }, { x: 60, y: 50 }, { x: 60, y: 100 }],
  [firstCapture.protectedTrail],
  firstCapture.regions,
);
assert.ok(secondCapture);
assert.equal(secondCapture.area, 1500);
assert.equal(secondCapture.protectedTrail[0].x, 30);
assert.equal(secondCapture.regions.reduce((sum, polygon) => sum + polygonArea(polygon), 0), 1500);
assertOrthogonal(secondCapture.regions);

const thirdCapture = run(
  [{ x: 60, y: 50 }, { x: 80, y: 50 }, { x: 80, y: 100 }],
  [firstCapture.protectedTrail, secondCapture.protectedTrail],
  [...firstCapture.regions, ...secondCapture.regions],
);
assert.ok(thirdCapture);
assert.equal(thirdCapture.area, 1000);
assertOrthogonal(thirdCapture.regions);

const bottomCapture = run([{ x: 0, y: 70 }, { x: 100, y: 70 }]);
assert.ok(bottomCapture);
assert.equal(bottomCapture.area, 3000);
const photoRegression = run(
  [{ x: 0, y: 20 }, { x: 20, y: 20 }, { x: 20, y: 70.8 }],
  [bottomCapture.protectedTrail],
  bottomCapture.regions,
);
assert.ok(photoRegression);
assert.equal(photoRegression.area, 1000);
assert.equal(photoRegression.protectedTrail.at(-1).y, 70);
assertOrthogonal(photoRegression.regions);

const cornerFirstCapture = run([
  { x: 0, y: 50 },
  { x: 30, y: 50 },
  { x: 30, y: 0 },
]);
assert.ok(cornerFirstCapture);
assert.equal(cornerFirstCapture.area, 1500);
const cornerContactCapture = run(
  [{ x: 100, y: 51 }, { x: 30.5, y: 51 }],
  [cornerFirstCapture.protectedTrail],
  cornerFirstCapture.regions,
);
assert.ok(cornerContactCapture);
assert.equal(cornerContactCapture.area, 3570);
assert.deepEqual(cornerContactCapture.protectedTrail.at(-1), { x: 30, y: 50 });
assertOrthogonal(cornerContactCapture.regions);
assertOrthogonalPath(cornerContactCapture.protectedTrail);

const perpendicularCornerContact = run(
  [{ x: 100, y: 51.34 }, { x: 29.9, y: 51.34 }],
  [cornerFirstCapture.protectedTrail],
  cornerFirstCapture.regions,
);
assert.ok(perpendicularCornerContact);
assert.ok(perpendicularCornerContact.area < 4250);
assert.deepEqual(perpendicularCornerContact.protectedTrail.at(-1), { x: 29.9, y: 50 });
assertOrthogonal(perpendicularCornerContact.regions);
assertOrthogonalPath(perpendicularCornerContact.protectedTrail);

const selfClosedCapture = run([
  { x: 50, y: 100 },
  { x: 50, y: 30 },
  { x: 80, y: 30 },
  { x: 80, y: 70 },
  { x: 50, y: 70 },
]);
assert.ok(selfClosedCapture);
assert.equal(selfClosedCapture.area, 1200);
assertOrthogonal(selfClosedCapture.regions);

const tolerantSelfClosedCapture = run([
  { x: 50, y: 100 },
  { x: 50, y: 30 },
  { x: 80, y: 30 },
  { x: 80, y: 70 },
  { x: 52, y: 70 },
]);
assert.ok(tolerantSelfClosedCapture);
assert.equal(tolerantSelfClosedCapture.area, 1200);
assert.equal(tolerantSelfClosedCapture.protectedTrail.at(-1).x, 50);
assertOrthogonal(tolerantSelfClosedCapture.regions);
assertOrthogonalPath(tolerantSelfClosedCapture.protectedTrail);

assert.equal(run([{ x: 40, y: 100 }, { x: 40, y: 60 }]), null);

assert.equal(
  run(
    [{ x: 30, y: 100 }, { x: 30, y: 0 }],
    [[{ x: 30, y: 100 }, { x: 30, y: 0 }]],
  ),
  null,
);

const tinyCapture = run([{ x: 0.001, y: 100 }, { x: 0.001, y: 0 }]);
assert.ok(tinyCapture);
assert.equal(tinyCapture.area, 0.1);
assertOrthogonal(tinyCapture.regions);

const diamondCaptureRegion = [[
  { x: 0, y: 60 },
  { x: 30, y: 60 },
  { x: 30, y: 100 },
  { x: 0, y: 100 },
]];
assert.equal(captureRegionsOverlapCircle({ x: 15, y: 75 }, 5, diamondCaptureRegion), true);
assert.equal(captureRegionsOverlapCircle({ x: 34.9, y: 75 }, 5, diamondCaptureRegion), true);
assert.equal(captureRegionsOverlapCircle({ x: 35.1, y: 75 }, 5, diamondCaptureRegion), false);

console.log('Capture geometry regression tests passed.');