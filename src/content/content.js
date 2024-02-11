import { operationCd, operationTimeout, xpath } from '@/content/constant.js'
import { calcOperationNumber, ETACalculator, getElementByXpath, toInt, waitAfter, logInfo } from '@/content/util.js'

const elements = {}

const StateManager = {
    running: false
}
let currETACalculator = new ETACalculator([])

let totalOperation = 0
let processedOperation = 0

for (const key in xpath) {
    if (Object.prototype.hasOwnProperty.call(xpath, key)) {
        elements[key] = getElementByXpath(xpath[key])
    }
}

function getBag () {
    const result = {}
    for (let i = 1; i < 7; i++) {
        result['crop_' + i] = toInt(elements['crop_' + i + '_bag'].innerText)
    }
    return result
}

function getPrice () {
    const result = {}
    for (let i = 1; i < 7; i++) {
        result['crop_' + i] = toInt(elements['crop_' + i + '_price'].innerText)
    }
    return result
}

function getMoney () {
    return toInt(elements.money.innerText)
}

function getCropData () {
    return {
        money: getMoney(),
        bag: getBag(),
        price: getPrice()
    }
}

function sendPurchase (data) {
    // 告知popup.js完成了某一作物的count数量操作
    chrome.runtime.sendMessage({
        action: 'purchase',
        data
    })
    processedOperation += 1
    sendData()
}

function sendComplete (result) {
    StateManager.running = false
    // 告知popup.js操作已完成
    chrome.runtime.sendMessage({
        action: 'complete',
        result
    })
    sendData()
}

function sendData () {
    chrome.runtime.sendMessage({
        action: 'sendData',
        data: getCropData()
    })
}

function updateETA () {
    chrome.runtime.sendMessage({
        action: 'updateETA',
        data: currETACalculator.calcLast(totalOperation - processedOperation) + Date.now()
    })
}

function add (count) {
    // 由于无法通过改变input value来改变数量，因此使用input右边的增加按钮
    // （还好能用不然凉了
    const add = document.querySelector('#root > div > div.ReIPYo > div.Z5TMEw > div:nth-child(8) > div.jF3uJW > div.Cmpxtx > div.WF6Nre > div > div.HSLFvA > div.gcA9J9 > svg:nth-child(3)')
    const event = new Event('click', { bubbles: true })
    for (let i = 0; i < count; i++) {
        add.dispatchEvent(event)
    }
}

function _operate (times, end, callback, fallback, data) {
    const startTime = Date.now()
    updateETA()
    checkStop()
    // 单元操作(最大数量10)
    const clean = (i) => {
        // 关闭确认窗口
        logInfo('clean ' + (end + i))
        waitAfter(() => getElementByXpath(xpath.closeNotification) ||
            getElementByXpath(xpath.closeNotification2), (el) => {
            el.click()
            waitAfter(() => !el.checkVisibility(), () => {
                if (--i) {
                    clean(i)
                } else {
                    currETACalculator.rectifyOperate(times, Date.now() - startTime)
                    logInfo('operated completely')
                    callback(true)
                }
            }, fallback, operationTimeout, 0)
        }, fallback, operationTimeout, 0)
    }
    const purchase = (i) => {
        // 执行购买/出售，哪怕窗口关闭了按钮也能点
        logInfo('purchase ' + (end + i))
        elements.buttonOperation.click()
        sendPurchase(data)
        setTimeout(() => {
            if (--i) {
                purchase(i)
            } else {
                clean(times)
            }
        }, operationCd)
    }
    setTimeout(() => {
        purchase(times)
    }, operationCd)
}

function operate (count, times, callback, fallback, data) {
    // 执行操作
    const startTime = Date.now()
    checkStop()
    waitAfter(() => elements.operation.checkVisibility(), () => {
        add(count)
        currETACalculator.rectifyAdd(Date.now() - startTime)
        logInfo(` start to operate ${count}*${times}`)
        const fn = (i) => {
            checkStop()
            if (i > 10) {
                _operate(10, i - 10, (res) => {
                    if (res) {
                        logInfo('please wait ...')
                        setTimeout(() => {
                            fn(i - 10)
                        }, operationCd * 5)
                    } else {
                        fallback()
                    }
                }, fallback, { ...data, count })
            } else {
                _operate(i, 0, callback, fallback, { ...data, count })
            }
        }
        fn(times)
    }, () => callback(false))
}

function buyCrop (cropId, count, times, callback, fallback) {
    const startTime = Date.now()
    elements.toRipened.click()
    waitAfter(() => elements.ripenedLoc.innerText !== '100', () => {
        elements[`${cropId}_buy`].click()
        currETACalculator.rectifyNavigate(Date.now() - startTime)
        operate(count, times, callback, fallback, { cropId })
    }, fallback)
}

function sellCrop (cropId, count, times, callback, fallback) {
    const startTime = Date.now()
    elements[`${cropId}_sell`].click()
    currETACalculator.rectifyNavigate(Date.now() - startTime)
    operate(count, times, callback, fallback, { cropId })
}

function manageCrop (sell, cropId, count, callback) {
    const fn = sell ? sellCrop : buyCrop
    const fallback = () => callback(false)
    const maxTimes = Math.floor(count / 999)
    if (maxTimes) {
        fn(cropId, 999, maxTimes, (res) => {
            if (res) {
                if (count - 999 * maxTimes) {
                    fn(cropId, count - 999 * maxTimes, 1, callback, fallback)
                } else {
                    callback(true)
                }
            } else {
                fallback()
            }
        }, fallback)
    } else {
        fn(cropId, count, 1, callback, fallback)
    }
}

function handleStop () {
    sendComplete(true)
}

function checkStop () {
    if (!StateManager.running) {
        handleStop()
        throw Error('[SPPE] stop operating')
    }
}

function handleOperate (data) {
    totalOperation = calcOperationNumber(data.crops)
    processedOperation = 0
    StateManager.running = true
    currETACalculator = new ETACalculator(data.crops)
    updateETA()
    logInfo(` start to ${data.operation}`)

    function fetchAndOperate () {
        checkStop()
        const { cropId, count } = data.crops.shift()
        logInfo(` ${data.operation} ${cropId} ${count}`)
        manageCrop(data.operation === 'sell', cropId, count, (res) => {
            logInfo(`${data.operation} ` + (res ? 'completely' : 'failed'))
            checkStop()
            if (data.crops.length) {
                setTimeout(() => {
                    fetchAndOperate()
                }, operationCd * 5)
            } else {
                sendComplete(res)
            }
        })
    }

    fetchAndOperate()
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'operate') {
        // 处理接收到的消息
        handleOperate(request.data)
    } else if (request.action === 'checkValid') {
        sendResponse(elements.openShop.checkVisibility() && !(getElementByXpath(xpath.changeUser) ||
            getElementByXpath(xpath.notification) || getElementByXpath(xpath.notification2)))
    } else if (request.action === 'getData') {
        if (request.force) {
            elements.openShop.click()
            const callback = () => {
                sendData()
                elements.closeShop.click()
            }
            waitAfter(() => elements.shop.checkVisibility(), callback, callback, operationTimeout, operationCd * 5)
        } else {
            sendResponse(getCropData())
        }
    } else if (request.action === 'stop') {
        StateManager.running = false
    }
})
