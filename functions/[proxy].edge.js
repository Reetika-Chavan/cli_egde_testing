const PROTECTED_DOMAIN = "localhost";
const PROTECTED_PORT = "8787";
const UNPROTECTED_DOMAIN = "test-unprotected-domain.devcontentstackapps.com";

function isProtectedHost(hostname, port) {
  if (hostname === PROTECTED_DOMAIN && port === PROTECTED_PORT) return true;
  return hostname.includes("devcontentstackapps.com");
}

export default async function handler(request, context) {
  const url = new URL(request.url);
  const hostname = url.hostname;
  console.log("hostname:", hostname);

  if (isProtectedHost(hostname, url.port)) {
    console.log("protected domain");
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return new Response("Authentication Required", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Protected Area"',
          "Content-Type": "text/html",
        },
      });
    }

    try {
      const base64Credentials = authHeader.split(" ")[1];
      const credentials = atob(base64Credentials);
      const [username, password] = credentials.split(":");

      if (username === "admin" && password === "admin") {
        // continue
      } else {
        return new Response("Unauthorized - Invalid credentials", {
          status: 401,
          headers: { "Content-Type": "text/plain" },
        });
      }
    } catch {
      return new Response("Unauthorized - Invalid auth format", {
        status: 401,
        headers: { "Content-Type": "text/plain" },
      });
    }
  } else if (hostname.includes(UNPROTECTED_DOMAIN)) {
    return fetch(request);
  }

  const route = url.pathname;

  /**
   * Edge URL Redirect — equivalent to launch.json redirects[] (source → destination, statusCode, response.headers).
   * /test1 → /test2, 308, x-powered-by: launch
   */
  if (route === "/test1") {
    const destination = new URL(request.url);
    destination.pathname = "/test2";
    const headers = new Headers();
    headers.set("Location", destination.href);
    headers.set("x-powered-by", "launch");
    return new Response(null, { status: 308, headers });
  }

  /**
   * Edge URL Rewrite — equivalent to launch.json rewrites[] (source → destination, request/response headers).
   * /test3 internally fetches /test2; optional x-api-key on upstream request, x-powered-by on client response.
   */
  if (route === "/test3") {
    const rewriteUrl = new URL(request.url);
    rewriteUrl.pathname = "/test2";
    const upstreamHeaders = new Headers(request.headers);
    upstreamHeaders.set("x-api-key", "api-key");
    const rewriteRequest = new Request(rewriteUrl.href, {
      method: request.method,
      headers: upstreamHeaders,
      body: request.body,
    });
    const upstreamResponse = await fetch(rewriteRequest);
    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.set("x-powered-by", "launch");
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  }

  request.headers.get("x-forwarded-for");

  const testKeyValue = context.env.TEST_KEY;
  console.log("TEST_KEY", testKeyValue);

  context.waitUntil(Promise.resolve());

  if (route === "/appliances") {
    const response = {
      time: new Date(),
    };
    return new Response(JSON.stringify(response));
  }

  if (route === "/appliances-post") {
    const upstream = "https://example.com/api/appliances/new";
    const method = request.method;
    const hasBody =
      method !== "GET" && method !== "HEAD" && request.body != null;
    return fetch(upstream, {
      method,
      headers: request.headers,
      ...(hasBody ? { body: request.body } : {}),
    });
  }

  if (route === "/modify-demo") {
    const method = request.method;
    if (method === "GET" || method === "HEAD") {
      return new Response(
        JSON.stringify({
          message:
            "This path runs the Launch “modify request/response” demo. Send POST with a JSON body (e.g. {}).",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    let requestBody = {};
    try {
      const raw = await request.text();
      if (raw && raw.trim()) {
        requestBody = JSON.parse(raw);
      }
    } catch {
      return new Response(
        JSON.stringify({ error: "Request body must be valid JSON" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const reqHeaders = new Headers(request.headers);
    reqHeaders.set("Content-Type", "application/json");
    const modifiedRequest = new Request(request.url, {
      body: JSON.stringify({
        ...requestBody,
        foo: "bar",
      }),
      method: "POST",
      headers: reqHeaders,
    });
    const modifiedUrl = new URL(request.url);
    modifiedUrl.search = "?id=1";
    const requestWithModifiedUrl = new Request(modifiedUrl.toString(), {
      method: modifiedRequest.method,
      headers: modifiedRequest.headers,
      body: modifiedRequest.body,
    });
    const response = await fetch(requestWithModifiedUrl);
    const responseText = await response.text();
    let responseBody;
    try {
      responseBody = responseText && responseText.trim() ? JSON.parse(responseText) : {};
    } catch {
      return new Response(
        JSON.stringify({
          error: "Upstream response was not JSON",
          status: response.status,
          hint: "The demo expects JSON from the origin (e.g. an API).",
        }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }
    const outHeaders = new Headers(response.headers);
    outHeaders.set("X-Message", "Modified response headers");
    return new Response(
      JSON.stringify({
        ...responseBody,
        time: new Date(),
      }),
      {
        status: response.status,
        statusText: response.statusText,
        headers: outHeaders,
      },
    );
  }

  if (route === "/appliances-redirect") {
    const modifiedUrl = new URL(request.url);
    modifiedUrl.pathname = "/appliances/new";
    return Response.redirect(modifiedUrl, 301);
  }

  return fetch(request);
}
