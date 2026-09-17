import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import worker from '../src';

describe('Transport for Rory', () => {
	describe('Frontend', () => {
		// TODO
		it('Dummy test', () => {
			expect(true).toBe(true);
		});
	});
});
