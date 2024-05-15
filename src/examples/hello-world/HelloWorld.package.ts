/**
 * Packages are defined by their dependencies, exports and the API they expose.
 * This package will print the string `Hello World` to the console.
 */
import { createPackage } from '@bitmovin/player-web-x/playerx-framework-utils';
import type { BundleExportNames } from '@bitmovin/player-web-x/types/bundles/Types';
import type { Logger } from '@bitmovin/player-web-x/types/packages/core/utils/Logger';
import type { EmptyObject } from '@bitmovin/player-web-x/types/Types';

// In order to do so, it needs to depend on the `Logger` of the player.
// By convention, we define dependencies of a Package in a `*Dependencies` type.
// This one defines that this package depends on a component named "logger" of
// type `Logger`.
type Dependencies = {
  [BundleExportNames.Logger]: Logger;
};

// Similarly, we use an `*Exports` type to define the components that are
// exported by a package. This one doesn't export anything, so we can just
// define our exports to be an `EmptyObject`.
type Exports = EmptyObject;

// Lastly, we use an `*Api` type to define what API is used by the package.
// This can both be used to define the type of the API this package depends on,
// but also the API that is exposed by it. In this example, we don't use or
// expose any API, so this can again just be an `EmptyObject`.
type Api = EmptyObject;

// To simplify package creation, the framework exports a `createPackage` function.
// It takes the dependency, export and API types and returns a package that is
// typed accordingly.
// It requires 3 parameters to be specified:
//  name: the name of this package
//  onAdd: a function that is invoked with an `ApiManager<Api>` and an
//    `ExecutionContext` that has all the specified dependencies and allows
//    to expose all exports of this package.
//  dependencies: an array of string values that must be equal to the keys of the
//    `*Dependencies` type.
export const HelloWorldPackage = createPackage<Dependencies, Exports, Api>(
  'hello-world-package',
  (apiManager, context) => {
    // All components that this package depends on can be acquired from the
    // `Registry`. However, components that are exposed by a package can also
    // be acquired from the `Registry`, but trying to do so before they have
    // been exposed will cause an error to be thrown.
    const logger = context.registry.get('logger' as BundleExportNames.Logger);

    // Hello World! :)
    logger.warn('Hello World!');
  },
  ['logger' as BundleExportNames.Logger],
);

// Finally, we also want to use a default export so that all packages can be
// added in the same way to the framework instance.
export default HelloWorldPackage;
