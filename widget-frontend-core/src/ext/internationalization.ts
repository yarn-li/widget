

export interface Translate  {(value: string, defaultValue?: string):  string;}


const defaultTranslate: Translate = (value: string, defaultValue?: string) => {
    if (!defaultValue) {
        return value
    }
    return defaultValue 
}

export interface Internation {
    translate: Translate
}

export const internation: Internation = {translate: defaultTranslate}
