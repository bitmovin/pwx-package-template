### What are we trying to achieve?

Before we start with the details of how to write a PWX plugin, we should interest ourselves in exactly what that means.

Mostly, when the word plugin is used, especially in the context of video players, one expects to see some kind of domain specific hook system. In Shaka for example, it is possible to write a XHR plugin, or a subtitle parser, or an ABR plugin.

Due to the structure of PWX - a framework, upon which is built a player - plugins are in fact completely generic. They are simply packages that can expose or depend on `behaviours`.

> **_NOTE:_** A `behaviour` is a generic term here; it refers to either components or pipelines, effects, or state atoms. In order for a package to rely on these behaviours, it needs to declare them in its dependency list. This means that there must necessarily be a package that exposes them. So there has to be a base package (or several) which expose behaviours, but rely on none. This is what the [phoenix-core](./lib/bundles/phoenix-core.js) does, although that is not immediately apparent due to the compilation: the type of `CoreDependencies` is `EmptyObject`.

Now we are a bit closer to understanding what we need to do. Depending on the nature of the package, we will need to depend on existing behaviours, and potentially expose new behaviours.

### How does a package run?

The framework includes a package API by default. This is simply a namespace with a single method on it: `add`. `add` takes a `Package` and runs it. A package has a `onAdd` callback which returns a Pipeline, and a `dependencies` array. All the framework does is create a Thread, and lazily wait until the dependencies array is fulfilled. Each package (at least for now) is responsible for setting on the registry the behaviours that it declares in its exports. This means that package loading order is completely irrelevant. So long as the dependency graph is connected (each dependency has a corresponding export in a different package) and has no cycles, each package will be run as soon as it can be.

You can see how these types are laid out in [Package.ts](./src/framework-exports/Package.ts).

It will not have escaped your attention that each package is run in a Thread. This relies on the power of the [Structured Concurrency framework](https://bitmovin.com/structured-concurrency-matters-developers/), and comes with its guarantees. If a package fails to run, the Thread it is running in will be canceled, and any dependent packages will never run, but the application will not crash.

### How to interact with other packages?

This depends on what you want to do. You may simply want to use an effect exposed by another package. For example you might want to use the EventListenerEffect from the Core package. Mainly though, you will want to interact with the business logic by listening to state changes. This means that you should write a pipeline, and subscribe to the atom you wish to react to changes on.

### Real example

Let's dive into an example.

Let's assume we wish to listen to a browser callback. For some reason, we want to let the player know when the video element is resized. How can we acheive this? We cannot just pass a callback to the API, as if the Thread we are operating from goes away (because it is cancelled or errored out), the callback will remain referenced from the API and potentially cause a memory leak.

To avoid this, we will use an Effect. In our framework, effects are anything that interacts with something outside of the current threads scope.

Let's write that effect in a new package!

First, lets create a directory in this project, we'll call it `element-size-tracker`. Then in that directory, let's create a file called `ElementSizeTracker.package.ts`. That double extension is important, the build tools will now know where the entry point for the package is.

Here are the initial contents of the file:

```ts
import type { MyApi } from '../../../types/bundles/Types';
import { createPackage } from '../../framework-exports/Package';

// Declare our dependencies
type Dependencies = {};

// Declare our exports
export type ElementSizeTrackerExports = {};

// Actually create the package, using the above types
export const ElementSizeTrackerPackage = createPackage<Dependencies, BrowserSizeTrackerExports, MyApi>(
  'browser-size-tracker-package',
  (apiManager, baseContext) => {},
  [],
);
```

This doesn't do much yet, but the essential elements of the package are already there: dependencies, exports and the package thread (`createPackage` does this for us).

Next, we will create an effect factory to allow us to track resizes to dom elements.

Create a new file: `ResizeObserverEffectFactory.ts`.

In here we will add this code:

```ts
export const ResizeObserverEffectFactory = createEffectFactory(context => {
  const unobserverMap: UnobserverFunctionMap = new Map<HTMLElement, Unsubscribe[]>();

  return {
    // This structure attached to the `effect` key will be added to the effects on the context.
    effect: {
      resize: {
        subscribe: <Element extends HTMLElement>(element: Element, subscriber: Subscriber) =>
          subscribe(context, unobserverMap, element, subscriber),
      },
    },
    // This callback will be run when the context is destroyed.
    removeEffect() {
      for (const [_, unobserveFunctions] of unobserverMap) {
        for (const unobserve of unobserveFunctions) {
          unobserve();
        }
      }

      unobserverMap.clear();
    },
  };
});
```

This is a function that adds an effect to a context. An effect is simply an object that will be added to the context, and a `removeEffect` function that cleans everything up. In this way we can respect the structured concurrency guarantees.

Here is the `subscribe` function, with the necessary imports:

```ts
import type { Unsubscribe } from '../../../types';
import type { AnyExecutionContext } from '../../../types/framework/ExecutionContext';
import type { Step } from '../../../types/framework/Pipeline';
import { createEffectFactory } from '../../framework-exports/EffectFactory';
import { createPipeline } from '../../framework-exports/Pipeline';

export type ResizeObserverEffect = typeof ResizeObserverEffectFactory;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Subscriber = Step<any, ResizeObserverEntry[], any>;

type UnobserverFunctionMap = Map<HTMLElement, Unsubscribe[]>;

function subscribe<Element extends HTMLElement>(
  context: AnyExecutionContext | undefined,
  unobserverMap: UnobserverFunctionMap,
  element: Element,
  subscriber: Subscriber,
): Unsubscribe {
  if (context === undefined) {
    throw new Error('Encountered undefined ExecutionContext in EventListenerEffect');
  }

  // Here we turn our simple subscriber callback into a framework compatible pipeline
  const listenerPipeline = createPipeline(`element-resize-observer`, subscriber);
  // And trigger it from a callback of the right shape for our ResizeObserver
  const listener: ResizeObserverCallback = (entries: ResizeObserverEntry[]) => context.fork(listenerPipeline, entries);

  // The actual Browser API we are trying to interact with
  const resizeObserver = new ResizeObserver(listener);

  // This next section sets up the logic for cleaning up after ourselves properly
  const unobservers = unobserverMap.get(element) ?? [];

  const unobserve = () => {
    resizeObserver.unobserve(element);

    const unobserverIndex = unobservers.indexOf(unobserve);

    if (unobserverIndex > -1) {
      unobservers.splice(unobserverIndex, 1);
    }
  };

  unobservers.push(unobserve);

  resizeObserver.observe(element);
  unobserverMap.set(element, unobservers);

  return unobserve;
}
```

The contents of `ResizeObserverEffectFactory.ts` should now be the contents of the above two code blocks.

You can see we are taking the passed subscriber, creating a pipeline out of it, then passing that in as a callback (wrapped for type matching) to the [ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) browser API. The rest of the code handles unsubscribing.

Ok, so far so good. That is the resize effect. Now we need the video element. Currently this is held as a reference in the source state.

Let's add this code to our `createPackage` callback:

```ts
// Grab the effect factories from the registry.
const { StateEffectFactory, StoreEffectFactory } = baseContext.registry.get(ComponentName.CoreEffects);

// Iteratively set up a context that will allow us to run everything
const contextWithState = baseContext.using(StateEffectFactory);
const videoElementState = createVideoElementStateAtom(contextWithState);

const contextWithVideoState = contextWithState
  .using(StoreEffectFactory('videoElementState', videoElementState))
  .using(ResizeObserverEffectFactory);

const sourceState = baseContext.registry.get(ComponentName.SourceState);
const { state } = contextWithVideoState.effects;

// Using the state effect, subscribe on our context to the atoms
state.subscribe(contextWithVideoState, videoElementState, VideoElementSubscriber);
state.subscribe(contextWithVideoState, sourceState, SourceStateChangeSubscriber);
```

What is going on here?

First we're getting the StateEffect and StoreEffect factories from our registry. They are included as part of our core effects, so we'll also add that as a dependency:

```ts
type Dependencies = {
  [ComponentName.CoreEffects]: CoreEffects;
};
```

Then, we are deriving a new context from our base context, adding the video state atom (which alerts us if a video element is added to the store at a certain key). We are importing this from the `PlaybackState` package for now, but this will probably either move to the core, or be changed.

```ts
import type { VideoElementStateAtom } from '../playback-state/VideoElementStateAtom';
import { createVideoElementStateAtom } from '../playback-state/VideoElementStateAtom';
```

Next, we'll derive the context again to connect our video element state atom to the parent context, and adding the resize observer factory.

Then we are getting a reference to the source state atom, where the video element is stored (because it is passed in through the source api).

Finally, we will add the subscriber to the video element to set up our resize, and a subscriber to the source state to set the video element on the `VideoElementStateAtom`. This connects all the different parts.

Why don't we simply pass the video into the resize observer effect in the `SourceStateChangeSubscriber`, you may be asking yourself. This is because the subscriber itself is canceled every time that the source state changes, which from our point of view is too often. We need an effect that remains available across the lifetime of the video element's existence within the app. Therefore we create the atom when we start the package, and set the video element on the atom as soon as we have it.

Here is the code from the subscribers:

```ts
const VideoElementSubscriber = createPipeline(
  'video-element-subscriber',
  (videoElementState: VideoElementStateAtom, context: VideoStateContext) => {
    const video = videoElementState.element;

    if (video === undefined) {
      return;
    }

    const logger = context.registry.get(ComponentName.Logger);
    const { resize } = context.effects;
    // This is where we actually subscribe to our effect.
    // The callback is passed to the `subscribe` function in `ResizeObserverEffectFactory.ts`
    resize.subscribe(video, entry => logger.log(entry));

    // Make sure this doesn't exit before the parent thread needs it to.
    return context.effects.loop(context.abortSignal);
  },
);

const SourceStateChangeSubscriber = createPipeline(
  'source-state-change-subscriber',
  (source: SourceStateAtom, context: VideoStateContext) => {
    const { state, store } = context.effects;
    const { videoElementState } = store;

    if (source.video !== undefined) {
      // This dispatch will cause the other subscriber (`VideoElementSubscriber`) to be called
      state.dispatch(videoElementState.set, source.video);
    }

    // Make sure this doesn't exit before the parent thread needs it to.
    return context.effects.loop(context.abortSignal);
  },
);
```

The `VideoElementSubscriber` reacts to the presence of the video element by adding a resize subscriber, and waiting for the thread to be shut down. The subscriber simply logs. We will need to add Logger as a dependency:

```ts
type Dependencies = {
  [ComponentName.CoreEffects]: CoreEffects;
  [ComponentName.Logger]: Logger;
  [ComponentName.SourceState]: SourceStateAtom;
};
```

These dependencies will also need to be passed to the `createPackage` call:

```ts
export const ElementSizeTrackerPackage = createPackage<Dependencies, BrowserSizeTrackerExports, MyApi>(
  'browser-size-tracker-package',
  (apiManager, baseContext) => {
    // [...]
  },
  [ComponentName.CoreEffects, ComponentName.SourceState, ComponentName.Logger],
);
```

Finally, we are mentioning the type `VideoStateContext` in the subscriber functions, but it is not yet declared:

```ts
export type VideoStateContext = ContextHaving<
  Dependencies,
  ResizeTrackerExports,
  ContextUsing<[StoreEffectFactory<'videoElementState', VideoElementStateAtom>, ResizeObserverEffect], ContextWithState>
>;
```

Alright, this completes the effect part of our package. If you run this, you should see logs when you resize the video element. To run it, edit the [index.html](./static/index.html) file and load the package file (copy the existing ones), then add the package file like the others. Then you can go ahead and start `npm run serve`.

---

There is still something missing though. No other packages can reuse the work that we have done. We should write our resize data to a state atom and export it from the package, so that is now possible.

Let's see how to do that.

The first thing that we need is the state atom. Let's call it `ElementSizeStateAtom`.

Create a file called `ElementSizeStateAtom.ts`.

In there we will need the following code:

```ts
import type { ContextWithState } from '../../../types/framework/ExecutionContext';

interface ElementSizeState {
  entries: ResizeObserverEntry[];
}

export type ElementSizeStateAtom = ReturnType<typeof createElementSizeStateAtom>;

export function createElementSizeStateAtom(context: ContextWithState) {
  const initialState: ElementSizeState = { entries: [] };

  return context.effects.state.create(initialState, {
    // This is a `modifier`, it is allowed to modify the passed state and return true
    set: (state: ElementSizeState, entries: ResizeObserverEntry[]) => {
      if (state.entries == entries) {
        return false;
      }
      state.entries = entries;
      return true;
    },
  });
}
```

What we have done here is to define a function that, given a context, uses the `state.create` function from the effects to create a state atom with an initial value. This in fact just wraps the initial value with its modifiers and returns an atom that is ready to be used.

> **_NOTE:_** The modifier is responsible **_for returning `true` if the state was changed, and also for not modifying the state unless `true` is returned_**. This keeps garbage collection to a minimum, which is always a concern when using atomic immutable state. In this implementation, the responsibility is on the implementer, but the rule is very simple.

Next, we will export the atom, and make sure it is instantiated by the package.

Back in `ElementSizeTracker.package.ts`, update the package exports to look like this:

```ts
export enum ElementSizeTrackerExportNames {
  ElementSizeStateAtom = 'element-size-tracker-state-atom',
}

export type ElementSizeTrackerExports = {
  [ElementSizeTrackerExportNames.ElementSizeStateAtom]: ElementSizeStateAtom;
};
```

This allows other packages to know about your state atom, from the typing perspective. Now we will actually put the atom in the registry.

Update the main package function code to include the following (only lines 2, 6 and 9 are new):

```ts
//[snip...]
const videoElementState = createVideoElementStateAtom(contextWithState);
const resizeTrackerState = createResizeTrackerStateAtom(contextWithState);

const contextWithVideoState = contextWithState
  .using(StoreEffectFactory('videoElementState', videoElementState))
  .using(StoreEffectFactory('elementSizeState', resizeTrackerState))
  .using(ResizeObserverEffectFactory);

// make our state atom available to all packages
baseContext.registry.set(ElementSizeTrackerExportNames.ElementSizeStateAtom, resizeTrackerState);

const sourceState = baseContext.registry.get(ComponentName.SourceState);
//[endsnip...]
```

This creates the state, adds it to the context our subscribers are called on, and sets it on the registry for other packages to find.

We will also update our `VideoStateContext` type:

```ts
export type VideoStateContext = ContextHaving<
  Dependencies,
  ResizeTrackerExports,
  ContextUsing<
    [
      StoreEffectFactory<'videoElementState', VideoElementStateAtom>,
      StoreEffectFactory<'elementSizeState', ElementSizeStateAtom>,
      ResizeObserverEffect,
    ],
    ContextWithState
  >
>;
```

Finally, we will dispatch the new entry as it arrives. Update the `videoElementSubscriber` callback with the following.

```ts
const video = videoElementState.element;

if (video === undefined) {
  return;
}

const { state, store, resize } = context.effects;
const { elementSizeState } = store;

const logger = context.registry.get(ComponentName.Logger);

resize.subscribe(video, entry => {
  logger.log('[RT]', entry);
  // The second and following parameters to `dispatch` correspond to the second
  // and following parameters to the modifier we defined above. Here there is only one.
  state.dispatch(elementSizeState.set, entry);
});

return context.effects.loop(context.abortSignal);
```

Et voilà! We can now track the resizing of the video element in the state, using a thread safe effect to interact with the browser and an atomic state atom that can be subscribed to from any thread!

---

If anything is unclear, the whole code for this is in [resize-tracker](./src/examples/resize-tracker). (I know that was sneaky, but I wanted you to follow the tutorial first :D )
