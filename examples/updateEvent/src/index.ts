import { Observable } from 'rxjs';
import { run } from '@cycle/rxjs-run';
import { ul, li, span, div, makeDOMDriver, DOMSource, VNode } from '@cycle/dom';

import { makeSortable, getUpdateEvent } from '../../../src/makeSortable';

type Sources = {
    DOM: DOMSource;
};

type Sinks = {
    DOM: Observable<VNode>;
};

function main({ DOM }: Sources): Sinks {
    const sortable$: Observable<VNode> = Observable.of(
        ul('.ul', [
            li('.li', '', ['Option 1']),
            li('.li', '', ['Option 2']),
            li('.li', '', ['Option 3']),
            li('.li', '', ['Option 4']),
            li('.li', '', ['Option 5']),
            li('.li', '', ['Option 6'])
        ])
    ).let(makeSortable<Observable<VNode>>(DOM));

    const update$: Observable<VNode> = getUpdateEvent(DOM, '.ul')
        .map(
            o =>
                'You changed item Number ' +
                (o.oldIndex + 1) +
                ' to postion ' +
                (o.newIndex + 1)
        )
        .startWith('You havent changed anything yet')
        .map(s => span('.span', s));

    const vdom$: Observable<VNode> = Observable.combineLatest(
        sortable$,
        update$
    ).map(arr => div([arr[0], arr[1]]));

    return {
        DOM: vdom$
    };
}

run(main, {
    DOM: makeDOMDriver('#app')
});
