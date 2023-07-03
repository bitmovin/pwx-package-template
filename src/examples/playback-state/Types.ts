import type { PlaybackStateAtom } from './PlaybackStateAtom';

export enum PlaybackStateExportNames {
  PlaybackStateAtom = 'playback-state-atom',
}

// The `PlaybackState` package only exposes the `PlaybackStateAtom`
export type PlaybackStatePackageExports = {
  [PlaybackStateExportNames.PlaybackStateAtom]: PlaybackStateAtom;
};
