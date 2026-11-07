// Minimal backend. Run: node server.js  (Node 18+, no dependencies)
// Serves index.html and two endpoints:
//   GET /api/resolve?url=<tiktok link>  -> { id, title, author, cover, videoUrl }
//   GET /api/download?url=<videoUrl>&name=<id>  -> streams the MP4 as an attachment

const http = require("http");
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");

const PORT = process.env.PORT || 3000;

// ---- Fill this in --------------------------------------------------------
// Browsers can't fetch TikTok directly (CORS), so the lookup must happen here.
// Call a video-info provider you have access to and return the watermark-free
// URL. Must return: { id, title, author, cover, videoUrl }
async function resolveVideo(tiktokUrl) {
  // Example shape (replace with your provider's real request/response):
  //
  // const r = await fetch(`https://YOUR-PROVIDER/api?url=${encodeURIComponent(tiktokUrl)}`, {
  //   headers: { Authorization: `Bearer ${process.env.PROVIDER_KEY}` },
  // });
  // const j = await r.json();
  // return { id: j.id, title: j.title, author: j.author, cover: j.cover, videoUrl: j.nowatermark_url };
  throw new Error("Resolver not configured. Edit resolveVideo() in server.js.");
}
// --------------------------------------------------------------------------

const send = (res, code, obj) => {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
};

http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);

  if (u.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    return fs.createReadStream(path.join(__dirname, "index.html")).pipe(res);
  }

  if (u.pathname === "/api/resolve") {
    const link = u.searchParams.get("url") || "";
    if (!/^https?:\/\/((www|m|vm|vt)\.)?tiktok\.com\//i.test(link)) {
      return send(res, 400, { error: "Invalid TikTok link." });
    }
    try {
      return send(res, 200, await resolveVideo(link));
    } catch (e) {
      return send(res, 502, { error: e.message });
    }
  }

  if (u.pathname === "/api/download") {
    const src = u.searchParams.get("url") || "";
    const name = (u.searchParams.get("name") || "tiktok").replace(/[^\w-]/g, "");
    if (!/^https:\/\//i.test(src)) return send(res, 400, { error: "Bad URL." });
    try {
      const upstream = await fetch(src);
      if (!upstream.ok) throw new Error("Upstream failed");
      res.writeHead(200, {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${name}.mp4"`,
      });
      return Readable.fromWeb(upstream.body).pipe(res);
    } catch {
      return send(res, 502, { error: "Download failed." });
    }
  }

  send(res, 404, { error: "Not found" });
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
