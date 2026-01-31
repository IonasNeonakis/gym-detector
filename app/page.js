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

    // Using refs for internal logic to avoid stale closures and heavy re-renders/re-initializations
    const internalStateRef = useRef({
        poseState: 'up',
        mode: EXERCISE_MODES.PUSHUPS,
        lastCountTime: 0
    });

    const poseRef = useRef(null);

    // Sync mode from UI to ref
    useEffect(() => {
        internalStateRef.current.mode = mode;
    }, [mode]);

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
            enableSegmentation: false,
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
                const { poseState, mode: currentMode, lastCountTime } = internalStateRef.current;
                let angle = 0;

                if (currentMode === EXERCISE_MODES.PUSHUPS) {
                    const shoulder = landmarks[11];
                    const elbow = landmarks[13];
                    const wrist = landmarks[15];
                    if (shoulder && elbow && wrist) {
                        angle = calculateAngle(shoulder, elbow, wrist);
                    }
                } else if (currentMode === EXERCISE_MODES.SQUATS) {
                    const hip = landmarks[23];
                    const knee = landmarks[25];
                    const ankle = landmarks[27];
                    if (hip && knee && ankle) {
                        angle = calculateAngle(hip, knee, ankle);
                    }
                }

                const newState = getExerciseState(angle, poseState, currentMode);

                if (newState !== poseState) {
                    const now = Date.now();
                    if (newState === 'up' && poseState === 'down') {
                        // Prevent double counting within 500ms
                        if (now - lastCountTime > 500) {
                            setCount(prev => prev + 1);
                            setFeedback('Good rep!');
                            internalStateRef.current.lastCountTime = now;
                        }
                    } else if (newState === 'down') {
                        setFeedback('Push up!');
                    }
                    internalStateRef.current.poseState = newState;
                } else if (poseState === 'up' && angle > 160) {
                    setFeedback(currentMode === EXERCISE_MODES.PUSHUPS ? 'Go lower!' : 'Squat lower!');
                }
            }
            canvasCtx.restore();
        });

        poseRef.current = pose;

        return () => {
            if (poseRef.current) {
                poseRef.current.close();
            }
        };
    }, []); // Run once on mount

    useEffect(() => {
        let isProcessing = false;
        let animationFrameId;

        const processFrame = async () => {
            if (videoRef.current && videoRef.current.readyState >= 2 && poseRef.current && !isProcessing) {
                isProcessing = true;
                try {
                    await poseRef.current.send({ image: videoRef.current });
                } catch (e) {
                    console.error("Pose processing error:", e);
                }
                isProcessing = false;
            }
            animationFrameId = requestAnimationFrame(processFrame);
        };

        processFrame();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [videoRef]);

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
