import { operationCd, operationTimeout } from '@/content/constant.js'

function copy (obj) {
    return JSON.parse(JSON.stringify(obj))
}

function getElementByXpath (xpath) {
    return document.evaluate(xpath, document).iterateNext()
}

function toInt (text) {
    return parseInt(text.replace(/,/g, ''))
}

function wait (fn, next, fallback, timeout) {
    const cd = 10
    const res = fn()
    if (res) {
        next(res)
    } else if (timeout > 0) {
        setTimeout(() => {
            wait(fn, next, fallback, timeout - cd)
        }, cd)
    } else {
        fallback()
    }
}

function waitAfter (fn, next, fallback, timeout = operationTimeout, after = operationCd) {
    wait(fn, (res) => {
        setTimeout(() => {
            next(res)
        }, after)
    }, fallback, timeout)
}

function calcOperationNumber (data) {
    let res = 0
    data.forEach((value) => {
        res += Math.ceil(value.count / 999)
    })
    return res
}

function average (nums, defaultValue) {
    if (!nums.length) {
        return defaultValue
    }
    let res = 0
    nums.forEach((v) => {
        res += v
    })
    return res / nums.length
}

class ETACalculator {
    constructor (data, mode) {
        this.data = copy(data)
        this.addDelay = []
        this.navigateDely = []
        this.operateDelay = []
        this.totalOperation = calcOperationNumber(data)
        this.addInitialDely = 50
        this.navigateInitialDely = 100
        this.operateInitialDely = mode === 'fast' ? 0 : 450
    }

    calcNavigate () {
        return average(this.navigateDely, this.navigateInitialDely) + average(this.addDelay, this.addInitialDely) + operationCd
    }

    calcOperate (times) {
        return times * operationCd + times * average(this.operateDelay, this.operateInitialDely) + Math.floor(times / 10) * 5 * operationCd
    }

    rectifyAdd (delay) {
        this.addDelay.push(delay - operationCd)
    }

    rectifyNavigate (delay) {
        this.navigateDely.push(delay)
    }

    rectifyOperate (times, realCost) {
        this.operateDelay.push((realCost - times * operationCd) / times)
    }

    calcAllCost () {
        let cost = 0
        this.data.forEach((v) => {
            const max = Math.floor(v.count / 999)
            if (max) {
                cost += this.calcNavigate() + this.calcOperate(max)
            }
        })
        cost += (this.calcNavigate() + this.calcOperate(1)) * this.data.length
        return cost
    }

    calcAverageOperation () {
        return this.calcAllCost() / this.totalOperation
    }

    calcLast (operationNumber) {
        return operationNumber * this.calcAverageOperation()
    }
}

function logInfo (text) {
    console.log(`[SPPE] ${text}`)
}

export {
    getElementByXpath,
    toInt,
    wait,
    waitAfter,
    calcOperationNumber,
    ETACalculator,
    logInfo
}
