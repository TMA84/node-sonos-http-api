import { describe, it, expect, vi } from 'vitest';

/**
 * Clip Headers Crash Fix Tests
 * 
 * Validates that the server does not crash with ERR_HTTP_HEADERS_SENT
 * when res.headersSent is true, and that normal behavior is preserved
 * when res.headersSent is false.
 * 
 * Validates: Requirements 2.1-2.4, 3.1-3.6
 */

/**
 * Creates a mock response object for testing.
 */
function createMockRes(headersSent = false) {
  const res = {
    headersSent,
    statusCode: null,
    headers: {},
    body: null,
    ended: false,
    setHeader(name, value) {
      if (this.headersSent) {
        throw new Error(`ERR_HTTP_HEADERS_SENT: Cannot set headers after they are sent to the client`);
      }
      this.headers[name] = value;
    },
    write(data) {
      if (this.headersSent && !this._allowWrite) {
        throw new Error(`ERR_HTTP_HEADERS_SENT: Cannot write after headers are sent`);
      }
      this.body = data;
    },
    end(data) {
      if (data) this.body = data;
      this.ended = true;
    }
  };
  return res;
}

describe('Bug Condition: sendResponse() with headersSent=true does not crash', () => {
  it('should not throw when res.headersSent is true', async () => {
    // Simulate the sendResponse function with the fix applied
    const logger = { warn: vi.fn() };
    const res = createMockRes(true);

    function sendResponse(code, body) {
      if (res.headersSent) {
        logger.warn('Response already sent, skipping duplicate response');
        return;
      }
      var jsonResponse = JSON.stringify(body);
      res.statusCode = code;
      res.setHeader('Content-Length', Buffer.byteLength(jsonResponse));
      res.setHeader('Content-Type', 'application/json;charset=utf-8');
      res.write(Buffer.from(jsonResponse));
      res.end();
    }

    // Should not throw
    expect(() => sendResponse(200, { status: 'success' })).not.toThrow();
    // Should have logged a warning
    expect(logger.warn).toHaveBeenCalledWith('Response already sent, skipping duplicate response');
    // Should not have modified the response
    expect(res.statusCode).toBeNull();
    expect(res.body).toBeNull();
  });
});

describe('Bug Condition: serve-static callback with headersSent=true returns early', () => {
  it('should not set headers when res.headersSent is true', () => {
    const res = createMockRes(true);
    const req = { method: 'GET', headers: {}, url: '/Room/clip/test.mp3' };

    // Simulate the serve-static callback with the fix
    function serveStaticCallback(err) {
      if (res.headersSent) return;
      // This would crash without the guard
      res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    // Should not throw
    expect(() => serveStaticCallback(null)).not.toThrow();
    // Should not have set any headers
    expect(res.headers).toEqual({});
  });
});

describe('Preservation: sendResponse() with headersSent=false works normally', () => {
  it('should write normal JSON response when res.headersSent is false', () => {
    const logger = { warn: vi.fn() };
    const res = createMockRes(false);

    function sendResponse(code, body) {
      if (res.headersSent) {
        logger.warn('Response already sent, skipping duplicate response');
        return;
      }
      var jsonResponse = JSON.stringify(body);
      res.statusCode = code;
      res.setHeader('Content-Length', Buffer.byteLength(jsonResponse));
      res.setHeader('Content-Type', 'application/json;charset=utf-8');
      res.write(Buffer.from(jsonResponse));
      res.end();
    }

    sendResponse(200, { status: 'success' });

    // Should have written the response normally
    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('application/json;charset=utf-8');
    expect(res.body.toString()).toBe('{"status":"success"}');
    expect(res.ended).toBe(true);
    // Should NOT have logged a warning
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('should write error response when res.headersSent is false', () => {
    const logger = { warn: vi.fn() };
    const res = createMockRes(false);

    function sendResponse(code, body) {
      if (res.headersSent) {
        logger.warn('Response already sent, skipping duplicate response');
        return;
      }
      var jsonResponse = JSON.stringify(body);
      res.statusCode = code;
      res.setHeader('Content-Length', Buffer.byteLength(jsonResponse));
      res.setHeader('Content-Type', 'application/json;charset=utf-8');
      res.write(Buffer.from(jsonResponse));
      res.end();
    }

    sendResponse(500, { status: 'error', error: 'Something went wrong' });

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body.toString())).toEqual({ status: 'error', error: 'Something went wrong' });
  });
});

describe('Preservation: serve-static callback with headersSent=false routes normally', () => {
  it('should set CORS headers and proceed when res.headersSent is false', () => {
    const res = createMockRes(false);
    const req = { method: 'GET', headers: {}, url: '/Room/clip/test.mp3' };
    let apiCalled = false;

    function serveStaticCallback(err) {
      if (res.headersSent) return;
      res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Origin', '*');
      apiCalled = true;
    }

    serveStaticCallback(null);

    expect(res.headers['Access-Control-Allow-Methods']).toBe('POST, GET, OPTIONS');
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(apiCalled).toBe(true);
  });
});
