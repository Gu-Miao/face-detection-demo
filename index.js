const SSD_MOBILENETV1 = 'ssd_mobilenetv1'
const TINY_FACE_DETECTOR = 'tiny_face_detector'
const ENLARGE_MULTIPLE = 1.2

let selectedFaceDetector = TINY_FACE_DETECTOR
let isInitSuccess = false
let hideCanvas
let ctx
let ul

function getCurrentFaceDetectionNet() {
  if (selectedFaceDetector === SSD_MOBILENETV1) {
    return faceapi.nets.ssdMobilenetv1
  }
  if (selectedFaceDetector === TINY_FACE_DETECTOR) {
    return faceapi.nets.tinyFaceDetector
  }
}

function isFaceDetectionModelLoaded() {
  return !!getCurrentFaceDetectionNet().params
}

function inRange(number, min, max) {
  return Math.max(min, Math.min(number, max))
}

/**
 * @param {HTMLVideoElement} video
 * @param {HTMLCanvasElement} canvas
 */
async function run(video, canvas) {
  if (!video.currentTime || video.paused || video.ended || !isInitSuccess) {
    return setTimeout(() => run(video, canvas))
  }

  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.85 })
  const results = await faceapi.detectAllFaces(video, options)

  if (results.length) {
    const dims = faceapi.matchDimensions(canvas, video, true)

    const resizedResults = faceapi.resizeResults(results, dims)
    faceapi.draw.drawDetections(canvas, resizedResults)

    results.forEach(result => {
      console.log(JSON.parse(JSON.stringify(result)))
      const { box } = result

      const { top, right, bottom, left, width, height } = box
      const maxW = canvas.width
      const maxH = canvas.height

      const ex = Math.max(left - (ENLARGE_MULTIPLE - 1) * 0.5 * width, 0)
      const ey = Math.max(top - (ENLARGE_MULTIPLE - 1) * 0.5 * height, 0)
      const ew = Math.min(right * ENLARGE_MULTIPLE, maxW) - ex
      const eh = Math.min(bottom * ENLARGE_MULTIPLE, maxH) - ey

      hideCanvas.width = ew
      hideCanvas.height = eh

      ctx.drawImage(video, ex, ey, ew, eh, 0, 0, ew, eh)
      const base64 = hideCanvas.toDataURL('image/jpeg')
      const image = new Image()
      image.src = base64
      ul.append(image)
    })
  } else {
    canvas.width = canvas.width
  }

  // if (!results.length) {
  //   setTimeout(() => run(video, canvas))
  // }

  setTimeout(() => run(video, canvas))
}

async function initFaceApi() {
  if (!isFaceDetectionModelLoaded()) {
    await getCurrentFaceDetectionNet().load('/weights')
  }
  await faceapi.loadFaceLandmarkModel('/weights')

  isInitSuccess = true
}

/**
 * @param {HTMLVideoElement} video
 * @param {HTMLCanvasElement} canvas
 */
function initCanvasSize(video, canvas) {
  if (video.readyState > 0) {
    onVideoLoaded(video, canvas)
  } else {
    video.addEventListener('loadedmetadata', function () {
      onVideoLoaded(video, canvas)
    })
  }
}

/**
 * @param {HTMLVideoElement} video
 * @param {HTMLCanvasElement} canvas
 */
function onVideoLoaded(video, canvas) {
  canvas.width = video.width
  canvas.height = video.videoHeight
  canvas.style.opacity = '1'
}

window.addEventListener('DOMContentLoaded', async () => {
  const video = document.querySelector('video')
  const canvas = document.querySelector('#canvas')
  hideCanvas = document.querySelector('#hide')
  ctx = hideCanvas.getContext('2d')
  ul = document.querySelector('ul')

  initFaceApi()
  initCanvasSize(video, canvas)

  run(video, canvas)
})
