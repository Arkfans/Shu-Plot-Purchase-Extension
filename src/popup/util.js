function copy (obj) {
    return JSON.parse(JSON.stringify(obj))
}

const NumberUnit = ['', 'k', 'm', 'b', 't']

function formatNumber (number, unit = NumberUnit[0]) {
    for (let i = 1; number > 1000; i++) {
        number /= 1000
        unit = NumberUnit[i]
    }
    return +number.toFixed(2) + unit
}

function formatNumberWithCommas (number) {
    // 将数字转换为字符串并按逆序处理
    const numStr = '' + number
    const reversedNumStr = numStr.split('').reverse().join('')

    // 插入逗号
    let formattedNumStr = ''
    for (let i = 0; i < reversedNumStr.length; i++) {
        if (i % 3 === 0 && i !== 0) {
            formattedNumStr += ','
        }
        formattedNumStr += reversedNumStr[i]
    }

    // 将结果再次逆转以得到最终格式
    return formattedNumStr.split('').reverse().join('')
}

function findGCDOfArray (numbers) {
    // 辗转相除法
    let gcd = numbers[0]
    for (let i = 1; i < numbers.length; i++) {
        gcd = findGCD(gcd, numbers[i])
    }
    return gcd
}

function findGCD (a, b) {
    // 辗转相除法
    while (b !== 0) {
        const temp = b
        b = a % b
        a = temp
    }
    return a
}

function calcOperationNumber (data) {
    let res = 0
    data.forEach((value) => {
        res += Math.ceil(value.count / 999)
    })
    return res
}
function formatTime (seconds) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    // 添加前导零
    const formattedMinutes = (minutes < 10) ? '0' + minutes : minutes
    const formattedSeconds = (remainingSeconds < 10) ? '0' + remainingSeconds : remainingSeconds

    return formattedMinutes + ':' + formattedSeconds
}

export {
    formatNumber,
    formatNumberWithCommas,
    copy,
    findGCDOfArray,
    calcOperationNumber,
    formatTime
}
