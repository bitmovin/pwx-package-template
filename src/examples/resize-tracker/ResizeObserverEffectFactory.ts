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
  const listenerPipeline = createPipeline(`element-resize-observer`, subscriber);
  const listener: ResizeObserverCallback = (entries: ResizeObserverEntry[]) => context.fork(listenerPipeline, entries);

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
