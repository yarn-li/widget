import {
    BasicComponent,
    defineWidget,
    internation,
    WidgetAccessor,
    WidgetComponent
} from "@widget-frontend/widget-frontend-core";
import {VNodeChild} from "@vue/runtime-core";
import BaseFromItem from "../form-item/index.vue"
import TooltipBox from "../form-item/TooltipBox.vue"
import {reactive} from "vue";
import {ArrowDown} from "@element-plus/icons-vue";
import "../../style-css/componentStyle/attachment.css"
import FileTypeIcon from "./FileTypeIcon.vue";
import Imagepreview from "./Imagepreview.vue";
type file = {fileId: string | number, fileType: string, fileName: string}

const imageFile = (file: file, that: Attachment) => {
    return <div class='single' onClick={() => {that.showPreview(file.fileName)}}> <FileTypeIcon iconName={'imageFile'}></FileTypeIcon><div class='fileName'>{file.fileName}</div></div>
}

const pdfFile = (file: file, that: Attachment) => {
    return  <div class='single' onClick={() => {that.showPreview(file.fileName)}}> <FileTypeIcon iconName={'pdfFile'}></FileTypeIcon><div class='fileName'> {file.fileName}</div></div>
}

class Attachment extends BasicComponent {
    private _accessor: WidgetAccessor = null
    private initialIndex: {value: number} = reactive({value: 0})
    private showImageViewer: {value: boolean} = reactive({value: false})
    private urlList:{value: Array<string> } = reactive({value: []})
    private singleFileMapping: Map<string, Function> = new Map()

    override componentMounted() {
        super.componentMounted();
        this.singleFileMapping.set('imageFile', imageFile)
        this.singleFileMapping.set('pdfFile', pdfFile)
        this._accessor = this.getVueViewDriver().access(this)
    }

    async getUrlList() {
        let credentialIds =  [this.dumpsValueState()]
        for (let i = 0; i < credentialIds.length; i++) {
            const file = credentialIds[i]
            const isImage = this.checkType(file.fileName, ['.jpg','.jpeg','.png','.gif','.bmp','.JPG','.JPEG','.PBG','.GIF','.BMP'])
            const fileBlob = await this.executeScript(this._accessor.getOptions()['downloadScript'], {canPreview: (com) => {return com.canPreview(com.dumpsValueState())}})
            if (isImage) {
                const url = (window.URL || window.webkitURL).createObjectURL(fileBlob);
                const fileReader = new FileReader()
                fileReader.readAsDataURL(fileBlob)
                fileReader.onload = () => {
                    this.urlList.value.push(fileReader.result as string)
                };
            }
        }
    }

    canPreview(file) {
        const isImage = this.checkType(file.fileName, ['.jpg','.jpeg','.png','.gif','.bmp','.JPG','.JPEG','.PBG','.GIF','.BMP'])
        return isImage
    }
    // todo 文件类型判断有后缀和mime类型共同控制
    // https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
    checkType(fileName: string, typeList: Array<string>) {
        const type = fileName.substring(fileName.lastIndexOf("."));
        return typeList.includes(type);
    }

    async showPreview(fileName: string) {
        const isImage = this.checkType(fileName, ['.jpg','.jpeg','.png','.gif','.bmp','.JPG','.JPEG','.PBG','.GIF','.BMP'])
        await this.getUrlList()
        if(isImage) {
            this.showImageViewer.value = true
        }
    }

    closePreview() {
        this.showImageViewer.value = false
    }

    findFileType(file) {
        if(!file.fileName) return file.fileType
        const isImage = this.checkType(file.fileName, ['.jpg','.jpeg','.png','.gif','.bmp','.JPG','.JPEG','.PBG','.GIF','.BMP'])
        if (isImage) {
            return 'imageFile';
        }
        const isPdf = this.checkType(file.fileName, ['.pdf','.PDF'])
        if (isPdf) return 'pdfFile'
    }

    createAttachment() {
        const fileType = this.findFileType(this.dumpsValueState())
        if (!this.dumpsValueState().fileId) {
            return  <span style={'font-size: 14px'}>{internation.translate('widget.noAttachment', '暂无附件')}</span>
        }
        if (!this.singleFileMapping.has(fileType)) {
            return <TooltipBox content={`${internation.translate('widget.noSupported', '暂不支持')} ${this.dumpsValueState().fileType}`} key={this.uuid()}><el-text>{`${internation.translate('widget.noSupported', '暂不支持')} ${fileType}`}</el-text></TooltipBox>
        }
        return this.singleFileMapping.get(fileType)(this.dumpsValueState(), this)
    }
    downLoad(src: string) {
        let link = document.createElement('a')
        link.style.display = 'none'
        link.href = this.urlList.value[this.initialIndex.value]
        link.setAttribute('download', decodeURI(this.dumpsValueState().fileName))
        link.target = "_blank"
        document.body.appendChild(link)
        link.click()
        URL.revokeObjectURL(link.href) // 释放URL 对象
        document.body.removeChild(link)
    }

    render(): VNodeChild {
        return <BaseFromItem label={this.getVueViewDriver().access(this).getLabel()} class={'line-element'}>
            {
                this.createAttachment()
            }
            {
                this.showImageViewer.value ? <div>
                        <el-image-viewer initial-index={this.initialIndex.value} url-list={this.urlList.value} onClose={() => {this.closePreview()}}>
                        </el-image-viewer>
                        <Imagepreview onDownload={(src: string) => this.downLoad(src)}></Imagepreview>
                    </div>
                    : null
            }
        </BaseFromItem>
    }
}

defineWidget("attachment", (parent) => new Attachment(parent))