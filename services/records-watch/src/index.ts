export {
  FixtureSourceAdapter,
  UnsafeFixturePathError,
  type FixtureDocument,
  type FixtureManifest,
  type FixtureManifestDocument,
  type FixtureSet
} from "./fixture-adapter.js";
export {
  acquireFixtureSet,
  type AcquisitionAuditSink,
  type AcquisitionCommand,
  type AcquisitionDependencies,
  type AcquisitionResult,
  type AcquisitionState,
  type AcquisitionStore,
  type ImmutableRecordStore,
  type ObjectStore
} from "./acquire.js";
