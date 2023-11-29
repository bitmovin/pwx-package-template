import type { Unsubscribe } from '@bitmovin/player-web-x/framework-types/BaseTypes';
import type { AnyExecutionContext } from '@bitmovin/player-web-x/framework-types/execution-context/ExecutionContext';
import type { Task } from '@bitmovin/player-web-x/framework-types/task/Types';
import { createEffectFactory, createTask } from '@bitmovin/player-web-x/playerx-framework-utils';

export type ResizeObserverEffect = typeof ResizeObserverEffectFactory;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Subscriber = Task<any, ResizeObserverEntry[], any>;

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
  const listenerTask = createTask(`element-resize-observer`, subscriber);
  const listener: ResizeObserverCallback = (entries: ResizeObserverEntry[]) => context.fork(listenerTask, entries);

  const resizeObserver = new ResizeObserver(listener);

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

export const ResizeObserverEffectFactory = createEffectFactory(context => {
  const unobserverMap: UnobserverFunctionMap = new Map<HTMLElement, Unsubscribe[]>();

  return {
    effect: {
      resize: {
        subscribe: <Element extends HTMLElement>(element: Element, subscriber: Subscriber) =>
          subscribe(context, unobserverMap, element, subscriber),
      },
    },
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
