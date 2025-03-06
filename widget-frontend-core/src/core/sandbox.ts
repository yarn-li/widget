/**
 * Get asynchronous function prototype.
 * Then, we can construct instances of async function.
 */
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

/**
 * A normal code execution space.
 * Any asynchronous result will not return!
 */
export function StandardExecutor(accessible: Record<string, any>, script: string) {
    const sandbox = {window: null, document: null, eval: null, ...accessible}
    const args = Array.from(Object.keys(sandbox))
    const rArgs = args.map(n => sandbox[n])
    return (new Function(...args, script))(...rArgs)
}

/**
 * Execute a segment of code in using asynchronous way.
 * Don't forget to add 'await' keyword!
 */
export async function AsynchronousExecutor(accessible: Record<string, any>, script: string) {
    const sandbox = {document: null, eval: null, window: null, ...accessible}
    const args = Array.from(Object.keys(sandbox))
    const rArgs = args.map(n => sandbox[n])
    return await (new AsyncFunction(...args, script))(...rArgs)
}
