import type { PlaybackState } from './PlaybackStateAtom';
import { Playback } from './PlaybackStateAtom';

/**
 * `PlaybackStateAtom` modifiers handling events from the video element
 */

function onTimeupdate(playbackState: PlaybackState, currentTime: number) {
  if (playbackState.state === Playback.Suspended || playbackState.playhead === currentTime) {
    return false;
  }

  playbackState.playhead = currentTime;

  return true;
}

function onDurationChange(playbackState: PlaybackState, duration: number) {
  if (playbackState.state === Playback.Suspended || playbackState.duration === duration) {
    return false;
  }

  playbackState.duration = duration;

  return true;
}

function onPlaybackRateChange(playbackState: PlaybackState, playbackRate: number) {
  if (playbackState.state === Playback.Suspended || playbackState.playbackRate === playbackRate) {
    return false;
  }

  playbackState.playbackRate = playbackRate;

  return true;
}

function onSeek(playbackState: PlaybackState) {
  if (playbackState.state === Playback.Suspended || playbackState.state === Playback.Seeking) {
    return false;
  }

  playbackState.state = Playback.Seeking;

  return true;
}

function onSeeked(playbackState: PlaybackState, isPlaying: boolean) {
  if (playbackState.state === Playback.Suspended || playbackState.state !== Playback.Seeking) {
    return false;
  }

  playbackState.state = isPlaying ? Playback.Playing : Playback.Paused;

  return true;
}

function onStalled(playbackState: PlaybackState) {
  if (playbackState.state === Playback.Suspended || playbackState.state === Playback.Stalled) {
    return false;
  }

  playbackState.state = Playback.Stalled;

  return true;
}

function onWaiting(playbackState: PlaybackState) {
  return onStalled(playbackState);
}

function onPlaying(playbackState: PlaybackState) {
  if (playbackState.state === Playback.Suspended || playbackState.state === Playback.Playing) {
    return false;
  }

  playbackState.state = Playback.Playing;

  return true;
}

function onPaused(playbackState: PlaybackState) {
  if (
    playbackState.state === Playback.Suspended ||
    playbackState.state === Playback.Paused ||
    playbackState.state === Playback.Ended
  ) {
    return false;
  }

  playbackState.state = Playback.Paused;

  return true;
}

function onEnded(playbackState: PlaybackState) {
  if (playbackState.state === Playback.Suspended || playbackState.state === Playback.Ended) {
    return false;
  }

  playbackState.state = Playback.Ended;

  return true;
}

export const VideoElementEventListeners = {
  onTimeupdate,
  onDurationChange,
  onPlaybackRateChange,
  onSeek,
  onSeeked,
  onStalled,
  onWaiting,
  onPlaying,
  onPaused,
  onEnded,
};
