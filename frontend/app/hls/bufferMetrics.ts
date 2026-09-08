import {
  BufferState,
  getBufferState,
} from "@/app/abr/bufferController";


export interface BufferMetrics {
  bufferSeconds: number;
  bufferState: BufferState;
}


export function getBufferMetrics(
  video: HTMLVideoElement,
): BufferMetrics {

  // ---------------------------------------------
  // No buffered media
  // ---------------------------------------------

  if (video.buffered.length === 0) {
    return {
      bufferSeconds: 0,
      bufferState: getBufferState(0),
    };
  }


  const currentTime =
    video.currentTime;


  // ---------------------------------------------
  // Find the buffered range containing playback
  // ---------------------------------------------

  for (
    let i = 0;
    i < video.buffered.length;
    i++
  ) {

    const start =
      video.buffered.start(i);

    const end =
      video.buffered.end(i);


    // Normal case:
    // currentTime is inside buffered range

    if (
      currentTime >= start &&
      currentTime <= end
    ) {

      const bufferSeconds =
        Math.max(
          0,
          end - currentTime,
        );


      return {
        bufferSeconds,
        bufferState:
          getBufferState(bufferSeconds),
      };
    }
  }


  // ---------------------------------------------
  // Startup case
  // ---------------------------------------------
  //
  // Sometimes playback is at 0s while the first
  // buffered range starts slightly after 0s.
  //
  // Example:
  //
  // currentTime = 0
  // buffered = 0.08 -> 8.50
  //
  // The old code returned 0.
  //
  // Treat a small startup gap as buffered content.
  // ---------------------------------------------

  const firstStart =
    video.buffered.start(0);

  const firstEnd =
    video.buffered.end(0);


  const startupGap =
    firstStart - currentTime;


  if (
    currentTime < firstStart &&
    startupGap <= 1
  ) {

    const bufferSeconds =
      Math.max(
        0,
        firstEnd - currentTime,
      );


    return {
      bufferSeconds,
      bufferState:
        getBufferState(bufferSeconds),
    };
  }


  // ---------------------------------------------
  // Playback is currently in a gap
  // ---------------------------------------------

  return {
    bufferSeconds: 0,
    bufferState: getBufferState(0),
  };
}