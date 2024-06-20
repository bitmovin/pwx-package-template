import type { ContextHaving } from '@bitmovin/player-web-x/framework-types/execution-context/Types';
import type { BundleExportNames } from '@bitmovin/player-web-x/types/bundles/Types';
import type { AdaptationExportNames } from '@bitmovin/player-web-x/types/packages/adaptation/Types';
import type { MetricsAtom } from '@bitmovin/player-web-x/types/packages/core/metrics/MetricsAtom';
import type { CoreEffects, CoreExportNames, CoreStateAtoms } from '@bitmovin/player-web-x/types/packages/core/Types';
import type { Logger } from '@bitmovin/player-web-x/types/packages/core/utils/Logger';
import type { CoreUtils } from '@bitmovin/player-web-x/types/packages/core/utils/Types';
import type { NetworkTask } from '@bitmovin/player-web-x/types/packages/network/NetworkTask';
import type { NetworkExportNames } from '@bitmovin/player-web-x/types/packages/network/Types';
import type {
  SegmentProcessingComponent,
  SegmentProcessingExportNames,
  SegmentProcessorType,
} from '@bitmovin/player-web-x/types/packages/segment-processing/Types';
import type { ContextWithState } from '@bitmovin/player-web-x/types/packages/Types';
import type { EmptyObject } from '@bitmovin/player-web-x/types/Types';

export type SegmentDecryptorPackageDependencies = {
  [CoreExportNames.Utils]: CoreUtils;
  [BundleExportNames.Logger]: Logger;
  [CoreExportNames.CoreEffects]: CoreEffects;
  [CoreExportNames.CoreStateAtoms]: CoreStateAtoms;
  [SegmentProcessingExportNames.SegmentProcessorType]: typeof SegmentProcessorType;
  [SegmentProcessingExportNames.SegmentProcessingComponent]: SegmentProcessingComponent;
  [NetworkExportNames.NetworkTask]: typeof NetworkTask;
  [AdaptationExportNames.Metrics]: MetricsAtom;
};

export type SegmentDecryptorPackageExports = EmptyObject;

export type SegmentDecryptorPackageContext = ContextHaving<
  SegmentDecryptorPackageDependencies,
  SegmentDecryptorPackageExports,
  ContextWithState
>;

export type EncryptionDataBackendResponse = {
  keyBase64: string;
  ivBase64: string;
};
