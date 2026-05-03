// Feature: webpage-modernization, Property 3: OpenAPI spec parameters are fully documented
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';

/**
 * Validates: Requirements 6.4
 *
 * For any endpoint in the OpenAPI specification that declares parameters,
 * each parameter SHALL have a non-empty `description` field, a `schema`
 * with a defined `type`, and an `example` value.
 */

interface OpenAPIParameter {
  name: string;
  in: string;
  description?: string;
  schema?: { type?: string };
  example?: unknown;
}

interface OpenAPIOperation {
  parameters?: OpenAPIParameter[];
  [key: string]: unknown;
}

interface OpenAPIPathItem {
  [method: string]: OpenAPIOperation;
}

interface OpenAPISpec {
  paths: Record<string, OpenAPIPathItem>;
  [key: string]: unknown;
}

interface ParameterContext {
  path: string;
  method: string;
  parameter: OpenAPIParameter;
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

/**
 * Extract all parameters from the OpenAPI spec with their endpoint context.
 */
function extractAllParameters(spec: OpenAPISpec): ParameterContext[] {
  const params: ParameterContext[] = [];

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.includes(method)) continue;
      if (!operation.parameters) continue;

      for (const param of operation.parameters) {
        params.push({ path, method, parameter: param });
      }
    }
  }

  return params;
}

describe('OpenAPI Spec Parameters Are Fully Documented (Property 3)', () => {
  const specPath = resolve(process.cwd(), 'static/docs/openapi.yaml');
  const specContent = readFileSync(specPath, 'utf-8');
  const spec = yaml.load(specContent) as OpenAPISpec;
  const allParameters = extractAllParameters(spec);

  it('OpenAPI spec contains parameters to test', () => {
    expect(allParameters.length).toBeGreaterThan(0);
  });

  it('every parameter has a non-empty description, schema.type, and example', () => {
    const paramArb = fc.constantFrom(...allParameters);

    fc.assert(
      fc.property(paramArb, (ctx: ParameterContext) => {
        const { path, method, parameter } = ctx;
        const location = `${method.toUpperCase()} ${path} — parameter "${parameter.name}"`;

        // Check non-empty description
        expect(
          parameter.description && parameter.description.trim().length > 0,
          `${location} must have a non-empty description`
        ).toBe(true);

        // Check schema.type is defined
        expect(
          parameter.schema && parameter.schema.type && parameter.schema.type.trim().length > 0,
          `${location} must have a schema with a defined type`
        ).toBe(true);

        // Check example is present (can be on the parameter itself or in the schema)
        const hasExample = parameter.example !== undefined && parameter.example !== null;
        expect(
          hasExample,
          `${location} must have an example value`
        ).toBe(true);
      }),
      { numRuns: Math.max(100, allParameters.length * 5) }
    );
  });
});
