const youtubeHosts = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"]);

export function toYouTubeEmbedUrl(value?: string | null) {
  const input = value?.trim();

  if (!input) {
    return null;
  }

  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase();

    if (!youtubeHosts.has(host)) {
      return null;
    }

    if (host.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${sanitizeVideoId(id)}` : null;
    }

    if (url.pathname.startsWith("/embed/")) {
      const id = url.pathname.split("/").filter(Boolean)[1];
      return id ? `https://www.youtube.com/embed/${sanitizeVideoId(id)}` : null;
    }

    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${sanitizeVideoId(id)}` : null;
    }

    return null;
  } catch {
    return null;
  }
}

export function isValidYouTubeUrl(value?: string | null) {
  if (!value?.trim()) {
    return true;
  }

  return Boolean(toYouTubeEmbedUrl(value));
}

function sanitizeVideoId(id: string) {
  return id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
}
