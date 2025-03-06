import { notEmpty, parseTime } from './comm'
// 数据格式化
export default class dataFormat {
    static format(data: any, format: { type: string, pattern: string }) {
        let newData: any = null
        if (!notEmpty(format)) return data
        const { type, pattern } = format
        if (data && notEmpty(pattern)) {
            if (type === 'number') {
                newData = formatNumber(data, pattern)
            } else if (type === 'cn-number') {
                newData = capitalAmount(formatNumber(data, pattern))
            } else if (type === 'time') {
                newData = parseTime(data, pattern)
            } else if (type === 'duration') {
                newData = durationFormat(data, pattern)
            }
        } else {
            newData = data
        }
        return newData
    }
}

const numSymbolList = ['#', "0", ",", ".", "%"]
// 数字格式化
function formatNumber(data: number, pattern: string) {
    if (!pattern || pattern === '') return data
    let flotData: string = String(data)
    let percent: string = ''
    let isSeparate: boolean = false
    const chatList = pattern.split('')
    const chatArrList = []
    let startIndex = null
    chatList.forEach((chat: string, index) => {
        if (numSymbolList.includes(chat)) {
            if (startIndex === null) {
                startIndex = index
                chatArrList.push(Array.of(chat))
            } else {
                const symbols = chatArrList[startIndex].concat(Array.of(chat))
                chatArrList.splice(startIndex, 1, symbols)
            }
        } else {
            chatArrList.push(Array.of(chat))
        }
    })

    let rule = chatArrList[startIndex].join('')

    if (rule.startsWith(',')) {
        rule = rule.replace(',', '')
        isSeparate = true
    }
    if (rule.endsWith('%')) {
        rule = rule.replace('%', '')
        percent = '%'
        flotData = String(data * 100)
    }
    if (rule.includes('.') === false) {
        rule += '.'
    }

    const maximumSDs = rule.split('.').shift()
    const precision = rule.split('.').pop()

    if (precision.includes('#')) {
        const num = Math.pow(10, precision.length)
        flotData = String(parseFloat(flotData) * num / num)
    } else {
        flotData = parseFloat(flotData).toFixed(precision.length)
    }

    if (maximumSDs.includes('0')) {
        const digit = precision.length === 0 ? maximumSDs.length : maximumSDs.length + precision.length + 1
        flotData = flotData.padStart(digit, '0')
    }

    if (isSeparate) {
        flotData = flotData.split('')
            .reverse()
            .reduce((prev, next, index) => {
                if (index > precision.length + 1) { return ((index - (precision.length + 1)) % maximumSDs.length ? next : next + ',') + prev }
                return next + prev
            })
    }
    chatArrList.splice(startIndex, 1, Array.of(flotData))
    return chatArrList.flatMap(arr => arr).join('') + percent
}
// 阿拉伯数字转中文大写数字
function capitalAmount(amount) {
    // 汉字的数字
    const cnNums = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
    // 基本单位
    const cnIntRadice = ['', '拾', '佰', '仟']
    // 对应整数部分扩展单位
    const cnIntUnits = ['', '万', '亿', '兆']
    // 对应小数部分单位
    const cnDecUnits = ['角', '分', '毫', '厘']
    // 整数金额时后面跟的字符
    const cnInteger = '整'
    // 整型完以后的单位
    const cnIntLast = '元'
    // 最大处理的数字
    const maxNum = 9999999999999999.99
    // 金额整数部分
    let integerNum
    // 金额小数部分
    let decimalNum
    // 输出的中文金额字符串
    let chineseStr = ''
    // 分离金额后用的数组，预定义
    let parts
    if (amount === '') { return '' }
    amount = parseFloat(amount)
    if (amount >= maxNum) {
        // 超出最大处理数字
        return ''
    }
    if (amount === 0) {
        chineseStr = cnNums[0] + cnIntLast + cnInteger
        return chineseStr
    }
    // 转换为字符串
    amount = amount.toString()
    if (amount.indexOf('.') === -1) {
        integerNum = amount
        decimalNum = ''
    } else {
        parts = amount.split('.')
        integerNum = parts[0]
        decimalNum = parts[1].substr(0, 4)
    }
    // 获取整型部分转换
    if (parseInt(integerNum, 10) > 0) {
        let zeroCount = 0
        const IntLen = integerNum.length
        for (let i = 0; i < IntLen; i++) {
            const n = integerNum.substr(i, 1)
            const p = IntLen - i - 1
            const q = p / 4
            const m = p % 4
            if (n === '0') {
                zeroCount++
            } else {
                if (zeroCount > 0) {
                    chineseStr += cnNums[0]
                }
                // 归零
                zeroCount = 0
                chineseStr += cnNums[parseInt(n, 10)] + cnIntRadice[m]
            }
            if (m === 0 && zeroCount < 4) {
                chineseStr += cnIntUnits[q]
            }
        }
        chineseStr += cnIntLast
    }
    // 小数部分
    if (decimalNum !== '') {
        const decLen = decimalNum.length
        for (let i = 0; i < decLen; i++) {
            const n = decimalNum.substr(i, 1)
            if (n !== '0') {
                chineseStr += cnNums[Number(n)] + cnDecUnits[i]
            }
        }
    }
    if (chineseStr === '') {
        chineseStr += cnNums[0] + cnIntLast + cnInteger
    } else if (decimalNum === '') {
        chineseStr += cnInteger
    }
    return chineseStr
}
// 时长转换
function durationFormat(duration, format) {
    const fns = [
        {
            'name': 'day',
            'fn': (t) => {
                const unit = 86400;
                return { 'num': Math.floor(t / unit).toString(), 'remain': t % unit };
            },
            'match': (fmt) => { return /DD/.test(fmt) || /D/.test(fmt) },
            'reWrite': (fmt: string, dateStr: string) => {
                if (/DD/.test(fmt)) {
                    return fmt.replace(/DD/, dateStr)
                } else if (/D/.test(fmt)) {
                    return fmt.replace(/D/, dateStr)
                }
            }
        },
        {
            'name': 'hour',
            'fn': (t) => {
                const unit = 3600;
                return { 'num': Math.floor(t / unit).toString(), 'remain': t % unit };
            },
            'match': (fmt) => { return /HH/.test(fmt) || /H/.test(fmt) || /hh/.test(fmt) || /h/.test(fmt) },
            'reWrite': (fmt: string, dateStr: string) => {
                if (/HH/.test(fmt)) {
                    return fmt.replace(/HH/, dateStr)
                } else if (/H/.test(fmt)) {
                    return fmt.replace(/H/, dateStr)
                } else if (/hh/.test(fmt)) {
                    return fmt.replace(/hh/, dateStr)
                } else if (/h/.test(fmt)) {
                    return fmt.replace(/h/, dateStr)
                }
            }
        },
        {
            'name': 'minute',
            'fn': (t) => {
                const unit = 60;
                return { 'num': Math.floor(t / unit).toString(), 'remain': t % unit };
            },
            'match': (fmt) => { return /mm/.test(fmt) || /m/.test(fmt) },
            'reWrite': (fmt: string, dateStr: string) => {
                if (/mm/.test(fmt)) {
                    return fmt.replace(/mm/, dateStr)
                } else if (/m/.test(fmt)) {
                    return fmt.replace(/m/, dateStr)
                }
            }
        },
        {
            'name': 'second',
            'fn': (t) => {
                return { 'num': t.toString(), 'remain': 0 }
            },
            'match': (fmt) => { return  /ss/.test(fmt) || /s/.test(fmt) },
            'reWrite': (fmt: string, dateStr: string) => {
                if (/ss/.test(fmt)) {
                    return fmt.replace(/ss/, dateStr)
                } else if (/s/.test(fmt)) {
                   return fmt.replace(/s/, dateStr)
                }
            }
        }
    ]

    let tmp_duration = duration;
    fns.forEach((fn) => {
        if (fn.match(format)) {
            const t = fn.fn(tmp_duration);
            tmp_duration = t.remain;
            format =  fn.reWrite(format, t.num)
        }
    })

    return format

}