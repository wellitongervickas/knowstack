/**
 * Vitest global setup - runs before all tests.
 *
 * Silences NestJS Logger during tests to keep output clean.
 * Set to ['error'] to see only errors, or false to silence completely.
 */
import { Logger } from '@nestjs/common';

// Disable all NestJS logging during tests for clean output
Logger.overrideLogger(false);
