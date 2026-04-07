const PROTECTED_DOMAIN = "cliegdetesting.devcontentstackapps.com";
const UNPROTECTED_DOMAIN = "test-unprotected-domain.devcontentstackapps.com";

export default async function handler(request, context) {
  const url = new URL(request.url);
  const hostname = url.hostname;
  console.log("hostname:", hostname);

  if (hostname.includes(PROTECTED_DOMAIN)) {
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

  if (route === "/appliances-post" && request.method === "POST") {
    return fetch(`https://example.com/api/appliances/new`);
  }

  if (route === "/modify-demo") {
    const requestBody = await request.json();
    const modifiedRequest = new Request(request, {
      body: JSON.stringify({
        ...requestBody,
        foo: "bar",
      }),
      method: "POST",
    });
    modifiedRequest.headers.set("Content-Type", "application/json");
    const modifiedUrl = new URL(request.url);
    modifiedUrl.search = "?id=1";
    const requestWithModifiedUrl = new Request(
      modifiedUrl.toString(),
      modifiedRequest,
    );
    const response = await fetch(requestWithModifiedUrl);
    const responseBody = await response.json();
    const modifiedResponse = new Response(
      JSON.stringify({
        ...responseBody,
        time: new Date(),
      }),
      response,
    );
    modifiedResponse.headers.set("X-Message", "Modified response headers");
    return modifiedResponse;
  }

  if (route === "/appliances-redirect" && request.method === "POST") {
    const modifiedUrl = new URL(request.url);
    modifiedUrl.pathname = "/appliances/new";
    return Response.redirect(modifiedUrl, 301);
  }

  return fetch(request);
}
