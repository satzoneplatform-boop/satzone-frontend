import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import Hls from 'hls.js';
import { Spinner } from '@/components/ui/Spinner';
import { rewriteHlsUrl } from '@/lib/hls';
import { LessonVideoPlayer } from './LessonVideoPlayer';

/**
 * hls.js custom loader that rewrites every fetched URL through the API
 * proxy origin.
 *
 * Necessary because the manifest the backend serves embeds **absolute**
 * URLs for the AES-128 key and segments. Even after we rewrite the
 * master playlist URL, hls.js follows those absolute links cross-origin,
 * which bypasses the dev proxy and breaks the IP binding (token has
 * `cip: "::1"`, but the direct fetch shows the public NAT IP).
 *
 * The wrapper intercepts every `load(context)` call and rewrites
 * `context.url` before delegating to the default XHR loader. Applies
 * uniformly to manifest, playlists, segments, and the AES key.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeRewritingLoader(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Base: any = Hls.DefaultConfig.loader;
  return class extends Base {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    load(context: any, config: any, callbacks: any) {
      if (context?.url) {
        context.url = rewriteHlsUrl(context.url);
      }
      super.load(context, config, callbacks);
    }
  };
}

export interface VideoPlayerHandle {
  /** Force re-mint of the playback URL (use on token expiry / IP mismatch). */
  reload: () => void;
}

interface VideoPlayerProps {
  /** Resolved HLS manifest URL (from /lessons/:id/playback). */
  src: string | null;
  /** Whether the backend has finished packaging. */
  ready: boolean;
  /** Called when the player wants a fresh token (token expired or IP changed). */
  onRequestRefresh: () => void;
  /** Tick the backend with playback position; called every ~10s. */
  onProgress?: (positionSeconds: number, durationSeconds: number) => void;
  /** Friendly label for an upstream playback API error (suppresses spinner). */
  errorLabel?: string | null;
  /** Authoritative total duration (seconds) — overrides <video>.duration for sliding manifests. */
  duration?: number | null;
}

/**
 * Lesson video player.
 *
 * Wires hls.js (or native HLS on Safari) to a token-stamped manifest URL
 * minted by /lessons/:id/playback (FRONTEND.md §5.1). The chrome (custom
 * controls, free scrub, capped rate at 2×) is rendered by `LessonVideoPlayer`
 * and we attach hls.js to the `<video>` element it exposes via
 * `onVideoElement`.
 */
export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer(
    { src, ready, onRequestRefresh, onProgress, errorLabel, duration },
    ref,
  ) {
    const [video, setVideo] = useState<HTMLVideoElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const lastTickRef = useRef(0);
    const fatalCountRef = useRef(0);
    // Media-error recovery ladder state (see the ERROR handler). Timestamps of
    // the last `recoverMediaError()` and `swapAudioCodec()` so we escalate
    // instead of hammering recovery on every repeated append error.
    const recoverAtRef = useRef(0);
    const swapAudioAtRef = useRef(0);
    const appendErrAtRef = useRef(0);
    // Playback session snapshot carried across player re-attaches. Every
    // token re-mint changes `src` (fresh `?t=`), which tears hls.js down —
    // without this a lesson longer than the ~30 min token TTL restarted at
    // 0:00 paused mid-watch. Handlers may pre-fill it (premature-end
    // recovery); otherwise the attach effect's cleanup snapshots the
    // position/playing state as it tears down.
    const resumeRef = useRef<{ time: number; playing: boolean } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Keep the latest callbacks behind refs so the hls attach effect
    // doesn't tear down and re-create the player every time the parent
    // re-renders with fresh inline functions. The parent re-renders
    // frequently — every progress mutation, every refetch — and a stable
    // attach is required for hls.js to actually start playback.
    const onRequestRefreshRef = useRef(onRequestRefresh);
    const onProgressRef = useRef(onProgress);
    useEffect(() => {
      onRequestRefreshRef.current = onRequestRefresh;
      onProgressRef.current = onProgress;
    });

    useImperativeHandle(ref, () => ({
      reload: () => onRequestRefreshRef.current(),
    }));

    // Reset fatal counter + recovery ladder whenever a new src is in play — a
    // successful re-mint means we're starting over.
    useEffect(() => {
      fatalCountRef.current = 0;
      recoverAtRef.current = 0;
      swapAudioAtRef.current = 0;
      appendErrAtRef.current = 0;
    }, [src]);

    useEffect(() => {
      if (!video || !src || !ready) return;

      setError(null);
      const playSrc = rewriteHlsUrl(src);
      // Consume any session snapshot from the previous attach so the viewer
      // continues where they were instead of restarting at 0:00.
      const resume = resumeRef.current;
      resumeRef.current = null;

      // Prefer hls.js whenever it's supported so the rewriting loader
      // intercepts every fetch (manifest, segments, AES key). Native HLS
      // (Safari) cannot be intercepted — it follows the *absolute* key
      // and segment URIs embedded in the manifest by the backend, which
      // bypasses the dev/reverse proxy and breaks IP-bound token
      // verification (you get `401 playback_ip_mismatch` on the key
      // fetch even though the manifest itself loaded fine).
      if (!Hls.isSupported()) {
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = playSrc;
          if (resume) {
            const restore = () => {
              if (resume.time > 1) video.currentTime = resume.time;
              if (resume.playing) void video.play().catch(() => {});
            };
            video.addEventListener('loadedmetadata', restore, { once: true });
          }
          return () => {
            if (!resumeRef.current && video.currentTime > 1) {
              resumeRef.current = {
                time: video.currentTime,
                playing: !video.paused && !video.ended,
              };
            }
            video.removeAttribute('src');
            video.load();
          };
        }
        setError('Your browser does not support HLS playback.');
        return;
      }

      const hls = new Hls({
        // The token is in the URL; no Authorization header needed —
        // backend signs the manifest, segments, and AES-128 key against
        // the same `?t=` query string.
        autoStartLoad: true,
        capLevelToPlayerSize: true,
        // Fresh attach starts at 0; a re-mint resumes at the saved position.
        //
        // For enrolled students the backend serves a *sliding*
        // `EXT-X-PLAYLIST-TYPE:EVENT` manifest with no `ENDLIST` (only
        // segments up to `watermark + LOOKAHEAD` are exposed). hls.js treats
        // any playlist without `ENDLIST` as **live**, and the default
        // `startPosition: -1` then starts at the *live edge* — ~30 s into the
        // initial ~48 s window. That is fatal here: jumping to the edge burns
        // the free look-ahead segments without banking any watch time, so the
        // next segment fetch trips the server's anti-fast-forward gate
        // (HTTP 429 `segment_rate_exceeded`) and playback stalls at the edge —
        // the "long/gated videos won't open" bug. Free-preview and
        // owner/admin viewers get a full VOD manifest (with `ENDLIST`) and are
        // unaffected — `0` is already the VOD default. Starting at 0 lets the
        // viewer watch the opening window in real time, accumulate credit, and
        // keep the sliding window ahead of the playhead.
        startPosition: resume && resume.time > 1 ? resume.time : 0,
        // Long lessons: hls.js keeps EVERYTHING behind the playhead by
        // default (backBufferLength: Infinity). Over an hour-long video
        // that exhausts memory on modest devices — the classic
        // "large videos stop playing" failure. 90 s of back-buffer keeps
        // rewind snappy while capping memory.
        backBufferLength: 90,
        // Big segments on slow links can exceed the 20 s default timeout,
        // which surfaced as a fatal network error → full re-mint → restart
        // loop. Give large fragments more headroom and retries instead.
        fragLoadingTimeOut: 45000,
        fragLoadingMaxRetry: 6,
        manifestLoadingMaxRetry: 4,
        // Route manifest, playlists, segments, and the AES-128 key
        // through the same proxy origin as the rest of the API. The
        // backend embeds absolute URLs in the manifest, and the playback
        // token is IP-bound — without this rewrite the key/segments
        // bypass the proxy, the backend sees a different source IP, and
        // every fetch 401s.
        loader: makeRewritingLoader(),
      });
      hlsRef.current = hls;
      hls.loadSource(playSrc);
      hls.attachMedia(video);
      // Re-attached mid-lesson while playing → keep playing.
      if (resume?.playing) {
        hls.once(Hls.Events.MANIFEST_PARSED, () => {
          void video.play().catch(() => {});
        });
      }

      // Lifecycle logging — makes a "200s but frozen" stall diagnosable:
      // if MANIFEST_PARSED fires but FRAG_BUFFERED never does, the media
      // pipeline (decrypt/transmux) is the culprit, not the network.
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        console.info('[lesson-player] manifest parsed — levels:', data.levels?.length);
      });
      let buffered = 0;
      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        buffered += 1;
        if (buffered === 1) {
          console.info('[lesson-player] first fragment buffered — media pipeline OK');
          // Proactively close a start gap: if the first buffered range begins
          // after the playhead (non-zero start PTS on remuxed segments), move
          // the playhead onto the data so playback can actually begin instead
          // of stalling at 0 and re-fetching the opening segment forever.
          try {
            const b = video.buffered;
            if (
              b.length > 0 &&
              video.currentTime < b.start(0) - 0.1 &&
              (!resume || resume.time <= 1)
            ) {
              video.currentTime = b.start(0) + 0.01;
            }
          } catch {
            /* buffered/currentTime not ready yet — the stall handler covers it */
          }
        }
      });

      // Bounded to 4 fatals per src — covers transient network drops,
      // playback_ip_mismatch (network swap), playback_token_expired
      // (TTL crossed). After 4 we surface a permanent error rather than
      // loop the re-mint forever.
      hls.on(Hls.Events.ERROR, (_, data) => {
        // Log EVERY error (fatal + non-fatal). hls.js reports many stall
        // conditions as non-fatal, so a silent freeze leaves no other trace.
        console.warn('[lesson-player] hls error', {
          type: data.type,
          details: data.details,
          fatal: data.fatal,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          httpCode: (data as any).response?.code,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const httpCode = (data as any).response?.code as number | undefined;

        // Rate limited (429). The streaming endpoints share the API's
        // default per-IP limit, and a single HLS play issues many requests
        // (manifest reloads + every segment + the AES key). Re-minting here
        // would re-fetch everything and multiply the load into a storm, so
        // instead back off and resume the SAME session — the token is still
        // valid. Not counted toward the fatal cap.
        if (httpCode === 429) {
          window.setTimeout(() => {
            try {
              hls.startLoad();
            } catch {
              /* player may be torn down — ignore */
            }
          }, 5000);
          return;
        }

        if (!data.fatal) {
          // Chrome's MSE SourceBuffer rejecting appends that VLC tolerates.
          // hls.js reports these as NON-fatal and retries the same append in a
          // tight loop forever, so playback freezes right after the first
          // fragment — the observed `bufferAppendError` / `bufferAppendingError`
          // storm. Walk hls.js's documented media-error recovery ladder, but
          // throttled (the events fire many times a second): first re-create
          // the buffers, then — if it recurs — swap the audio codec and recover
          // (the usual cause is a mislabeled AAC profile on stream-copied
          // segments that MSE won't accept), then give up with a real message
          // instead of looping. Only append errors reach here, so working
          // videos are untouched.
          if (
            data.details === Hls.ErrorDetails.BUFFER_APPEND_ERROR ||
            data.details === Hls.ErrorDetails.BUFFER_APPENDING_ERROR
          ) {
            const now = Date.now();
            // Cool-down: give each recovery step a few seconds to prove itself
            // before escalating, and ignore the rest of the burst.
            if (now - appendErrAtRef.current < 4000) return;
            if (recoverAtRef.current === 0) {
              recoverAtRef.current = now;
              appendErrAtRef.current = now;
              try {
                hls.recoverMediaError();
              } catch {
                /* player may be torn down — ignore */
              }
            } else if (swapAudioAtRef.current === 0) {
              swapAudioAtRef.current = now;
              appendErrAtRef.current = now;
              try {
                hls.swapAudioCodec();
                hls.recoverMediaError();
              } catch {
                /* player may be torn down — ignore */
              }
            } else {
              setError(
                'This video could not be played in your browser. Try refreshing, or open it in a different browser.',
              );
              try {
                hls.stopLoad();
              } catch {
                /* ignore */
              }
            }
            return;
          }
          // Non-fatal buffer stall: get the playhead back onto buffered data.
          if (
            data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR &&
            video &&
            !video.paused
          ) {
            try {
              // Stream-copied (remuxed) segments can carry a non-zero start
              // PTS, so the media timeline begins a few seconds in rather than
              // at 0. The playhead then sits in the gap *before* the first
              // buffered range and never enters it — hls.js keeps re-fetching
              // the opening segment forever (it downloads 200 OK but can't be
              // played), which is the "long lesson won't open, first segment
              // requested again and again" failure. A fixed +0.1s nudge can
              // never close a multi-second start gap, so when the playhead is
              // behind buffered data, seek directly into it. VLC masks this by
              // starting playback wherever the media actually begins.
              const b = video.buffered;
              let jumped = false;
              for (let i = 0; i < b.length; i++) {
                if (video.currentTime < b.start(i) - 0.1) {
                  video.currentTime = b.start(i) + 0.01;
                  jumped = true;
                  break;
                }
              }
              if (!jumped) video.currentTime += 0.1;
            } catch {
              /* currentTime may be unseekable at the window edge — ignore */
            }
          }
          return;
        }
        fatalCountRef.current += 1;
        if (fatalCountRef.current > 4) {
          setError('Playback failed. Please refresh the page.');
          return;
        }
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          onRequestRefreshRef.current();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          setError('Playback failed. Please try again.');
        }
      });

      return () => {
        // Snapshot the session before teardown so the next attach (token
        // re-mint, manifest refresh) picks up exactly where this one was.
        if (!resumeRef.current && video.currentTime > 1) {
          resumeRef.current = {
            time: video.currentTime,
            playing: !video.paused && !video.ended,
          };
        }
        hls.destroy();
        hlsRef.current = null;
      };
    }, [video, src, ready]);

    // A still-packaging (growing) manifest can run out of segments and fire
    // `ended` long before the real end of the lesson. When the authoritative
    // total says there is more to come, this is NOT the end: re-mint the
    // manifest and resume playing from the same spot instead of leaving the
    // player dead mid-video.
    useEffect(() => {
      if (!video) return;
      const onEnded = () => {
        const total = duration ?? 0;
        if (total > 0 && video.currentTime < total - 10) {
          console.info(
            '[lesson-player] media ended at',
            Math.round(video.currentTime),
            's of',
            Math.round(total),
            's — manifest behind the lesson, refreshing to continue',
          );
          resumeRef.current = { time: video.currentTime, playing: true };
          onRequestRefreshRef.current();
        }
      };
      video.addEventListener('ended', onEnded);
      return () => video.removeEventListener('ended', onEnded);
    }, [video, duration]);

    // Progress reporting — bound directly on the underlying <video>. The
    // backend computes completion from the segment watermark, not from
    // this PUT (FRONTEND.md §5.1) — sending `completed: true` is fine but
    // not authoritative; refetch enrollment/curriculum to unlock the next
    // lesson.
    useEffect(() => {
      if (!video) return;
      const flush = () => {
        const now = video.currentTime;
        lastTickRef.current = now;
        onProgressRef.current?.(now, video.duration || 0);
      };
      const onTime = () => {
        const now = video.currentTime;
        if (Math.abs(now - lastTickRef.current) >= 10) {
          lastTickRef.current = now;
          onProgressRef.current?.(now, video.duration || 0);
        }
      };
      // Report the true playhead, not the media duration: on a growing
      // manifest `ended` fires at the end of the packaged prefix, and
      // reporting duration-as-position wrongly signalled a full watch.
      const onEnded = () =>
        onProgressRef.current?.(video.currentTime, video.duration || 0);
      const onVisibility = () => {
        if (document.visibilityState === 'hidden') flush();
      };
      video.addEventListener('timeupdate', onTime);
      video.addEventListener('pause', flush);
      video.addEventListener('ended', onEnded);
      document.addEventListener('visibilitychange', onVisibility);
      return () => {
        video.removeEventListener('timeupdate', onTime);
        video.removeEventListener('pause', flush);
        video.removeEventListener('ended', onEnded);
        document.removeEventListener('visibilitychange', onVisibility);
      };
    }, [video]);

    const handleVideoElement = useCallback((el: HTMLVideoElement | null) => {
      setVideo(el);
    }, []);

    const upstreamErr = errorLabel ?? null;
    const overlay = upstreamErr ? (
      <div className="absolute inset-0 grid place-items-center px-6 text-center text-white/85">
        <p className="max-w-md text-sm">{upstreamErr}</p>
      </div>
    ) : !ready ? (
      <div className="absolute inset-0 grid place-items-center text-center text-white/85">
        <div>
          <Spinner size="lg" className="text-white" />
          <p className="mt-3 text-sm">Video processing — this can take a minute.</p>
        </div>
      </div>
    ) : error ? (
      <div className="absolute inset-0 grid place-items-center text-center text-white/85">
        <p className="text-sm">{error}</p>
      </div>
    ) : null;

    return (
      <LessonVideoPlayer
        className="rounded-2xl"
        onVideoElement={handleVideoElement}
        overlay={overlay}
        duration={duration}
      />
    );
  },
);
