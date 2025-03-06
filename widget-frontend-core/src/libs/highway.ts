/* Bus protocol
 * Highway class is a custom publish/subscribe model,
 * which provides basic notification and trigger functions.
 */

// Highway implementation
// Provide a kind of publish/subscribe model.
// Provide several public interface for the external:
//   1. subscribe (topic)
//   2. emit/publish (event trigger)
export class Highway {
    // Design mode of Singleton
    // But I didn't limit constructor of this class.
    public static self = new Highway()
    // A map is used to collect listeners.
    protected handles = new Map()
    // Framework method, to trigger the related callback functions.
    protected dispatch = (id, ...args) => {
        if (!this.handles.has(id)) return
        this.handles.get(id).forEach(handle => {
            try {
                handle(...args)
            } catch (e) {
                console.error(e)
            }
        })
        return this
    }
    // Subscribe a topic before using Highway bus.
    public subscribe(id, handle = (...args) => {}) {
        if (!this.handles.has(id)) {
            this.handles.set(id, [])
        }
        this.handles.get(id).push(handle)
        return this
    }
    // Emit event to Highway bus.
    public emit = (id, ...args) => this.dispatch(id, ...args)
    // Same as emit method.
    public publish = this.emit
    protected getHandles() {
        return this.handles
    }
    public unsubscribe(id) {
        this.handles.delete(id)
        return this
    }
    public clear() {
        this.handles.clear()
        return this
    }
}

export default Highway.self