addEventListener('fetch', event => {
  return event.respondWith(handleRequest(event))
})

const gatherResponse = async (response) => await response.json()

async function getCachedResponse(event) {
  const cacheUrl = "https://api.uptimerobot.com/v2/getMonitors"
  const options = {
    method: 'POST',
    body: JSON.stringify({ api_key: API_KEY, format: 'json' }),
    headers: { "Content-Type": "application/json" }
  };
  const cache = caches.default
  let response = await cache.match(cacheUrl)

  if (!response) {
    console.log("cache miss")
    response = await fetch(cacheUrl, options)
    const newResponse = new Response(response.clone().body)
    newResponse.headers.append("Cache-Control", "s-maxage=60")
    event.waitUntil(cache.put(cacheUrl, newResponse))
  }
  return response
}

async function handleRequest(event) {
  const requestURL = new URL(event.request.url)
  if (!requestURL.pathname.startsWith("/id")) return new Response(null, { status: 404 })
  const lookupid = requestURL.pathname.substring(4)

  const statusMap = {
    0: { color: "lightgrey", message: "paused" },
    1: { color: "lightgrey", message: "not checked" },
    2: { color: "brightgreen", message: "up" },
    8: { color: "orange", message: "down" },
    9: { color: "red", message: "down" },
    10: { color: "lightgrey", message: "error" }
  }

  const bulkResponse = await getCachedResponse(event);
  const bulkData = await bulkResponse.json()
  const monitorStatus = (bulkData.monitors.find(mon => mon.id == lookupid).status || 10)
  const resJSON = { schemaVersion: 1, label: "", ...statusMap[monitorStatus] }

  return new Response(JSON.stringify(resJSON), { headers: { "Content-Type": "application/json" }})
}