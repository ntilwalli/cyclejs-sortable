import { VNode } from '@cycle/dom';
import { select } from 'snabbdom-selector';
import {
    EventHandler,
    MouseOffset,
    StartPositionOffset,
    ItemDimensions,
    Intersection
} from '../definitions';

import {
    updateGhostStyle,
    findParent,
    getIntersection,
    getArea,
    addAttributes,
    replaceNode
} from '../helpers';

/**
 * Used to adjust the position of the ghost and swap the items if needed
 * @type {EventHandler}
 */
export const mousemoveHandler: EventHandler = (node, event, options) => {
    const parent: VNode = select(options.parentSelector, node)[0];
    const ghost: VNode = parent.children[parent.children.length - 1] as VNode;

    // Hack for now.  Immediately after the mouse down event if the mousemove
    // handler gets called (as in the pointer gets moved very quickly) the ghost
    // VNode may not have been attached to the element yet causing ghost.elm to
    // be undefined, in which case we just return the node unchanged
    if (!ghost.elm) {
        return node;
    }

    const data_mouseoffset = ghost.data.attrs['data-mouseoffset'] as string;

    console.log('data_attrs', ghost.data.attrs);
    if (!Object.keys(ghost.data.attrs).length) {
        return node;
    }

    if (!data_mouseoffset) {
        return node;
    }
    //console.log('data_mouseoffset', data_mouseoffset, ghost.data.attrs)
    const mouseOffset: MouseOffset = JSON.parse(data_mouseoffset);

    const data_itemindex = ghost.data.attrs['data-itemindex'] as string;

    if (!data_itemindex) {
        return node;
    }

    const itemIndex: number = parseInt(data_itemindex);
    const item: VNode = parent.children[itemIndex] as VNode;
    const itemIntersection: number = getArea(
        getIntersection(item.elm as Element, ghost.elm as Element)
    );
    const itemArea: number = getArea(
        getIntersection(item.elm as Element, item.elm as Element)
    );

    const intersectionAreas: [number, number][] = parent.children
        .slice(0, -1)
        .map<Element>(c => (c as VNode).elm as Element)
        .map<Intersection>(e => getIntersection(e, ghost.elm as Element))
        .map<[number, number]>((e, i) => [getArea(e), i]);

    const maxIntersection: [number, number] = intersectionAreas.reduce(
        (acc, curr) => (curr[0] > acc[0] ? curr : acc)
    );

    const maxElement: Element = (parent.children[maxIntersection[1]] as VNode)
        .elm as Element;
    const maxArea: number = getArea(getIntersection(maxElement, maxElement));

    const newIndex: number =
        maxIntersection[1] === itemIndex
            ? itemIndex
            : -itemIntersection > maxArea - itemArea
              ? maxIntersection[1]
              : itemIndex;
    const ghostAttrs: { [attr: string]: string } = {
        style: updateGhostStyle(
            event as StartPositionOffset,
            mouseOffset,
            ghost.elm as Element
        ),
        'data-itemindex': newIndex.toString()
    };

    const filteredChildren: VNode[] = (parent.children as VNode[])
        .filter((e, i) => i !== itemIndex)
        .slice(0, -1);

    const newChildren: VNode[] = [
        ...filteredChildren.slice(0, newIndex),
        parent.children[itemIndex] as VNode,
        ...filteredChildren.slice(newIndex, filteredChildren.length)
    ];

    return replaceNode(
        node,
        options.parentSelector,
        Object.assign({}, parent, {
            children: [...newChildren, addAttributes(ghost, ghostAttrs)]
        })
    );
};
