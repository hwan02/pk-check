// 상품 영상 플레이어: YouTube/Vimeo 임베드 자동 감지 + 직접 mp4 fallback
// 용량/대역폭 부담을 줄이기 위해 외부 호스팅 URL 권장

interface Props {
  url: string;
  title?: string;
}

function parseYouTube(url: string): string | null {
  // youtu.be/<id> | youtube.com/watch?v=<id> | youtube.com/embed/<id> | youtube.com/shorts/<id>
  const patterns = [
    /youtu\.be\/([\w-]{6,})/,
    /youtube\.com\/watch\?v=([\w-]{6,})/,
    /youtube\.com\/embed\/([\w-]{6,})/,
    /youtube\.com\/shorts\/([\w-]{6,})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

function parseVimeo(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

export default function ProductVideo({ url, title }: Props) {
  const yt = parseYouTube(url);
  if (yt) {
    return (
      <div className="aspect-video relative rounded-2xl overflow-hidden bg-black border border-[var(--border)]">
        <iframe
          src={`https://www.youtube.com/embed/${yt}?rel=0`}
          title={title ?? "상품 영상"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          loading="lazy"
        />
      </div>
    );
  }

  const vm = parseVimeo(url);
  if (vm) {
    return (
      <div className="aspect-video relative rounded-2xl overflow-hidden bg-black border border-[var(--border)]">
        <iframe
          src={`https://player.vimeo.com/video/${vm}`}
          title={title ?? "상품 영상"}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          loading="lazy"
        />
      </div>
    );
  }

  // 직접 호스팅 mp4 / webm 등
  return (
    <div className="aspect-video relative rounded-2xl overflow-hidden bg-black border border-[var(--border)]">
      <video
        src={url}
        controls
        preload="metadata"
        playsInline
        className="absolute inset-0 w-full h-full object-contain"
      >
        영상을 재생할 수 없습니다.
      </video>
    </div>
  );
}
