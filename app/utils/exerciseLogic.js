'use strict';

/**
 * Calculates the angle between three points.
 * @param {Object} a First point {x, y}
 * @param {Object} b Mid point {x, y} (the joint)
 * @param {Object} c Third point {x, y}
 * @returns {number} Angle in degrees
 */
export function calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) {
        angle = 360 - angle;
    }
    return angle;
}

export const EXERCISE_MODES = {
    PUSHUPS: 'Pushups',
    SQUATS: 'Squats'
};

export function getExerciseState(angle, currentState, mode) {
    if (angle < 90) {
        return 'down';
    }
    if (angle > 160 && currentState === 'down') {
        return 'up';
    }
    return currentState;
}

/**
 * Checks if the user is in a T-Pose.
 * @param {Array} landmarks MediaPipe landmarks 
 * @returns {boolean}
 */
export function isTPose(landmarks) {
    if (!landmarks) return false;

    // Left arm
    const lShoulder = landmarks[11];
    const lElbow = landmarks[13];
    const lWrist = landmarks[15];

    // Right arm
    const rShoulder = landmarks[12];
    const rElbow = landmarks[14];
    const rWrist = landmarks[16];

    if (!lShoulder || !lElbow || !lWrist || !rShoulder || !rElbow || !rWrist) return false;

    // Check if arms are extended (nearly straight)
    const lArmAngle = calculateAngle(lShoulder, lElbow, lWrist);
    const rArmAngle = calculateAngle(rShoulder, rElbow, rWrist);

    // Check if wrists are at roughly the same height as shoulders (horizontal)
    const lWristHeightDiff = Math.abs(lWrist.y - lShoulder.y);
    const rWristHeightDiff = Math.abs(rWrist.y - rShoulder.y);

    // Thresholds: arms straight (>150deg) and wrists within 15% of vertical range from shoulder
    const isStraight = lArmAngle > 150 && rArmAngle > 150;
    const isHorizontal = lWristHeightDiff < 0.1 && rWristHeightDiff < 0.1;

    return isStraight && isHorizontal;
}
