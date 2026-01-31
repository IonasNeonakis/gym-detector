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
    // Logic from AGENT.md:
    // "down" when elbow angle < 90°
    // "up" when elbow angle > 160°
    // Same thresholds for squats (knee angle)

    if (angle < 90) {
        return 'down';
    }
    if (angle > 160 && currentState === 'down') {
        return 'up';
    }
    return currentState;
}
