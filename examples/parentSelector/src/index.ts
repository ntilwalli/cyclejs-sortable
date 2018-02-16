import { Observable } from 'rxjs';
import { run } from '@cycle/rxjs-run';
import { ul, li, div, span, makeDOMDriver, DOMSource, VNode } from '@cycle/dom';

import { makeSortable } from '../../../src/makeSortable';

type Sources = {
    DOM: DOMSource;
};

type Sinks = {
    DOM: Observable<VNode>;
};

function main({ DOM }: Sources): Sinks {
    const vdom$: Observable<VNode> = Observable.of(
        div([
            span('.test', 'Test, should not move'),
            ul('.ul', [
                li('.class', '', ['Option 1']),
                li('.class', '', ['Option 2']),
                li('.class', '', ['Option 3']),
                li('.class', '', ['Option 4']),
                li('.class', '', ['Option 5']),
                li('.class', '', ['Option 6'])
            ])
        ])
    ).let(
        makeSortable<Observable<VNode>>(DOM, {
            parentSelector: '.ul'
        })
    );

    return {
        DOM: vdom$
    };
}

run(main, {
    DOM: makeDOMDriver('#app')
});
