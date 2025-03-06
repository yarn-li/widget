import {
    BasicComponent,
    ContainerComponent,
    defineBuiltin,
    DynamicContainerComponent,
    WidgetAccessor,
    WidgetComponent,
    mbus,
    clone,
    exists,
    uuid, internation
} from "@widget-frontend/widget-frontend-core"
import {LoadingService} from "./loading.ts";
const loading = new LoadingService({global: false, target: `.widget-view`,background: 'rgba(255, 255, 255, 0.7)', text: internation.translate('widget.loading', '正在加载导出内容...'), mask: true})

/**
 *
 * @param origin 查询的原始节点
 * @param name 查询的元素id或class选择器
 */
function findChildNode(origin: HTMLElement, name: string) {
    const nameStyle = name.startsWith('#') ? 'id' : name.startsWith('.') ? 'className' : null
    const realName = nameStyle === 'id' ? name.replace('#', '') : name.replace('.', '')
    let targetNode = null
    origin.childNodes.forEach((node: HTMLElement) => {
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

export function printPage(com: WidgetComponent, navigator: string) {
    const dialogOpenapi: any = com.getVueViewDriver().OpenApiManager.getSchema()
    const id = uuid()
    loading.showLoading()
    mbus.emit('pushLayer', {type: 'x-dialog-print', name: 'printDialog', id, data: dialogOpenapi})
    const printMain = document.getElementsByClassName('x-dialog-print')
    setTimeout(() => {
        const main = findChildNode(printMain[0] as HTMLElement, '.dialog-container-main')
        var printData = main.innerHTML;
        const Iframe = document.createElement('iframe')as HTMLIFrameElement
        Iframe.src = window.location.href
        Iframe.id = 'printIframe'
        Iframe.style.height = "100px"
        Iframe.style.width = "100px"
        Iframe.setAttribute("toolbar","no")
        Iframe.setAttribute("scrollbars","yes")
        Iframe.setAttribute("menubar","no")
        document.body.appendChild(Iframe)
        loading.closeLoading()
        setTimeout(() => {
            const printIframe = document.getElementById('printIframe') as HTMLIFrameElement
            printIframe.contentWindow.document.body.innerHTML = `<div class="printBox">${printData}</div>`;
            printIframe.contentWindow.print()
            document.body.removeChild(printIframe)
            mbus.emit('popLayer', id)
        }, 500)
    }, 500)
}

defineBuiltin('printPage', (com, ...args) => printPage(com, args[0]))