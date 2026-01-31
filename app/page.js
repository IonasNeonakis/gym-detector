'use strict';

'use client';

import { useEffect, useRef, useState } from 'react';
import { useCamera } from './hooks/useCamera';
import { EXERCISE_MODES, calculateAngle, getExerciseState } from './utils/exerciseLogic';
import { Pose } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS } from '@mediapipe/pose';

export default function Home() {
    const { videoRef, stream, error: cameraError } = useCamera();
    const canvasRef = useRef(null);
    const [mode, setMode] = useState(EXERCISE_MODES.PUSHUPS);
    const [count, setCount] = useState(0);
    const [feedback, setFeedback] = useState('Position yourself');
    const [poseState, setPoseState] = useState('up');

    const poseRef = useRef(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            },
        });

        pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });

        pose.onResults((results) => {
            if (!canvasRef.current || !videoRef.current) return;

            const canvasCtx = canvasRef.current.getContext('2d');
            canvasCtx.save();
            canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            // Mirror drawings
            canvasCtx.translate(canvasRef.current.width, 0);
            canvasCtx.scale(-1, 1);

            if (results.poseLandmarks) {
                // Draw landmarks
                drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
                    color: '#00FF00',
                    lineWidth: 4,
                });
                drawLandmarks(canvasCtx, results.poseLandmarks, {
                    color: '#FF0000',
                    lineWidth: 2,
                });

                // Exercise Logic
                const landmarks = results.poseLandmarks;
                let angle = 0;

                if (mode === EXERCISE_MODES.PUSHUPS) {
                    // Shoulder (11), Elbow (13), Wrist (15) - using left side for logic
                    const shoulder = landmarks[11];
                    const elbow = landmarks[13];
                    const wrist = landmarks[15];

                    if (shoulder && elbow && wrist) {
                        angle = calculateAngle(shoulder, elbow, wrist);
                    }
                } else if (mode === EXERCISE_MODES.SQUATS) {
                    // Hip (23), Knee (25), Ankle (27) - using left side
                    const hip = landmarks[23];
                    const knee = landmarks[25];
                    const ankle = landmarks[27];

                    if (hip && knee && ankle) {
                        angle = calculateAngle(hip, knee, ankle);
                    }
                }

                const newState = getExerciseState(angle, poseState, mode);

                if (newState !== poseState) {
                    if (newState === 'up' && poseState === 'down') {
                        setCount(prev => prev + 1);
                        setFeedback('Good rep!');
                    } else if (newState === 'down') {
                        setFeedback('Push up!');
                    }
                    setPoseState(newState);
                } else if (poseState === 'up' && angle > 160) {
                    setFeedback(mode === EXERCISE_MODES.PUSHUPS ? 'Go lower!' : 'Squat lower!');
                }
            }
            canvasCtx.restore();
        });

        poseRef.current = pose;

        return () => {
            pose.close();
        };
    }, [mode, poseState]);

    useEffect(() => {
        if (videoRef.current && poseRef.current) {
            let animationFrameId;

            const processFrame = async () => {
                if (videoRef.current && videoRef.current.readyState >= 2) {
                    await poseRef.current.send({ image: videoRef.current });
                }
                animationFrameId = requestAnimationFrame(processFrame);
            };

            processFrame();

            return () => {
                cancelAnimationFrame(animationFrameId);
            };
        }
    }, [videoRef.current]);

    if (cameraError) {
        return (
            <div className="container">
                <div className="error">
                    <h2>Camera Error</h2>
                    <p>{cameraError.message}</p>
                </div>
            </div>
        );
    }

    return (
        <main className="container">
            <div className="videoContainer">
                <video
                    ref={videoRef}
                    className="video"
                    autoPlay
                    playsInline
                    muted
                />
                <canvas
                    ref={canvasRef}
                    className="canvas"
                    width={typeof window !== 'undefined' ? window.innerWidth : 1280}
                    height={typeof window !== 'undefined' ? window.innerHeight : 720}
                />
            </div>

            <div className="overlay">
                <div className="topControls">
                    <select
                        className="selector"
                        value={mode}
                        onChange={(e) => {
                            setMode(e.target.value);
                            setCount(0);
                            setFeedback('Position yourself');
                        }}
                    >
                        <option value={EXERCISE_MODES.PUSHUPS}>Pushups</option>
                        <option value={EXERCISE_MODES.SQUATS}>Squats</option>
                    </select>
                </div>

                <div className="stats">
                    <h1 className="counter">{count}</h1>
                    <p className="feedback">{feedback}</p>
                </div>
            </div>
        </main>
    );
}
