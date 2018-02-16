import { Observable } from 'rxjs';
import { run } from '@cycle/rxjs-run';
import { ul, li, makeDOMDriver, DOMSource, VNode } from '@cycle/dom';

import { makeSortable } from '../../../src/makeSortable';

type Sources = {
    DOM: DOMSource;
};

type Sinks = {
    DOM: Observable<VNode>;
};

function main({ DOM }: Sources): Sinks {
    const vdom$: Observable<VNode> = Observable.of(
        ul('.ul', [
            li('.li', '', ['You have to hold for 500ms to start reordering']),
            li('.li', '', ['Option 2']),
            li('.li', '', ['Option 3']),
            li('.li', '', ['Option 4']),
            li('.li', '', ['Option 5']),
            li('.li', '', ['Option 6'])
        ])
    ).let(
        makeSortable<Observable<VNode>>(DOM, {
            ghostClass: '.ghost',
            selectionDelay: 500
        })
    );

    return {
        DOM: vdom$
    };
}

run(main, {
    DOM: makeDOMDriver('#app')
});
