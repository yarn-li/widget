import {exists, isObject} from "../utils/functools.ts";

const PATTERN_REFERENCE_ID = /^#(\/[a-zA-Z_][a-zA-Z0-9_.-]*)+$/

export function isRef(_schema) {
    return exists(_schema, '$ref')
}

export function isArraySchema(schema) {
    return schema['type'] === 'array'
}

export function getRef(root, _schema) {
    return search(root, _schema['$ref'].substring(2))
}

export function isOneOf(_schema) {
    return exists(_schema, 'discriminator')
}

export function search(root, objectPath: string) {
    const pathSeq = objectPath.split('/').filter(s => s !== '')
    if (pathSeq.length === 0)
        return null
    let _node = root
    let i = 0
    while (i < pathSeq.length) {
        const _key = pathSeq[i]
        if (!exists(_node, _key))
            return null
        _node = _node[_key]
        i++
    }
    return _node
}

export function traverse(schema, callback: (schema) => any = undefined, after: (schema) => any = undefined) {
    if (exists(callback)) callback(schema)
    if (isRef(schema)) return
    if (isOneOf(schema)) {
        const {discriminator} = schema
        const {mapping} = discriminator
        Object.values(mapping).forEach(_schema => traverse(_schema, callback, after))
        return
    }
    const {type} = schema
    if (type === 'object') {
        const {properties} = schema
        Object.values(properties).forEach(_schema => traverse(_schema, callback, after))
        return
    }
    if (type === 'array') {
        const {items} = schema
        Object.values(items).forEach(_schema => traverse(_schema, callback, after))
    }
    if (exists(after)) after(schema)
}

export function checkGeneric(inode, xpath) {
    if (exists(inode, '$ref') && checkRef(inode, xpath)) return
    if (exists(inode, 'oneOf') && checkOneOf(inode, xpath)) return
    if (!exists(inode, 'type'))
        throw new Error(`${xpath} : openapi node must specify one of type/$ref/oneOf`)
    const {type} = inode
    if (!['object', 'array', 'string', 'number', 'boolean', 'null'].includes(type))
        throw new Error(`${xpath}/type : openapi type must be one of object/array/number/string/boolean/null`)
    if (type === 'object' && checkObject(inode, xpath)) return
    if (type === 'array' && checkArray(inode, xpath)) return
}

export function checkObject(inode, xpath) {
    if (!exists(inode, 'properties'))
        throw new Error(`${xpath} : openapi object must specify properties`)
    const {properties} = inode
    if (!isObject(properties))
        throw new Error(`${xpath} : openapi object's properties must be an object`)
    for (let field in properties)
        checkGeneric(properties[field], `${xpath}/properties/${field}`)
    return true
}

export function checkArray(inode, xpath) {
    if (!exists(inode, 'items'))
        throw new Error(`${xpath} : openapi array must specify items`)
    const {items} = inode
    if (!isObject(items))
        throw new Error(`${xpath} : openapi array's items must be an object`)
    checkGeneric(items, `${xpath}/items`)
    return true
}

export function checkRef(inode, xpath) {
    const {$ref} = inode
    if (!PATTERN_REFERENCE_ID.test($ref))
        throw new Error(`${xpath} : invalid openapi $ref path`)
    return true
}

export function checkOneOf(inode, xpath) {
    const {oneOf, discriminator} = inode
    if (!Array.isArray(oneOf))
        throw new Error(`${xpath} : openapi oneOf must be an array`)
    for (let i = 0; i < oneOf.length; i++)
        checkGeneric(oneOf[i], `${xpath}/oneOf[${i}]`)
    if (discriminator && (!exists(discriminator, 'propertyName') || !exists(discriminator, 'mapping'))) {
        throw new Error(``)
    } else if (discriminator) {
        const {propertyName, mapping} = discriminator
        if (!isObject(mapping))
            throw new Error(`${xpath}/discriminator/mapping : openapi discriminator's mapping must be an object`)
        for (let field in mapping)
            checkGeneric({"$ref": mapping[field]}, `${xpath}/discriminator/mapping`)
    }
    return true
}