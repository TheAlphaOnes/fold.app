const height = 1000;
const ITEM_HEIGHT = 200;
const RADIUS = height * 0.4; // 400

const distance = 1000;
const angle = distance / RADIUS; // 2.5 rad
let clampedAngle = angle;
if (clampedAngle > Math.PI/2) clampedAngle = Math.PI/2;
if (clampedAngle < -Math.PI/2) clampedAngle = -Math.PI/2;

const translateZ = Math.cos(clampedAngle) * RADIUS - RADIUS;
const targetYOffset = Math.sin(clampedAngle) * RADIUS;
const translateY = targetYOffset - distance;

console.log({ distance, angle, clampedAngle, translateZ, targetYOffset, translateY });
