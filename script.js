const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const statusText = document.getElementById("status");
const targetImg = document.getElementById("targetPoseImg");

let detector;
let currentPoseIndex = 0;
const totalPoses = 8;
let targetKeypoints = null;

async function loadPose(index) {
  const res = await fetch(`poses/pose${index + 1}.json`);
  const json = await res.json();
  targetKeypoints = json;
  targetImg.src = `poses/pose${index + 1}.png`;
  targetImg.style.display = "block";
}

async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: 640, height: 480 },
    audio: false
  });
  video.srcObject = stream;
  return new Promise(resolve => {
    video.onloadedmetadata = () => {
      video.play();
      resolve(video);
    };
  });
}

function getDistance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function isPoseSimilar(user, target, threshold = 50) {
  let total = 0, match = 0;
  for (let i = 0; i < user.length; i++) {
    if (user[i].score > 0.4 && target[i].score > 0.4) {
      const dist = getDistance(user[i], target[i]);
      total++;
      if (dist < threshold) match++;
    }
  }
  return total > 0 && (match / total) > 0.7;
}

async function detect() {
  const poses = await detector.estimatePoses(video);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  if (poses.length > 0) {
    const keypoints = poses[0].keypoints;
    keypoints.forEach(kp => {
      if (kp.score > 0.4) {
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();
      }
    });

    if (targetKeypoints && isPoseSimilar(keypoints, targetKeypoints)) {
      statusText.innerText = `✔️ 動作 ${currentPoseIndex + 1} 完成！`;
      setTimeout(() => {
        currentPoseIndex++;
        if (currentPoseIndex < totalPoses) {
          loadPose(currentPoseIndex);
        } else {
          statusText.innerText = "🎉 全部完成！";
          targetImg.style.display = "none";
        }
      }, 1000);
    }
  }

  requestAnimationFrame(detect);
}

startBtn.addEventListener("click", async () => {
  startBtn.style.display = "none";
  await tf.setBackend("webgl");
  await tf.ready();
  await setupCamera();

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
  );

  await loadPose(currentPoseIndex);
  detect();
});
