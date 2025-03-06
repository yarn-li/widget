import { WidgetRule, defineRule, exists } from "@widget-frontend/widget-frontend-core";

export class RequiredRule extends WidgetRule {
    required: boolean;
    constructor(message: string, required: boolean) {
        super('requiredRule', message)
        this.required = required
    }
    validate(data: any): boolean {
        if (this.required) {
            if (Array.isArray(data)) {
                return data.length > 0
            } else {
                return data !== '' && data !== null && data !== undefined
            }
        }
        return true
    }
}

defineRule(
    'required',
    (data) => {
        exists(data, 'required')
        return new RequiredRule(data['message'], data['required'])
    }
)


export class RegexRule extends WidgetRule {
    pattern: string;
    _regex: RegExp;
    constructor(message: string, pattern: string) {
        super('regex', message);
        this.pattern = pattern
        this._regex = new RegExp(this.pattern)
    }
    validate(data: any): boolean {
        return data ? this._regex.test(data) : true;
    }
}

defineRule(
    'regex',
    (data: any) => {
        exists(data, 'pattern')
        let pattern = data['pattern']
        if (pattern[0] !== '^')
            pattern = '^' + pattern
        if (pattern[pattern.length - 1] !== '$')
            pattern += '$'
        return new RegexRule(data['message'], pattern)
    }
)

interface numRange {
    min?: number,
    max?: number
}

interface lengthRange {
    minLength?: number,
    maxLength?: number
}


class NumRangeRule extends WidgetRule {
    range: Array<numRange>;
    constructor(message: string, range: numRange | Array<numRange>) {
        super('numberRange', message)
        this.range = Array.isArray(range) ? range : Array.of(range)
    }
    validate(data: any): boolean {
        return data || data === 0 ? this.range.some(range => (range['min'] === undefined || data >= range['min']) && (range['max'] === undefined || data <= range['max'])) : true
    }
}

defineRule('numberRange',
    (data) => {
        exists(data, 'numberRange')
        return new NumRangeRule(data['message'], data['numberRange'])
    }
)

export class LengthRangeRule extends WidgetRule {
    range: Array<lengthRange>;
    constructor(message: string, range: lengthRange | Array<lengthRange>) {
        super('lengthRange', message)
        this.range = Array.isArray(range) ? range : Array.of(range)
    }
    validate(data: any): boolean {
        return data ? this.range.some(range => (range['minLength'] === undefined || data.length >= range['minLength']) && (range['maxLength'] === undefined || data.length <= range['maxLength'])) : true
    }
}

defineRule(
    'lengthRange',
    (data) => {
        exists(data, 'lengthRange')
        return new LengthRangeRule(data['message'], data['lengthRange'])
    })

export class EnumRange extends WidgetRule {
    enumerate: Array<any>;
    constructor(message: string, enumerate: Array<any>) {
        super('range', message);
        this.enumerate = enumerate
    }
    validate(data: any): boolean {
        return data ? this.enumerate.some((property) => property === data) : true
    }
}

defineRule(
    'enumerate',
    (data) => {
        exists(data, 'enumerate')
        return new EnumRange(data['message'], data['enumerate'])
    }
)

interface Validated { valid: boolean, message: string, properties?: Record<string, Validated>, items?: Array<Validated> }

export class ScriptRule extends WidgetRule {
    private ruleType
    private script
    constructor(type: string, script: string) {
        super(type, '');
        this.ruleType = 'treeVerification'
        this.script = script
        this.type = type
    }
    async validate(data: any) {
        const validated = await data(this.script)
        return validated
    }
}

defineRule(
    'script',
    (data) => {
        if (!exists(data, 'script')) {
            throw new Error(`validate type custom lack of -> script`)
        }
        return new ScriptRule(data['type'], data['script'])
    }
)