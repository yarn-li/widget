import {ElLoading} from 'element-plus';
import { internation } from '../ext/internationalization';


interface LoadingOptions {
    global?: boolean;
    fullscreen?: boolean;
    target?: string;
    text?: string;
    background?: string;
}


class BaseLoadingService {
    private loadingInstance
    background = 'rgba(255, 255, 255, 0.7)'
    loadingText = internation.translate("widget.loading", '加载中...')

    /**
     * 显示 Loading
     * @param {Object} options - Loading 配置选项
     * @param {boolean} options.global - 是否全局遮罩
     * @param {string} options.target - Loading 显示的目标元素的选择器
     * @param {string} options.text - Loading 提示信息
     * @param {string} options.background - 遮罩层或目标元素的背景色
     */
    showLoading(options): void {
        const {global, target, text, background} = options
        // 创建 Loading 实例
        this.loadingInstance = ElLoading.service({
            fullscreen: global,
            target: target,
            text: text || this.loadingText,
            background: background || this.background
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

 const loadingInstance = new BaseLoadingService()

export {
    loadingInstance
}
export class LoadingService {
    private options: LoadingOptions
    private loadingInstance = loadingInstance

    constructor(options) {
        this.options = options
    }

    showLoading() {
        this.loadingInstance.showLoading(this.options)
    }

    closeLoading() {
        this.loadingInstance.closeLoading()
    }
}