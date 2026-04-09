import { describe, it, expect } from 'vitest';
import { findEnclosingLoop } from './loopContext';

describe('findEnclosingLoop', () => {
    it('returns loopVar when cursor is inside a matching for loop', () => {
        const doc = '{% for item in order.items %}HERE{% endfor %}';
        const cursor = doc.indexOf('HERE');
        expect(findEnclosingLoop(doc, cursor, 'order.items')).toEqual({ loopVar: 'item' });
    });

    it('returns the outer loop var when cursor is in nested loops', () => {
        const doc =
            '{% for item in order.items %}{% for tag in item.tags %}HERE{% endfor %}{% endfor %}';
        const cursor = doc.indexOf('HERE');
        expect(findEnclosingLoop(doc, cursor, 'order.items')).toEqual({ loopVar: 'item' });
    });

    it('resolves outer array when inner loop iterates a different array', () => {
        const doc =
            '{% for item in order.items %}{% for tag in user.tags %}HERE{% endfor %}{% endfor %}';
        const cursor = doc.indexOf('HERE');
        expect(findEnclosingLoop(doc, cursor, 'order.items')).toEqual({ loopVar: 'item' });
    });

    it('returns null when cursor is after a closed matching loop', () => {
        const doc = '{% for item in order.items %}x{% endfor %}HERE';
        const cursor = doc.indexOf('HERE');
        expect(findEnclosingLoop(doc, cursor, 'order.items')).toBeNull();
    });

    it('returns null when cursor is inside a loop over a different array', () => {
        const doc = '{% for u in users %}HERE{% endfor %}';
        const cursor = doc.indexOf('HERE');
        expect(findEnclosingLoop(doc, cursor, 'order.items')).toBeNull();
    });

    it('returns null for an empty document', () => {
        expect(findEnclosingLoop('', 0, 'order.items')).toBeNull();
    });

    it('does not crash on a malformed for with no endfor', () => {
        const doc = '{% for item in order.items %}HERE';
        const cursor = doc.indexOf('HERE');
        expect(findEnclosingLoop(doc, cursor, 'order.items')).toEqual({ loopVar: 'item' });
    });

    it('tolerates whitespace variations', () => {
        const tight = '{%for item in order.items%}HERE{%endfor%}';
        expect(
            findEnclosingLoop(tight, tight.indexOf('HERE'), 'order.items'),
        ).toEqual({ loopVar: 'item' });

        const loose = '{%   for   item    in    order.items   %}HERE{%   endfor   %}';
        expect(
            findEnclosingLoop(loose, loose.indexOf('HERE'), 'order.items'),
        ).toEqual({ loopVar: 'item' });
    });
});
