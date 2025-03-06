import {async_execute, exists, getDefault, isObject, uuid} from "../utils/functools.ts";
import {Highway} from "../libs/highway.ts";
import {VNodeChild} from "@vue/runtime-core";
import * as lib_openapi from "./lib_openapi.ts";
import {internation} from "../ext/internationalization.ts";

export abstract class WidgetRule {
    type: string;
    message: string;

    protected constructor(type: string, message: string) {
        this.type = type
        this.message = message
    }

    abstract validate(data: any): boolean | Promise<boolean>;
}


type buildRule = (data: any) => WidgetRule
const RegisteredRules : Map<string, buildRule> = new Map();

/** Define a rule function. */
export function defineRule(name: string, builtin:(data: any) => WidgetRule ) {
    RegisteredRules.set(name, builtin)
    const info = window.probe.info()
    if (!('rules' in info)) info['rules'] = []
    info['rules'].push(name)
}

function hasXWidget(schema) {
    return exists(schema, 'widget')
}

export function traverse(schema, callback: (schema) => any, after: (schema) => any = () => {
}) {
    lib_openapi.traverse(schema, (schema) => {
        if (!hasXWidget(schema)) return
        callback(schema)
    }, (schema) => {
        if (!hasXWidget(schema)) return
        after(schema)
    })
}

export function extendedTraverse(
    schema, parent_uuid: string, loc: string = '',
    before: (schema, parent_uuid: string, loc: string) => any = () => {},
    after : (schema, parent_uuid: string, loc: string) => any = () => {}) {
    if (hasXWidget(schema)) { before(schema, parent_uuid, loc) }
    const getParentWidgetUUID = () => hasXWidget(schema) ? schema['widget']['_uuid'] : parent_uuid
    const {type} = schema
    if (type === 'object') {
        const {_map} = schema
        for (const key in _map)
            extendedTraverse(_map[key], getParentWidgetUUID(), `${loc}/${key}`, before, after)
    } else if (type === 'array') {
        const {_list} = schema
        for (let i = 0; i < _list.length; i++)
            extendedTraverse(_list[i], getParentWidgetUUID(), `${loc}/[${i}]`, before, after)
    }
    if (hasXWidget(schema)) { after(schema, parent_uuid, loc) }
}

function checkWidget(schema, xpath = '') {
    if (hasXWidget(schema))
        checkXWidget(schema, xpath)
    const {type} = schema
    if (type === 'object') {
        const {_map} = schema
        for (let key in _map)
            checkWidget(_map[key], `${xpath}/properties/${key}`)
        setRequiredXWidget(schema)
        return
    }
    if (type === 'array') {
        const {_list} = schema
        for (let i = 0; i < _list.length; i++)
            checkWidget(_list[i], `${xpath}/items[${i}]`)
        return
    }
}

function checkLayout(layout, xpath) {
    if (!exists(layout, 'type'))
        throw new Error(`layout lack of type`)
    if (exists(layout, 'children')) {
        const {children} = layout
        if (!Array.isArray(children))
            throw new Error(`layout children must be an array`)
        for (let i = 0; i < children.length; i++) {
            const child = children[i]
            checkLayout(child, `${xpath}/children[${i}]`)
        }
    }
}

function checkBindScripts(xWidget, xpath) {
    if (!exists(xWidget, 'bindScripts')) return
    const {bindScripts} = xWidget
    if (!isObject(bindScripts))
        throw new Error(`${xpath}/bindScripts must be an object`)
    for (let key in bindScripts) {
        const events = bindScripts[key]
        if (!isObject(events))
            throw new Error(`${xpath}/bindScripts/${key} : events must be an object`)
        for (let eventName in events) {
            if (!Array.isArray(events[eventName]))
                throw new Error(`${xpath}/bindScripts/${key}/${eventName} : event scripts must be an array`)
        }
    }
}

function checkScripts(xWidget, xpath) {
    if (!exists(xWidget, 'scripts')) return
    const {scripts} = xWidget
    if (!Array.isArray(scripts))
        throw new Error(`${xpath}/scripts must be an array`)
}

function checkRule(rule, xpath) {
    if (!exists(rule, 'type'))
        throw new Error(`${xpath}: rule lack of type`)
    // if (!exists(rule, 'message'))
    //     throw new Error(`${xpath}: rule lack of message`)
      return true
}

function checkRules(xWidget, xpath) {
    const widgetRule: Array<WidgetRule> = []
    if (!exists(xWidget, 'rules')) {
        xWidget['_validates'] = widgetRule
        return
    }
    const {rules} = xWidget
    if (!Array.isArray(rules))
        throw new Error(`${xpath}/rules must be an array`)
    for (let index = 0; index < rules.length; index++) {
        const rule = rules[index];
        if (checkRule(rule, `${xpath}/[${index}]`)) {
            if(!RegisteredRules.has(rule.type)) {
                throw new Error(`No such rule type : ${rule.type}`)
            }
            widgetRule.push(RegisteredRules.get(rule.type)(rule))
        }
    }
    xWidget['_validates'] = widgetRule
}

function checkXWidget(schema, xpath) {
    schema['label'] = getDefault(schema, 'label', '')
    schema['visible'] = getDefault(schema, 'visible', true)
    const xWidget = schema['widget']
    if (!exists(xWidget, 'type'))
        throw new Error(`${xpath}/widget : widget lack of type`)
    checkScripts(xWidget, `${xpath}/widget`)
    checkBindScripts(xWidget, `${xpath}/widget`)
    if (exists(xWidget, 'layout'))
        checkLayout(xWidget['layout'], `${xpath}/widget/layout`)
    checkRules(xWidget, `${xpath}/widget/rules`)
    xWidget['editable'] = getDefault(xWidget, 'editable', true)
    xWidget['required'] = false
    /** The line below doesn't make sense in new WIDGET framework! */
    xWidget['_uuid'] = uuid()
    // this.widgetViews.set(xWidget['_uuid'], schema)
    // const {type} = xWidget
    // if (!MoS.widgets.map(w => w.name).includes(type))
    //     throw new Error(`${xpath}/widget/type : no such widget : ${type}`)
    return true
}

function setRequiredXWidget(schema) {
    const {type} = schema
    if (type !== 'object' || !exists(schema, 'required') || !Array.isArray(schema['required'])) return
    const {_map, required} = schema
    for (let key in _map) {
        const property = _map[key]
        if (!hasXWidget(property))
            continue
        const xWidget = property['widget']
        xWidget['required'] = required.includes(key)
        if (xWidget['required']) {
            if (!RegisteredRules.has('required'))
                new Error(`No such rule type : required`)
            if (!exists(xWidget, '_validates'))
                xWidget._validates = []
            xWidget._validates.unshift(RegisteredRules.get('required')({type: 'required', message: `${internation.translate(property.label || '')} ${internation.translate('widget.notEmpty', '不能为空')}`, required: true}))
        }
    }
}

export const mbus = new Highway()
/**
 * @deprecated
 */
export interface XWidget {
    name: string;

    render(args: WidgetContext): VNodeChild;
}
/**
 * @deprecated
 */
export interface XLayout {
    type: string;

    render(layout: any, args: WidgetContext): VNodeChild;
}
/**
 * @deprecated
 */
export interface XBuiltin {
    name: string;
    handle: (context: WidgetContext, ...args) => any;
}
/**
 * @deprecated
 */
interface MoSType {
    widgets: Array<XWidget>;
    layouts: Array<XLayout>;
    builtins: Array<XBuiltin>;
}
/**
 * @deprecated
 */
const MoS: MoSType = {widgets: [], layouts: [], builtins: []}
/**
 * @deprecated
 */
export function defineWidget(w: XWidget) {
    MoS.widgets.push(w)
}
/**
 * @deprecated
 */
export function defineLayout(l: XLayout) {
    MoS.layouts.push(l)
}
/**
 * @deprecated
 */
export function defineBuiltin(b: XBuiltin) {
    MoS.builtins.push(b)
}
/**
 * @deprecated use WidgetContextObject as substitution.
 */
export class WidgetObject extends lib_openapi.OpenapiContextObject {
    protected views: Map<string, any> = new Map();

    protected constructor(protected schema: any) {
        super(schema)
        // this.validateOpenApi()
        checkWidget(this.treeView)
        traverse(this.treeView, (schema) => this.views.set(schema['widget']['_uuid'], schema))
    }

    static build(schema): WidgetObject {
        return new WidgetObject(schema)
    }

    activate() {
        this.hooks.emit('beforeCreate')
        this.lifecycle(this.treeView, WidgetContext.build(this, this.treeView))
        this.hooks.emit('afterCreate')
        return this
    }

    protected buildUserspace(vxiArgs: WidgetContext) {
        const sandbox = MoS.builtins.reduce((prev, curr) =>
            ({
                ...prev, [curr.name]: (...args) => {
                    try {
                        return curr.handle(vxiArgs, ...args)
                    } catch (e) {
                        console.error(e)
                    }
                }
            }), {})
        return {...sandbox, ...this.userspace}
    }

    protected lifecycle(schema, args: WidgetContext) {
        if (hasXWidget(schema)) {
            this.bindEvents(schema, args)
            const scripts = (exists(schema, 'lifeTime') && exists(schema['lifeTime'], 'afterCreated'))
                ? schema['lifeTime']['afterCreated'] : []
            if (scripts.length > 0)
                scripts.forEach(async script => await async_execute(this.buildUserspace(args), script))
        }

        const {type} = schema
        if (type === 'object') {
            const {_map} = schema
            for (const key in _map)
                this.lifecycle(_map[key], WidgetContext.next(args, `/${key}`, _map[key]))
        } else if (type === 'array') {
            const {_list} = schema
            for (let i = 0; i < _list.length; i++)
                this.lifecycle(_list[i], WidgetContext.next(args, `[${i}]`, _list[i]))
        }

        if (hasXWidget(schema)) {
            const scripts = (exists(schema, 'lifeTime')
                && exists(schema['lifeTime'], 'beforeMount'))
                ? schema['lifeTime']['beforeMount'] : []
            if (scripts.length > 0)
                scripts.forEach(async script => await async_execute(this.buildUserspace(args), script))
        }
    }

    protected bindEvents(schema, args: WidgetContext) {
        const self = this
        const templatePath = args.getXpath()
            .replaceAll(/\[-?\d+]/g, '')
            .replaceAll('/', '.')
        const xWidget = schema['widget']
        const route = args.getRoute()
        for (let i = route.length - 1; i > -1; i--) {
            const container = route[i]['widget']
            if (exists(container, 'bindScripts')) {
                const {bindScripts} = container
                for (const rtp /* relative template path */ in bindScripts) {
                    if (!templatePath.endsWith(rtp)) continue
                    const events = bindScripts[rtp]
                    for (const eventName in events) {
                        const scripts = events[eventName]
                        const topic = `uuid:${xWidget['_uuid']};event:${eventName}`
                        console.debug(`-- subscribe ${topic} xpath ${args.getXpath()}`)
                        mbus.subscribe(topic,
                            async () => {
                                for (const script of scripts)
                                    await async_execute(self.buildUserspace(args), script)
                            })
                    }
                }
            }
        }
    }

    linkage(schema, args: WidgetContext) {
        const route = args.getRoute()
        for (let i = route.length - 1; i > -1; i--) {
            const container = route[i]['widget']
            if (exists(container, 'scripts')) {
                const {scripts} = container
                for (const script in scripts) {
                    try {
                        async_execute(this.buildUserspace(args), script).then()
                    } catch (e) {
                        console.error(e)
                    }
                }
            }
        }
    }
}
/**
 * @deprecated Please use the newest widget framework
 */
export class WidgetContext {
    protected schema: any;
    protected xpath: string;
    protected route: Array<any>;
    protected widget: WidgetObject;

    private constructor() {
    }

    static build(widgetObject, schema, xpath = '', route = []) {
        const r = new WidgetContext()
        r.widget = widgetObject
        r.schema = schema
        r.xpath = xpath
        r.route = route
        return r
    }

    getXpath() {
        return this.xpath
    }

    getRoute() {
        return this.route
    }

    getXWidget() {
        return this.schema['widget']
    }

    getSchema() {
        return this.schema
    }

    getValue(): any {
        return this.schema['_value']
    }

    setValue(data) {
        if (exists(this.schema, 'oneOf')) {
            const type = this.schema.oneOf.map(ele => ele.type)
            this.schema['_value'] = lib_openapi.setOneOfValue(type, data)
        } else {
            this.schema['_value'] = lib_openapi.setStdValue(this.schema['type'], data)
        }
        this.widget.linkage(this.schema, this)
    }

    // Privileged attribute
    getPrivilegedAttribute(attr: string) {
        const key = `x-${attr}`
        return exists(this.schema, key) ? this.schema[key] : null
    }

    static next(args: WidgetContext, ipath: string, nextSchema): WidgetContext {
        return WidgetContext.build(args.widget, nextSchema, `${args.xpath}${ipath}`, [...args.route, args.schema])
    }

    static render(args: WidgetContext, layout: any = null) {
        if (layout === null)
            return WidgetContext._render(args)
        if (layout['type'] === 'widget')
            return WidgetContext._render(args)
        for (let i = 0; i < MoS.layouts.length; i++) {
            const layoutImpl = MoS.layouts[i]
            if (layoutImpl.type === layout['type'])
                return layoutImpl.render(layout, args)
        }
        return null
    }

    protected static _render(args: WidgetContext) {
        const {schema} = args
        if (!exists(schema))
            return null
        if (!hasXWidget(schema))
            throw new Error(`widget undefined`)
        const xWidget = schema['widget']
        for (let i = 0; i < MoS.widgets.length; i++) {
            const widget = MoS.widgets[i]
            if (widget.name === xWidget['type'])
                return widget.render(args)
        }
        return null
    }

    static renderObject(args: WidgetContext): VNodeChild | Array<VNodeChild> {
        const {schema} = args
        const {_map} = schema
        return Object.keys(_map).map(field => WidgetContext.render(WidgetContext.next(args, `/${field}`, _map[field])))
    }

    static renderArray(args: WidgetContext) {
        const {schema} = args;
        const {_list} = schema
        return _list.map((each, i) => WidgetContext.render(WidgetContext.next(args, `[${i}]`, each)))
    }
}
/**
 * Manage OpenApi instance data, and listen structure changes.
 * The newest substitution of WidgetObject and WidgetContext.
 * The highest manager in OpenApi module, stand in view of "Widget".
 */
export class WidgetContextObject extends lib_openapi.OpenapiContextObject {
    private _invalidContext: any = null
    /**
     * The unique way of constructing a WidgetContextObject
     */
    static build(schema: Record<string, any>) {
        return new WidgetContextObject(schema)
    }
    validateWidgetComponent(params: Record<string, any> = {}) {
        try {
            this.validateOpenApi(params)
            checkWidget(this.treeView)
            this._invalidContext = null
        } catch (e) {
            this._invalidContext = e
            console.error(e)
        }
    }
    /**
     * value set
     */
    setBasicComponentValue(node, value: any) {
        this.fillValue(node, value)
    }
    /**
     * errorMessage set
     * @param node 
     * @param message 信息
     */
    setBasicComponentErrorMessage(node, message: string) {
        this.fillErrorMessage(node, message)
    }

    /**
     * array item add
     */
    addContainerComponentItem(node, value, callback: (schema) => void = (schema) => {}) {
        const {items, _list} = node
        const xItems = node['x-items']
        const newOne = this.createObject({...items, ...xItems}, value)
        checkWidget(newOne)
        callback(newOne)
        _list.push(newOne)
        this.hooks.emit("structureChange")
    }
    /**
     * array items splice
     */
    spliceContainerComponentItem(arrayNode, from: number, length: number, callback: (schema) => void = (schema) => {}) {
        const {_list} = arrayNode
        if (from < 0 || from >= _list.length || length <= 0) return
        for (let i = from; i < Math.min(from + length, _list.length); i++)
            callback(_list[i])
        _list.splice(from, length)
        this.hooks.emit("structureChange")
    }
    /**
     * array clear
     */
    clearContainerComponent(node, callback: (schema) => void = (schema) => {}) {
        const {_list} = node
        if (_list.length === 0) return
        for (let i = 0; i < _list.length; i++)
            callback(_list[i])
        node['_list'] = []
        this.hooks.emit("structureChange")
    }
    /**
     * query schema
     */
    query(data: any) {
        let component = null
        if (exists(data, '$ref')) {
            component =  this.components.get(data['$ref'])
        }
        return Object.assign(data, component)
    }
}
