import { Observable as O } from 'rxjs';
import delay from 'xstream/extra/delay';
import { DOMSource, VNode } from '@cycle/dom';

import {
    SortableOptions,
    StartPositionOffset,
    Transform,
    EventDetails
} from './definitions';
import { applyDefaults, addKeys } from './helpers';
import { handleEvent } from './eventHandlers';

export {
    SortableOptions,
    Transform,
    EventHandler,
    EventDetails
} from './definitions';

function remember(stream) {
    return stream.publishReplay(1).refCount();
}
function multicast(stream) {
    return stream.publish().refCount();
}

export function trace(id = '') {
    return source =>
        source
            .startWith(`start`)
            .map(x => {
                if (x === `start`) {
                    console.log(`starting ${id}`);
                }
                return x;
            })
            .filter(x => x !== `start`)
            .catch((e, orig$) => {
                return O.throw(e);
            })
            .finally(e => {
                return console.log(`ending ${id}`, e);
            });
}

function augmentEvent(ev: any): MouseEvent {
    const touch: any = (ev as any).touches[0];
    ev.clientX = touch.clientX;
    ev.clientY = touch.clientY;
    return ev;
}

function augmentStartDistance(
    ev: any,
    startX: any,
    startY: any
): StartPositionOffset {
    ev.distX = ev.clientX - startX;
    ev.distY = ev.clientY - startY;
    return ev;
}

function moreThanOneChild(node: VNode) {
    if (Array.isArray(node)) {
        throw new Error('Composed stream should emit VNodes not arrays');
    }

    return !node || node.children.length > 1;
}

function notMoreThanOneChild(node: VNode) {
    return !moreThanOneChild(node);
}

/**
 * Can be composed with a Stream of VNodes to make them sortable via drag&drop
 * @param {DOMSource} dom The preselected root VNode of the sortable, also indicates the area in which the ghost can be dragged
 * @param {SortableOptions} options  @see {SortableOptions}
 * @return {Transform<VNode, VNode>} A function to be composed with a view VNode stream
 */
export function makeSortable<T>(
    dom: DOMSource,
    options?: SortableOptions
): (s: T) => T {
    return sortable => {
        const dom$ = remember(sortable);

        const moreThanOneChild$ = dom$.filter(moreThanOneChild);
        const notMoreThanOneChild$ = dom$.filter(notMoreThanOneChild);
        const out$ = O.merge(
            notMoreThanOneChild$,
            moreThanOneChild$.map(addKeys).switchMap(node => {
                const defaults: SortableOptions = applyDefaults(
                    options || {},
                    node
                );
                const down$ = multicast(
                    O.merge(
                        dom.select(defaults.handle).events('mousedown'),
                        dom
                            .select(defaults.handle)
                            .events('touchstart')
                            .map(augmentEvent)
                    )
                    //.let(trace('down'))
                );

                const up$ = multicast(
                    O.merge(
                        dom.select('body').events('mouseleave'),
                        dom.select('body').events('mouseup'),
                        dom.select(defaults.handle).events('touchend')
                    )
                    //.let(trace('up'))
                );

                const move$ = multicast(
                    O.merge(
                        dom.select('body').events('mousemove'),
                        dom
                            .select(defaults.handle)
                            .events('touchmove')
                            .map(augmentEvent)
                    )
                    //.let(trace('move'))
                );

                const mousedown$: O<any> = multicast(
                    down$.switchMap(ev =>
                        O.of(ev)
                            .delay(defaults.selectionDelay)
                            .takeUntil(O.merge(up$, move$))
                    )
                    //.let(trace('mousedown'))
                );

                const mouseup$: O<any> = multicast(
                    mousedown$.switchMap(_ => up$.take(1))
                    //.let(trace('mouseup'))
                );

                const mousemove$: O<any> = multicast(
                    mousedown$.switchMap(start => {
                        return move$
                            .map(ev =>
                                augmentStartDistance(
                                    ev,
                                    start.clientX,
                                    start.clientY
                                )
                            )
                            .takeUntil(mouseup$);
                        //.let(trace('mousemove'));
                    })
                );

                const event$: O<any> = O.merge(
                    mousedown$,
                    mouseup$,
                    mousemove$
                );

                return event$
                    .startWith(node)
                    .scan((acc, curr) => handleEvent(acc, curr, defaults));
            })
        );

        return out$ as any;
    };
}

/**
 * Returns a stream of swapped indices
 * @param {DOMSource} dom a DOMSource containing the sortable
 * @param {string} parentSelector a valid CSS selector for the sortable parent (not the items)
 * @return {O<EventDetails>} an object containing the new positions @see EventDetails
 */
export function getUpdateEvent(
    dom: DOMSource,
    parentSelector: string
): O<EventDetails> {
    return (dom.select(parentSelector).events('updateOrder') as any)
        .delay(10) //Allow mouseup to execute properly
        .map(ev => ev.detail);
}
