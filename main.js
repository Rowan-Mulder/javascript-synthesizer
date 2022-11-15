let audioCtx = new (window.AudioContext || window.webkitAudioContext)()
let oscillator
let keyboard = document.getElementById("keyboard")
let keyboardIsGenerated = false
let queuedKeyboardGeneration = null
let keyboardKeys = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
let keyHeld = false
let oscillatorProperties = {
    gain: -0.5,
    type: "sine", // sine, sawtooth, triangle, square, custom
    scaleOffset: 2,
}
let heldKey = ""
let glissandoDurationMs = 50



let inputVolume = document.getElementById("inputVolume")
let inputScaleOffset = document.getElementById("inputScaleOffset")
let selectWaveform = document.getElementById("selectWaveform")
let selectKeyAmount = document.getElementById("selectKeyAmount")

inputVolume.addEventListener("input", () => {
    let volume = inputVolume.value
    let gainConversion = ((volume / 100) - 1).toFixed(2)
    oscillatorProperties.gain = clamp(gainConversion, -1, 0)
})
inputScaleOffset.addEventListener("input", () => {
    let scaleOffset = inputScaleOffset.value
    oscillatorProperties.scaleOffset = clamp(scaleOffset, 0, 4)
})
selectWaveform.addEventListener("change", () => {
    oscillatorProperties.type = selectWaveform.value.toLowerCase()
})
selectKeyAmount.addEventListener("change", () => {
    if (!keyboardIsGenerated) {
        queuedKeyboardGeneration = Number(selectKeyAmount.value)
        return
    }

    createKeyboard(Number(selectKeyAmount.value), 10)
})



function midiKeyFrequencyCalc(midiNoteNumber, scaleOffset) {
    let fn // hz, Frequency of the Note
    let fo = 440 // hz, Stuttgart pitch (A4 pitch standard)
    let nm = midiNoteNumber + (scaleOffset * 12)
    fn = fo * (2 ** ((nm - 49) / 12))
    return fn
}

function midiNoteNumberCalc(keyName) {
    let keyScale = Number(keyName.replace(/[A-z]|#/g, "")) - 1
    let keyNote = keyboardKeys.indexOf(keyName.replace(keyScale + 1, ""))
    return (keyScale * 12) + keyNote
}

function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max)
}

function keyboardPressStart(keyName, delayMs = 0) {
    oscillator = audioCtx.createOscillator()
    let gainNode = oscillator.context.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)
    gainNode.gain.value = oscillatorProperties.gain
    oscillator.type = oscillatorProperties.type
    oscillator.frequency.setValueAtTime(midiKeyFrequencyCalc(midiNoteNumberCalc(keyName), oscillatorProperties.scaleOffset), audioCtx.currentTime) // Value in hertz
    oscillator.connect(audioCtx.destination)
    oscillator.start((delayMs / 1000))
}

function keyboardPressSlide(keyName, glissandoDurationMs) {
    oscillator.frequency.linearRampToValueAtTime(midiKeyFrequencyCalc(midiNoteNumberCalc(keyName), oscillatorProperties.scaleOffset), audioCtx.currentTime + (glissandoDurationMs / 1000))
}

function keyboardPressStop(sustainMs = 0) {
    if (oscillator)
        oscillator.stop(audioCtx.currentTime + (sustainMs / 1000))
}

function createKeyboard(keyAmount, animationTimeMs = 20) {
    keyboard.innerHTML = ""
    keyboardIsGenerated = false

    for (let i = 0; i < keyAmount; i++) {
        setTimeout(() => {
            let key = document.createElement("div")
            let scale = Math.floor(i / keyboardKeys.length) + 1
            let keyName = `${keyboardKeys[i % keyboardKeys.length]}${scale}`
            key.innerText = keyName
            key.classList.add("key")
            if (keyName.indexOf("#") !== -1) {
                key.classList.add("keySharp")
            }
            keyboard.appendChild(key)

            if (i+1 === keyAmount) {
                setTimeout(() => {
                    keyboardIsGenerated = true
                    if (queuedKeyboardGeneration) {
                        createKeyboard(queuedKeyboardGeneration)
                        queuedKeyboardGeneration = null
                    }
                }, animationTimeMs)
            }
        }, i * animationTimeMs)
    }
}

createKeyboard(37)



document.addEventListener("pointerdown", e => {
    if (!e.target.classList || !e.target.classList.contains("key")) {
        return
    }

    keyHeld = true
    if (heldKey !== e.target.innerText) {
        heldKey = e.target.innerText
        keyboardPressStart(heldKey)
    }
})

document.addEventListener("pointerup", e => {
    if (keyHeld) {
        keyHeld = false
        heldKey = ""
        keyboardPressStop(0)
    }
})

document.addEventListener("pointermove", e => {
    if (e.buttons !== 1 || !keyHeld || !e.target.classList || !e.target.classList.contains("key") || heldKey === e.target.innerText) {
        return
    }

    // let fromKey = heldKey
    heldKey = e.target.innerText
    keyboardPressSlide(heldKey, glissandoDurationMs)
})