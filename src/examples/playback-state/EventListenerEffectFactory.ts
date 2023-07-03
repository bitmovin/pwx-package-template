import type { Unsubscribe } from '../../../types';
import type { AnyExecutionContext } from '../../../types/framework/ExecutionContext';
import type { Step } from '../../../types/framework/Pipeline';
import { createEffectFactory } from '../../framework-exports/EffectFactory';
import { createPipeline } from '../../framework-exports/Pipeline';

export type EventListenerEffect = typeof EventListenerEffectFactory;

/**
 * HTMLElement.addEventListener is an overloaded function.
 * This is a utility type that extracts the event type of
 * that function.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type IntersectionOfFunctionsToTuple<F> = F extends {
  (event: infer A, ...rest: any[]): void;
  (event: infer B, ...rest: any[]): void;
  (event: infer C, ...rest: any[]): void;
}
  ? [A, B, C]
  : F extends {
      (event: infer A, ...rest: any[]): void;
      (event: infer B, ...rest: any[]): void;
    }
  ? [A, B]
  : F extends {
      (event: infer A, ...rest: any[]): void;
    }
  ? [A]
  : never;
/* eslint-enable @typescript-eslint/no-explicit-any */

type ElementEventMap<Element extends HTMLElement> = IntersectionOfFunctionsToTuple<Element['addEventListener']>[1];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventSubscriber<EventKey extends keyof HTMLElementEventMap> = Step<any, HTMLElementEventMap[EventKey], any>;

type EventUnsubscribeFunctionMap = Map<HTMLElement, Map<keyof HTMLElementEventMap, Unsubscribe[]>>;

function subscribe<Element extends HTMLElement, EventKey extends ElementEventMap<Element>>(
  context: AnyExecutionContext | undefined,
  unsubscribeElementMap: EventUnsubscribeFunctionMap,
  element: Element,
  event: EventKey,
  subscriber: EventSubscriber<EventKey>,
): Unsubscribe {
  if (context === undefined) {
    throw new Error('Encountered undefined ExecutionContext in EventListenerEffect');
  }

  const elementUnsubscribers =
    unsubscribeElementMap.get(element) ?? new Map<keyof HTMLElementEventMap, Unsubscribe[]>();
  const eventUnsubscribers = elementUnsubscribers.get(event) ?? [];
  const listenerPipeline = createPipeline(`${event}-subscriber`, subscriber);
  const listener = (event: HTMLElementEventMap[EventKey]) => context.fork(listenerPipeline, event);

  const unsubscribe = () => {
    element.removeEventListener(event, listener);

    const unsubscribeIndex = eventUnsubscribers.indexOf(unsubscribe);

    if (unsubscribeIndex > -1) {
      eventUnsubscribers.splice(unsubscribeIndex, 1);
    }
  };

  eventUnsubscribers.push(unsubscribe);
  element.addEventListener(event, listener);

  elementUnsubscribers.set(event, eventUnsubscribers);
  unsubscribeElementMap.set(element, elementUnsubscribers);

  return unsubscribe;
}

/**
 * EventListenerEffectFactory
 * Ensures structured concurrency is honored by automatically removing HTMLElement event listeners
 * when execution of the associated `Pipeline` finishes.
 *
 * We want to make sure we remove listeners once the thread has finished running, instead of achieving this by manually
 * removing events when `AbortSignal.aborted` on the outside, we can introduce an `Effect` that will do this for us
 * automatically. This is where `EventListenerEffectFactory` comes into place.
 *
 * It keeps track of all added listeners, and removes them when the effect is removed.
 */
export const EventListenerEffectFactory = createEffectFactory(context => {
  const unsubscribeElementMap = new Map<HTMLElement, Map<keyof HTMLElementEventMap, Unsubscribe[]>>();

  return {
    effect: {
      events: {
        subscribe: <Element extends HTMLElement, EventKey extends ElementEventMap<Element>>(
          element: Element,
          event: EventKey,
          subscriber: EventSubscriber<EventKey>,
        ) => subscribe(context, unsubscribeElementMap, element, event, subscriber),
      },
    },
    removeEffect() {
      for (const [_, listenerMap] of unsubscribeElementMap) {
        for (const [_, unsubscribeFunctions] of listenerMap) {
          for (const unsubscribe of unsubscribeFunctions) {
            unsubscribe();
          }
        }
      }

      unsubscribeElementMap.clear();
    },
  };
});
