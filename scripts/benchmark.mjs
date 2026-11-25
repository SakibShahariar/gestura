#!/usr/bin/env node
// Micro-benchmark for the pure gesture-recognition hot path.
// Not a GJS-in-Shell measurement; it guards against gross JS regressions.

import {performance} from 'node:perf_hooks';

import {GestureRecognizer, GesturePhase} from '../gestureRecognizer.js';

const WARMUP = 100_000;
const EVENTS = 1_000_000;
const RUNS = 3;
const LIMIT_US = 2.0; // generous: measured locally at ~0.2 µs/event

const event = {
    phase: GesturePhase.UPDATE,
    fingerCount: 4,
    dx: 0.3,
    dy: -0.4,
    time: 1,
};

function measure(recognizer) {
    const start = performance.now();
    for (let i = 0; i < EVENTS; i++)
        recognizer.handleEvent(event);
    return (performance.now() - start) * 1000 / EVENTS;
}

const recognizer = new GestureRecognizer();
for (let i = 0; i < WARMUP; i++)
    recognizer.handleEvent(event);

const samples = [];
for (let i = 0; i < RUNS; i++) {
    recognizer.reset();
    samples.push(measure(recognizer));
}
samples.sort((a, b) => a - b);
const median = samples[Math.floor(RUNS / 2)];

console.log(`gestureRecognizer: ${median.toFixed(4)} µs/event ` +
    `(${(1e6 / median / 1e6).toFixed(1)}M events/s) ` +
    `[min ${samples[0].toFixed(4)}, max ${samples.at(-1).toFixed(4)}]`);

if (!Number.isFinite(median) || median > LIMIT_US) {
    console.error(`performance regression: ${median.toFixed(4)} µs/event > ${LIMIT_US} µs/event`);
    process.exit(1);
}
