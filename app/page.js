'use strict';

'use client';

import { useEffect, useRef, useState } from 'react';
import { useCamera } from './hooks/useCamera';
import { EXERCISE_MODES, calculateAngle, getExerciseState } from './utils/exerciseLogic';
import { Pose } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS } from '@mediapipe/pose';
import confetti from 'canvas-confetti';

export default function Home() {
    const { videoRef, stream, error: cameraError } = useCamera();
    const canvasRef = useRef(null);
    const [mode, setMode] = useState(EXERCISE_MODES.PUSHUPS);
    const [count, setCount] = useState(0);
    const [feedback, setFeedback] = useState('Position yourself');
    const [isRewarding, setIsRewarding] = useState(false);

    // Using refs for internal logic to avoid stale closures and heavy re-renders/re-initializations
    const internalStateRef = useRef({
        poseState: 'up',
        mode: EXERCISE_MODES.PUSHUPS,
        lastCountTime: 0
    });

    const poseRef = useRef(null);
    const audioCtxRef = useRef(null);

    // Initialize Audio Context on first interaction or mount
    const initAudio = () => {
        if (!audioCtxRef.current && typeof window !== 'undefined') {
            audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
    };

    const playDingSound = () => {
        initAudio();
        const ctx = audioCtxRef.current;
        if (!ctx) return;

        if (ctx.state === 'suspended') ctx.resume();

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc1.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(440, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.3);
        osc2.stop(ctx.currentTime + 0.3);
    };

    // Sync mode from UI to ref
    useEffect(() => {
        internalStateRef.current.mode = mode;
    }, [mode]);

    const handleReset = () => {
        initAudio(); // Also init on reset to ensure context is ready
        setCount(0);
        setFeedback('Position yourself');
        internalStateRef.current.poseState = 'up';
        internalStateRef.current.lastCountTime = 0;
    };

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
                    color: '#39ff14',
                    lineWidth: 4,
                });
                drawLandmarks(canvasCtx, results.poseLandmarks, {
                    color: '#ffffff',
                    lineWidth: 1,
                    radius: 3
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
                        // Prevent double counting within 800ms
                        if (now - lastCountTime > 800) {
                            setCount(prev => prev + 1);
                            setFeedback('Perfect Form!');
                            setIsRewarding(true);
                            playDingSound();
                            confetti({
                                particleCount: 100,
                                spread: 70,
                                origin: { y: 0.6 },
                                colors: ['#39ff14', '#00f2ff', '#ffffff']
                            });
                            setTimeout(() => setIsRewarding(false), 800);
                            internalStateRef.current.lastCountTime = now;
                        }
                    } else if (newState === 'down') {
                        setFeedback('Drive Up!');
                    }
                    internalStateRef.current.poseState = newState;
                } else if (poseState === 'up' && angle > 160) {
                    setFeedback(currentMode === EXERCISE_MODES.PUSHUPS ? 'Lower chest' : 'Hips lower');
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
            <div className="container" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <div className="error">
                    <h2>Camera Error</h2>
                    <p style={{ opacity: 0.7, marginTop: '0.5rem' }}>{cameraError.message}</p>
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

                    <button className="resetBtn" onClick={handleReset}>
                        RESET
                    </button>
                </div>

                <div className="stats" style={{ borderColor: isRewarding ? 'var(--neon-green)' : 'rgba(255,255,255,0.1)' }}>
                    <h1 className={`counter ${isRewarding ? 'counterPop' : ''}`}>
                        {count}
                    </h1>
                    <p className={`feedback ${isRewarding ? 'reward' : ''}`}>
                        {feedback}
                    </p>
                </div>
            </div>
        </main>
    );
}
