Welcome to the Player Web X (often referred to as PWX) package template repository!!

This README is designed to help you get to grips with the new framework and player, and to help you interact with them through one or more packages. We do not expect it will answer all your questions, so you should not hesitate to ask us about anything!

Please note: this repository is designed to help you get from 0 to a working package. If you just need a player, please check out our already built bundles in the main player package: https://www.npmjs.com/package/@bitmovin/player-web-x

Please read through this readme before you dive into the codebase. But first, run `npm ci` to bring in the framework and player npm packages, in order to have access to the types and the framework helpers.
 
The framework we built for our player is conceptually separated into a Structured Concurrency implementation, a package system, and an effect system. The domain logic and any surrounding code is added to an instantiation of this framework as a package, as you will see. The player itself is in fact built as a composition of packages.

## Framework Architecture

In order to successfully write a package for PWX, it is necessary to understand how the framework works. This is because you need to understand how the part of the player codebase that you wish to interact with is actually executing, and what assumptions it is making about the state of the environment it runs in.

The framework is composed of several things which work together to support the player (or another application):

 - A structured concurrency implementation
 - An effect system
 - A package system

 On top of these things, and relying on them are the player building blocks;

 - State management effect
 - Network effect

 ### Structured concurrency

The shortest way to explain Structured Concurrency is simply to say that it makes sense that when a thread or promise is created, any errors that it throws should propagate up to the creating thread or promise. That parent should either handle the error, or cancel gracefully all sibling threads, then propagate the error upwards. There are many more, and better, explanations online. We recommend that you read at least our overview at https://bitmovin.com/structured-concurrency-matters-developers/, or https://vorpus.org/blog/notes-on-structured-concurrency-or-go-statement-considered-harmful/

That is what our structured concurrency implementation does. Execution happens through Tasks, which are in fact standard async functions, which take however as a first parameter a `context`. This context exposes a `fork` method. This method can be used to execute a different Task, (or more than one), as children of the context. These children can be canceled, in which case cancelation propagates down. They can also throw, in which case the current scope will be passed the error.

This ensures that whole subtrees can be canceled at once, and dangling promises and so on are an impossibility. It also means that all execution is performed in a tree of dependent executions (although as this is in Javascript, only one execution is actually running at once, but the model still holds). In short, it makes execution of concurrent routines possible to reason about.

### Context and effects system

As explained above the structured concurrency implementation effectively corrals all executing code into an execution tree, where execution (and cancelation) travel down, but errors propagate up. However some things are still outside of this tree, like the browser apis that we use, as they are global, and cannot disappear, but may throw errors. This topic ties in with the general side effects topic, where certain things have an effect which is parallel to the execution tree (in structured concurrency or not) like logging for example, or state management. To properly define these things, as well as to be able to mock them for testing easily, we have designed an effects system, where certain things are made available to the executing code via the context, which already exposes one side effect: forking.

Note that the effect system in our framework is not as strict as a functional programming effect system. Essentially, effects are loosely defined as "things that come from or modify the environment that the code is running in". Another way of thinking about it is to notice that the effects are basically what connect the leaves and nodes of the execution tree to the environment in which it exists.

### Package system

On its own, the framework doesn't "do" anything - it does not implement any business logic. It offers the above capabilities, but all code destined to be run in the context of an application - in our case the video player - must be loaded as a package. Of course, this means that packages are structured concurrency aware.

Each package is defined by what behaviours it exports, what API it exposes, and what behaviours it relies on. These things are defined in the package file, and as they are just types, can be imported from other packages. Therefore, packages can rely on each other as dependencies.

Behaviours are in fact Tasks, and they are lazily executed by the framework when all of their dependencies are met. This can happen multiple times, which is a useful property in our video player as we can run package code for each source, for example for subtitle handling.

All these dependencies are managed via the registry.

### State

Building upon our effects system, and the structured concurrency, our state uses the concept of `atoms` like [Jotai](https://jotai.org/) or [Recoil](https://recoiljs.org/), but in a structured concurrency aware way. To do this, the system differentiates between state atoms created via the state effect, which exist independently and track a value of a single type, and the state effect itself, which allows a thread to subscribe to changes to a given atom. An example of an atom creation with a default value can be found [here](./src/examples/segment-download-statistics/DownloadInfoAtom.ts).

In this way, it is possible to manage state while still being able to cancel execution or propagate errors safely and consistently.

You can listen to state atoms and subscribe to changes. Subscriptions are Tasks that are passed the new state. Should a new change happen, the Task execution can be cancelled in favour of a new execution with the new state.

## Player architecture

While the player architecture and data structures are not developed in this repository, here is a quick overview. As you will see in the index file, the player is loaded in several packages:

### Core package

This package loads the core state atoms and Tasks that everything else depends on, and concern the data structures that the player uses to function. Segments, Tracks and Streams are introduced in this package.

### Data package

This package loads the data Task, which builds on the Network Task but is streaming aware.

### HLS package

The Task that parse HLS manifests and add the resulting data structures to the core state (from the core package) are housed here.

### Network package

Along with the fetch Task, which is concerned with fetching things (you can think of it like a cancelable fetch implementation), the network Task is located in this package. This Task implements a cancelable, retryable network request, which is tracked in the NetworkAtom which is also located here.

### Presentation package

The Presentation Task contained in this package reacts to the source state (see below) and keeps the video element updated. It also updates the state based on input from the video element.

### Source package

Introduces the notion of source, via the Source Task. It starts the download and parsing of the manifest, which leads to segments being downloaded. It also is where the source state type is housed.

### Sources api package

This package is the last piece of the puzzle, as it exposes the api that allows the user to actually add (and remove) a source. It also manages the video element and passes it in to the source Task.

Note: It may not be entirely obvious from the above description, but because of the way the structured concurrency separates things, this implementation is multi-source by default, meaning that it is easy to create a playlist implementation.

### State atoms

You can find all the currently available state atoms in the [types](./types) folder. The most interesting atoms are probably the [SourceStateAtom](./types/atoms/SourceStateAtom.d.ts) and [StreamAtom](./types/atoms/stream/StreamAtom.d.ts), with the former being used throughout Player Web X to track the state associated to a specific source, and the latter being the representation of the stream's manifest that the player uses internally.

(As a reminder, the player data structures and architecture are still under development and will change.)

#### SourceStateAtom

Holds all information required by the player to play back any given source. For example, the `url` of the source's manifest, the `activeTracks` that we're updating the manifest for, the `video` element that's currently used for playback or the `stream` that represents the manifest that has been loaded.

#### StreamAtom

This is a streaming protocol agnostic representation of an adaptive streaming manifest that used by the player. It uses the concepts of [Segments](./types/atoms/segment/SegmentAtom.d.ts), [Tracks](./types/atoms/track/TrackAtom.d.ts) and [SelectionGroups](./types/atoms/selection-group/SelectionGroupAtom.d.ts).

## Layout

- [src/examples](./src/examples) holds the source code to the example packages
- [out](./out) is where the build scripts output the example packages once built
- [static](./static) is the directory where the html demo file is served from
- [build](./build) is the build system folder

## Examples

Now that you have an overview of the whole system, it would be the right time to read through all the examples in the [examples directory](./src/examples) and try to understand how a package is defined, and how it is running. A good way of thinking about it is to approach it from a reactive standpoint, where state and state changes form the basis of execution.

## Demo page

We've included in this repository a demo html page, which ties all the different parts together.

In order to run it, from the root directory of this project, run:

```
npm ci
npm run serve
```

The build tool will use as an entrypoint any file ending with `.package.ts` in the `src` directory, and output the resulting bundles (one per entrypoint) to the `out` directory.

Note: you can also run `npm run build` if you just want to build the examples.

You can then navigate to http://localhost:8080/ in Chrome to see the player running. Follow the instructions on the page, and read the commented html source.

## Questions?

Once again, please do not hesitate to ask any questions you may have. You can file an issue in this repository, or talk to us using one of our normal communication channels, like email or a shared Slack channel. We welcome any input, as it helps us improve our framework and player for you.