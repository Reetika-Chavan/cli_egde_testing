export default async function handler(request, context) {
  const parsedUrl = new URL(request.url);
  const route = parsedUrl.pathname;

  /** Redirect — /test1 to /test2 (same pattern as Launch edge-functions redirect docs) */
  if (route === "/test1") {
    const modifiedUrl = new URL(request.url);
    modifiedUrl.pathname = "/test2";
    return Response.redirect(modifiedUrl, 308);
  }

  
  if (route === "/test3") {
    const rewriteUrl = new URL(request.url);
    rewriteUrl.pathname = "/test2";
    return fetch(new Request(rewriteUrl.toString(), request));
  }

  /** Launch Edge Function Request Object — Client IP */
  request.headers.get("x-forwarded-for");

  /** Launch Edge Functions Context Object — Environment Variables */
  const testKeyValue = context.env.TEST_KEY;
  console.log("TEST_KEY", testKeyValue);

  /** waitUntil */
  context.waitUntil(Promise.resolve());

  /** Example — JSON response for /appliances */
  if (route === "/appliances") {
    const response = {
      time: new Date(),
    };
    return new Response(JSON.stringify(response));
  }

  /** Handling Routes at Edge — POST /appliances (docs path; isolated as /appliances-post) */
  if (route === "/appliances-post" && request.method === "POST") {
    return fetch(`https://example.com/api/appliances/new`);
  }

  /** Modify Request and Response */
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

  /** Redirect to a URL — POST /appliances (docs path; isolated as /appliances-redirect) */
  if (route === "/appliances-redirect" && request.method === "POST") {
    const modifiedUrl = new URL(request.url);
    modifiedUrl.pathname = "/appliances/new";
    return Response.redirect(modifiedUrl, 301);
  }

  /** Forward Requests to the Launch Origin Server */
  return fetch(request);
}
