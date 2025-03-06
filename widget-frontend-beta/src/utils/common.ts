/**
 *
 * @param origin 查询的原始节点
 * @param name 查询的元素id或class选择器
 */
export function findChildNode(origin: HTMLElement, name: string) {
    const nameStyle = name.startsWith('#') ? 'id' : name.startsWith('.') ? 'className' : null
    const realName = nameStyle === 'id' ? name.replace('#', '') : name.replace('.', '')
    let targetNode = null
    origin.childNodes.forEach(node => {
        if (node[nameStyle] && typeof node[nameStyle] === 'string' && node[nameStyle] !== '') {
            const list = node[nameStyle].split(' ')
            if (list.includes(realName)) {
                targetNode = node
            } else {
                let result = findChildNode(node, name)
                if (result) {
                    targetNode = result
                }
            }
        }
    })
    return targetNode
}

export function findChildrenNodes(origin: HTMLElement, name: string) {
    return null
}

export  function findLastChildNode(origin: HTMLElement, name: string) {
    return null
}