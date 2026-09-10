import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { 
  getFirestore, doc, setDoc, collection, onSnapshot, query, orderBy, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { 
  getAuth, GoogleAuthProvider, signInWithPopup 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

// 1. CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyCdHmdrgtLIdnCQ7w4BRyWncS7_nFcxdtA",
  authDomain: "editor-drop.firebaseapp.com",
  projectId: "editor-drop",
  storageBucket: "editor-drop.firebasestorage.app",
  messagingSenderId: "627419081969",
  appId: "1:627419081969:web:7d3ba2a53db5bcdcc90d50"
};

const CLOUDINARY_CLOUD_NAME = "ykfzqvzs";
const CLOUDINARY_PRESET = "photo_drop";
const ADMIN_EMAIL = "undercoverhaein@gmail.com";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let deadlineDate = null;
let timerInterval = null;

// Audio Unlock Gate & Blur Dismissal
const entryGate = document.getElementById("entryGate");
const enterSiteBtn = document.getElementById("enterSiteBtn");
const instructionVideo = document.getElementById("instructionVideo");

enterSiteBtn.addEventListener("click", () => {
  entryGate.style.opacity = "0";
  setTimeout(() => entryGate.classList.add("hidden"), 400);

  // Unlocks mobile media stream context
  instructionVideo.play().then(() => {
    instructionVideo.pause();
    instructionVideo.currentTime = 0;
  }).catch(() => {});
});

// Toast Engine
function showToast(message) {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "glass-toast";
  toast.innerHTML = `<span>⚡</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    toast.style.transition = "all 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// 2. REALTIME FIRESTORE OBSERVERS
onSnapshot(doc(db, "config", "settings"), (snap) => {
  if (snap.exists()) {
    const data = snap.data();

    // Timer Sync
    if (data.deadline) {
      deadlineDate = new Date(data.deadline);
      startDigitalCountdown();
    }

    // Previews Sync
    if (data.preview1 || data.preview2) {
      document.getElementById("previewSection").style.display = "block";
      if (data.preview1) document.getElementById("ref1").src = data.preview1;
      if (data.preview2) document.getElementById("ref2").src = data.preview2;
    }

    // Video Sync
    if (data.videoUrl) {
      document.getElementById("videoSection").style.display = "block";
      document.getElementById("videoSource").src = data.videoUrl;
      instructionVideo.load();
      setupScrollAutoplay();
    }
  }
});

// Realtime Roster Feed
onSnapshot(query(collection(db, "submissions"), orderBy("time", "asc")), (snap) => {
  const list = document.getElementById("rosterList");
  document.getElementById("rosterCounter").textContent = `${snap.size} Submissions`;
  list.innerHTML = "";

  snap.forEach((docSnap) => {
    const d = docSnap.data();
    const isLate = d.isDelayed ? "delayed" : "on-time";
    const tagText = d.isDelayed ? "⚠ DELAYED" : "✔ ON TIME";

    const item = document.createElement("div");
    item.className = "roster-card";
    item.innerHTML = `
      <div class="roster-info">
        <strong>${escapeHtml(d.firstName)} ${escapeHtml(d.lastName)}</strong>
        <span>${escapeHtml(d.role)}</span>
      </div>
      <span class="badge-tag ${isLate}">${tagText}</span>
    `;
    list.appendChild(item);
  });
});

// 3. SQUID GAME DIGITAL CLOCK ENGINE
function startDigitalCountdown() {
  if (timerInterval) clearInterval(timerInterval);

  function tick() {
    if (!deadlineDate) return;
    const diff = deadlineDate.getTime() - new Date().getTime();
    const absDiff = Math.abs(diff);

    const h = Math.floor(absDiff / (1000 * 60 * 60)).toString().padStart(2, "0");
    const m = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, "0");
    const s = Math.floor((absDiff % (1000 * 60)) / 1000).toString().padStart(2, "0");

    const clockEl = document.getElementById("countdown");
    const statusEl = document.getElementById("timerStatus");

    if (diff < 0) {
      clockEl.textContent = `-${h}:${m}:${s}`;
      statusEl.textContent = "OVERDUE — LATE SUBMISSIONS ARE MONITORED";
    } else {
      clockEl.textContent = `${h}:${m}:${s}`;
      statusEl.textContent = "PRODUCTION REVIEW LOCKS AT ZERO";
    }
  }

  tick();
  timerInterval = setInterval(tick, 1000);
}

// 4. AUTOPLAY VIDEO ON SCROLL (WITH SOUND)
function setupScrollAutoplay() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        instructionVideo.muted = false;
        instructionVideo.play().catch(() => {
          instructionVideo.muted = true;
          instructionVideo.play();
        });
      } else {
        instructionVideo.pause();
      }
    });
  }, { threshold: 0.55 });

  observer.observe(instructionVideo);
}

// 5. FILE UPLOAD & RE-EDIT FLOW
const myId = localStorage.getItem("assetSubmissionId") || doc(collection(db, "submissions")).id;

if (localStorage.getItem("assetSubmissionId")) {
  document.getElementById("editNotice").classList.remove("hidden");
  document.getElementById("submitBtn").textContent = "UPDATE ASSET TRANSMISSION";
}

const fileInput = document.getElementById("fileInput");
fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) {
    document.getElementById("fileNameDisplay").textContent = fileInput.files[0].name;
  }
});

document.getElementById("uploadForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const file = fileInput.files[0];
  if (!file) return;

  const submitBtn = document.getElementById("submitBtn");
  const progressContainer = document.getElementById("progressContainer");
  const progressBar = document.getElementById("progressBar");
  const progressPercent = document.getElementById("progressPercent");

  submitBtn.disabled = true;
  progressContainer.classList.remove("hidden");

  // XHR Direct Cloudinary upload
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_PRESET);

  const xhr = new XMLHttpRequest();
  xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);

  xhr.upload.onprogress = (evt) => {
    if (evt.lengthComputable) {
      const p = Math.round((evt.loaded / evt.total) * 100);
      progressBar.style.width = `${p}%`;
      progressPercent.textContent = `${p}%`;
    }
  };

  xhr.onload = async () => {
    if (xhr.status === 200) {
      const res = JSON.parse(xhr.responseText);
      const isLate = deadlineDate ? new Date() > deadlineDate : false;

      await setDoc(doc(db, "submissions", myId), {
        firstName: document.getElementById("firstName").value.trim(),
        lastName: document.getElementById("lastName").value.trim(),
        role: document.getElementById("role").value.trim(),
        imageUrl: res.secure_url,
        isDelayed: isLate,
        time: serverTimestamp()
      });

      localStorage.setItem("assetSubmissionId", myId);

      document.getElementById("formCard").classList.add("hidden");
      document.getElementById("successCard").classList.remove("hidden");
      showToast("Transmission successfully archived.");
    } else {
      showToast("Transmission failed. Verify file parameters.");
      submitBtn.disabled = false;
    }
  };

  xhr.send(fd);
});

document.getElementById("resetBtn").addEventListener("click", () => {
  document.getElementById("formCard").classList.remove("hidden");
  document.getElementById("successCard").classList.add("hidden");
  document.getElementById("submitBtn").disabled = false;
  document.getElementById("progressContainer").classList.add("hidden");
});

// 6. SECRET TRIPLE-TAP ADMIN ACCESS
let tapCount = 0;
let lastTap = 0;
const secretTrigger = document.getElementById("secretTrigger");
const adminPanel = document.getElementById("adminPanel");

secretTrigger.addEventListener("click", () => {
  const now = Date.now();
  if (now - lastTap < 500) {
    tapCount++;
  } else {
    tapCount = 1;
  }
  lastTap = now;

  if (tapCount === 3) {
    tapCount = 0;
    signInWithPopup(auth, provider).then((res) => {
      if (res.user.email === ADMIN_EMAIL) {
        adminPanel.classList.remove("hidden");
        showToast("Directorate access granted.");
      } else {
        showToast("Access Denied: Unrecognized authority.");
      }
    });
  }
});

document.getElementById("closeAdminBtn").addEventListener("click", () => adminPanel.classList.add("hidden"));
document.getElementById("adminBackdrop").addEventListener("click", () => adminPanel.classList.add("hidden"));

// 7. ADMIN CONTROLS (DIRECT MEDIA UPLOAD TO CLOUDINARY)
async function uploadToCloudinary(file, resourceType = "image") {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, {
    method: "POST",
    body: fd
  });

  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.secure_url;
}

// Save Deadline
document.getElementById("saveTimerBtn").addEventListener("click", async () => {
  const val = document.getElementById("adminTimer").value;
  if (!val) return;
  await setDoc(doc(db, "config", "settings"), { deadline: new Date(val).toISOString() }, { merge: true });
  showToast("Deadline locked and distributed.");
});

// Upload Video File
document.getElementById("uploadVideoBtn").addEventListener("click", async () => {
  const file = document.getElementById("adminVideoFile").files[0];
  if (!file) return;
  const status = document.getElementById("videoUploadStatus");
  status.textContent = "Uploading video asset...";
  try {
    const url = await uploadToCloudinary(file, "video");
    await setDoc(doc(db, "config", "settings"), { videoUrl: url }, { merge: true });
    status.textContent = "Video successfully deployed.";
    showToast("Briefing video published.");
  } catch {
    status.textContent = "Video upload failed.";
  }
});

// Upload Preview Images
document.getElementById("uploadImgBtn1").addEventListener("click", async () => {
  const file = document.getElementById("adminImgFile1").files[0];
  if (!file) return;
  const status = document.getElementById("imgUploadStatus");
  status.textContent = "Uploading Reference 1...";
  try {
    const url = await uploadToCloudinary(file, "image");
    await setDoc(doc(db, "config", "settings"), { preview1: url }, { merge: true });
    status.textContent = "Reference 1 updated.";
    showToast("Visual reference deployed.");
  } catch {
    status.textContent = "Upload failed.";
  }
});

document.getElementById("uploadImgBtn2").addEventListener("click", async () => {
  const file = document.getElementById("adminImgFile2").files[0];
  if (!file) return;
  const status = document.getElementById("imgUploadStatus");
  status.textContent = "Uploading Reference 2...";
  try {
    const url = await uploadToCloudinary(file, "image");
    await setDoc(doc(db, "config", "settings"), { preview2: url }, { merge: true });
    status.textContent = "Reference 2 updated.";
    showToast("Visual reference deployed.");
  } catch {
    status.textContent = "Upload failed.";
  }
});

// Seed Initial Contributor
document.getElementById("seedBtn").addEventListener("click", async () => {
  const first = document.getElementById("seedFirst").value.trim();
  const last = document.getElementById("seedLast").value.trim();
  const role = document.getElementById("seedRole").value.trim();
  if (!first || !last || !role) return;

  await setDoc(doc(collection(db, "submissions")), {
    firstName: first,
    lastName: last,
    role: role,
    isDelayed: false,
    time: serverTimestamp()
  });

  document.getElementById("seedFirst").value = "";
  document.getElementById("seedLast").value = "";
  document.getElementById("seedRole").value = "";
  showToast("Record appended to roster.");
});

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}
