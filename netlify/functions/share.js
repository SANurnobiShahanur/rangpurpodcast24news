// Social share endpoint for Rangpur Podcast24 News.

const SUPABASE_URL = "https://jjiqzupumcabyjjsqtec.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_Yk8anVM0MfpNRN1EMsGFsw_omYb-uZe";

const SITE_URL =
  "https://sanurnobishahanur.github.io/rangpurpodcast24news";

const SITE_NAME = "Rangpur Podcast24 News";

const DEFAULT_DESCRIPTION =
  "Rangpur Podcast24 News - রংপুরসহ বাংলাদেশের সর্বশেষ সংবাদ, ব্রেকিং নিউজ, রাজনীতি, কৃষি, শিক্ষা ও সারাদেশের খবর।";

const CRAWLER_PATTERN = new RegExp(
  [
    "facebookexternalhit",
    "facebot",
    "facebookcatalog",
    "meta-externalagent",
    "whatsapp",
    "twitterbot",
    "linkedinbot",
    "slackbot",
    "telegrambot",
    "discordbot",
    "pinterest",
    "skypeuripreview",
    "redditbot",
    "embedly",
    "viber",
    "line/",
    "snapchat",
    "vkshare",
    "tumblr",
    "applebot",
    "googlebot",
    "bingbot",
    "yandex",
    "duckduckbot",
    "baiduspider",
    "google-inspectiontool",
    "bot\\b",
    "crawler",
    "spider",
    "preview",
  ].join("|"),
  "i"
);

export default async (req, context) => {
  const url = new URL(req.url);

  const rawId = String(
    context?.params?.id ??
    url.searchParams.get("id") ??
    ""
  ).trim();

  if (!/^\d+$/.test(rawId)) {
    return redirect(`${SITE_URL}/`);
  }

  const id = rawId;
  const articleUrl = `${SITE_URL}/news.html?id=${id}`;
  const userAgent = req.headers.get("user-agent") || "";

  if (!CRAWLER_PATTERN.test(userAgent)) {
    return redirect(articleUrl);
  }

  let article = null;

  try {
    article = await fetchPublishedArticle(id);
  } catch (error) {
    console.error("share: Supabase request failed", error);
  }

  const shareUrl = `${url.origin}/share/${id}`;

  // নতুন ব্র্যান্ডেড শেয়ার ইমেজ
  const brandedImage = `${url.origin}/share-image/${id}`;

  if (!article) {
    return htmlResponse(
      renderPage({
        title: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        image: brandedImage,
        shareUrl,
        articleUrl,
        type: "website",
      }),
      200,
      "public, max-age=60"
    );
  }

  return htmlResponse(
    renderPage({
      title: article.title || SITE_NAME,
      description:
        summarize(article.content) || DEFAULT_DESCRIPTION,
      image: brandedImage,
      shareUrl,
      articleUrl,
      type: "article",
      author: article.author_name,
      publishedTime:
        article.published_at || article.created_at,
      modifiedTime: article.updated_at,
    }),
    200,
    "public, max-age=300"
  );
};

export const config = {
  path: ["/share", "/share/:id"],
};

async function fetchPublishedArticle(id) {
  const query = new URLSearchParams({
    select:
      "id,title,content,image_url,author_name,created_at,published_at,updated_at",
    id: `eq.${id}`,
    status: "eq.published",
    limit: "1",
  });

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/news?${query}`,
    {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Supabase responded with HTTP ${response.status}`
    );
  }

  const rows = await response.json();

  return Array.isArray(rows) && rows.length
    ? rows[0]
    : null;
}

function summarize(content, maxLength = 200) {
  const text = String(content || "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;

  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");

  return (
    lastSpace > maxLength * 0.6
      ? cut.slice(0, lastSpace)
      : cut
  ).trim() + "…";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toIsoDate(value) {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toISOString();
}

function renderPage({
  title,
  description,
  image,
  shareUrl,
  articleUrl,
  type,
  author,
  publishedTime,
  modifiedTime,
}) {
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const img = escapeHtml(image);
  const share = escapeHtml(shareUrl);
  const target = escapeHtml(articleUrl);

  const articleTags = [];

  if (type === "article") {
    const published = toIsoDate(publishedTime);
    const modified = toIsoDate(modifiedTime);

    if (published) {
      articleTags.push(
        `<meta property="article:published_time" content="${published}">`
      );
    }

    if (modified) {
      articleTags.push(
        `<meta property="article:modified_time" content="${modified}">`
      );
    }

    if (author) {
      articleTags.push(
        `<meta property="article:author" content="${escapeHtml(author)}">`
      );
    }
  }

  return `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>${t} | ${escapeHtml(SITE_NAME)}</title>

<meta name="description" content="${d}">
<link rel="canonical" href="${target}">

<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">
<meta property="og:locale" content="bn_BD">
<meta property="og:url" content="${share}">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:image" content="${img}">
<meta property="og:image:secure_url" content="${img}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${t}">

${articleTags.join("\n")}

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${img}">

</head>
<body>

<h1>${t}</h1>
<p>${d}</p>
<img src="${img}" alt="${t}">
<p><a href="${target}">সম্পূর্ণ সংবাদ পড়ুন</a></p>

<script>
location.replace(
  ${JSON.stringify(articleUrl).replace(/</g, "\\u003c")}
);
</script>

</body>
</html>`;
}

function htmlResponse(body, status, cacheControl) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": cacheControl,
      Vary: "User-Agent",
    },
  });
}

function redirect(location) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      "Cache-Control": "no-store",
      Vary: "User-Agent",
    },
  });
}
