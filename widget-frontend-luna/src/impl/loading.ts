import {ElLoading} from 'element-plus';
import {internation} from "@widget-frontend/widget-frontend-core"


interface LoadingOptions {
    global?: boolean;
    fullscreen?: boolean;
    target?: string;
    text?: string;
    background?: string;
}


export class LoadingService {
    private options: LoadingOptions
    private loadingInstance

    constructor(options) {
        this.options = options
    }

    /**
     * 显示 Loading
     * @param {Object} options - Loading 配置选项
     * @param {boolean} options.global - 是否全局遮罩
     * @param {string} options.target - Loading 显示的目标元素的选择器
     * @param {string} options.text - Loading 提示信息
     * @param {string} options.background - 遮罩层或目标元素的背景色
     */
    showLoading(): void {
        const {global, target, text, background} = this.options
        // 创建 Loading 实例
        this.loadingInstance = ElLoading.service({
            fullscreen: global,
            target: target,
            text: text,
            background: background || 'rgba(0, 0, 0, 0.7)'
        });
    }

    /**
     * 隐藏 Loading
     */
    closeLoading(): void {
        // 关闭 Loading
        this.loadingInstance.close();
    }
}