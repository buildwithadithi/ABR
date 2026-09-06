import { BufferState, getBufferState } from "@/app/abr/bufferController";

export interface BufferMetrics {
  bufferSeconds: number;
  bufferState: BufferState;
}

export function getBufferMetrics(
  video: HTMLVideoElement,
): BufferMetrics {
  if (video.buffered.length === 0) {
    return {
      bufferSeconds: 0,
      bufferState: getBufferState(0),
    };
  }

  const currentTime = video.currentTime;

  let bufferSeconds = 0;

  for (let i = 0; i < video.buffered.length; i++) {
    const start = video.buffered.start(i);
    const end = video.buffered.end(i);

    if (
      currentTime >= start &&
      currentTime <= end
    ) {
      bufferSeconds = Math.max(
        0,
        end - currentTime,
      );

      break;
    }
  }

  return {
    bufferSeconds,
    bufferState: getBufferState(bufferSeconds),
  };
}