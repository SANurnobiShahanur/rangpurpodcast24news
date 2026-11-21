import sharp from "sharp";

const SUPABASE_URL = "https://jjiqzupumcabyjjsqtec.supabase.co";
const SUPABASE_KEY =
  "sb_publishable_Yk8anVM0MfpNRN1EMsGFsw_omYb-uZe";

const LOGO_URL =
  "https://raw.githubusercontent.com/SANurnobiShahanur/rangpurpodcast24news/main/file_00000000fc808207bb045ee4d0c03fec.webp";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200";

export default async (req, context) => {
  const url = new URL(req.url);

  const id = String(
    context?.params?.id || url.searchParams.get("id") || ""
  );

  if (!/^\d+$/.test(id)) {
    return new Response("Invalid article ID", { status: 400 });
  }

  try {
    const query = new URLSearchParams({
      select: "id,image_url",
      id: `eq.${id}`,
      status: "eq.published",
      limit: "1"
    });

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/news?${query}`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Accept: "application/json"
        },
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!response.ok) {
      throw new Error("Article fetch failed");
    }

    const rows = await response.json();
    const article = rows?.[0];

    let photoBuffer;

    try {
      const photoUrl = article?.image_url || FALLBACK_IMAGE;

      const photoResponse = await fetch(photoUrl, {
        signal: AbortSignal.timeout(12000)
      });

      if (!photoResponse.ok) {
        throw new Error("Photo unavailable");
      }

      photoBuffer = Buffer.from(
        await photoResponse.arrayBuffer()
      );
    } catch {
      const fallback = await fetch(FALLBACK_IMAGE);

      if (!fallback.ok) {
        throw new Error("Fallback image unavailable");
      }

      photoBuffer = Buffer.from(
        await fallback.arrayBuffer()
      );
    }

    const logoResponse = await fetch(LOGO_URL, {
      signal: AbortSignal.timeout(10000)
    });

    if (!logoResponse.ok) {
      throw new Error("Logo unavailable");
    }

    const logoBuffer = Buffer.from(
      await logoResponse.arrayBuffer()
    );

    const photo = await sharp(photoBuffer)
      .rotate()
      .resize(1200, 500, { fit: "cover" })
      .jpeg({ quality: 88 })
      .toBuffer();

    const logo = await sharp(logoBuffer)
      .resize(88, 88, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toBuffer();

    const footer = Buffer.from(`
      <svg width="1200" height="130"
        xmlns="http://www.w3.org/2000/svg">

        <rect width="1200" height="130" fill="#b90018"/>

        <rect x="0" y="0"
          width="1200" height="5"
          fill="#f4c542"/>

        <text x="165" y="78"
          text-anchor="start"
          font-family="Arial, sans-serif"
          font-size="43"
          font-weight="bold"
          fill="#ffffff">
          Rangpur Podcast24 News
        </text>
      </svg>
    `);

    const output = await sharp({
      create: {
        width: 1200,
        height: 630,
        channels: 4,
        background: "#b90018"
      }
    })
      .composite([
        { input: photo, top: 0, left: 0 },
        { input: footer, top: 500, left: 0 },
        { input: logo, top: 521, left: 55 }
      ])
      .png()
      .toBuffer();

    return new Response(output, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    console.error("share-image error:", error);

    return new Response(
      "Unable to create share image",
      { status: 500 }
    );
  }
};

export const config = {
  path: ["/share-image/:id"]
};
