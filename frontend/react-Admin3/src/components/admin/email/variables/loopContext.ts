/**
 * Pure helper: given document text, a cursor offset, and an array path,
 * determine whether the cursor sits inside a `{% for X in <arrayPath> %}`
 * loop. Returns the loop variable name if so, otherwise null.
 *
 * No CodeMirror or React imports — easy to unit test.
 */

export interface LoopMatch {
    loopVar: string;
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Scan backwards through `documentText` up to `cursorOffset` for template
 * for/endfor tags, honoring nesting. Returns the loop variable of the
 * innermost open `{% for ... in <arrayPath> %}` at the cursor, or null if
 * there is no enclosing loop whose iterable equals `arrayPath`.
 *
 * Tolerant of whitespace variations:
 *   `{% for item in order.items %}`
 *   `{%for item in order.items%}`
 *   `{%   for  item   in   order.items   %}`
 */
export function findEnclosingLoop(
    documentText: string,
    cursorOffset: number,
    arrayPath: string,
): LoopMatch | null {
    const before = documentText.slice(0, cursorOffset);
    // arrayPath is validated/escaped even though it comes from trusted data.
    void escapeRegex; // keep helper exported-shape stable

    // Match either a for tag or an endfor tag.
    // Group 1 = loop variable (only set on for tags)
    // Group 2 = iterable path (only set on for tags)
    const tagRe = /\{%\s*for\s+(\w+)\s+in\s+([\w.\[\]]+)\s*%\}|\{%\s*endfor\s*%\}/g;

    interface Tag {
        isFor: boolean;
        loopVar?: string;
        iterable?: string;
    }

    const tags: Tag[] = [];
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(before)) !== null) {
        if (m[1] !== undefined) {
            tags.push({ isFor: true, loopVar: m[1], iterable: m[2] });
        } else {
            tags.push({ isFor: false });
        }
    }

    // Build a stack of still-open for-loops at the cursor.
    const stack: Tag[] = [];
    for (const t of tags) {
        if (t.isFor) {
            stack.push(t);
        } else {
            stack.pop();
        }
    }

    // Walk outward from innermost; return the first still-open loop whose
    // iterable matches arrayPath.
    for (let i = stack.length - 1; i >= 0; i--) {
        const t = stack[i];
        if (t.isFor && t.iterable === arrayPath && t.loopVar) {
            return { loopVar: t.loopVar };
        }
    }
    return null;
}
